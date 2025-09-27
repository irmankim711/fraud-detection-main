import { fraudDetectionService } from '../../services/fraudDetectionService';
import { BillingTransaction } from '../../lib/supabase';

// Mock Supabase for performance testing
const mockSupabaseQuery = {
  select: jest.fn(),
  eq: jest.fn(),
  gte: jest.fn(),
  neq: jest.fn(),
  insert: jest.fn(),
  single: jest.fn(),
};

// Chain methods
Object.keys(mockSupabaseQuery).forEach(key => {
  if (typeof mockSupabaseQuery[key as keyof typeof mockSupabaseQuery] === 'function') {
    (mockSupabaseQuery[key as keyof typeof mockSupabaseQuery] as jest.Mock).mockReturnValue(mockSupabaseQuery);
  }
});

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockSupabaseQuery),
  },
  BillingTransaction: {},
  Anomaly: {},
  Alert: {},
}));

describe('Fraud Detection Performance Tests', () => {
  const createMockTransaction = (id: string, overrides?: Partial<BillingTransaction>): BillingTransaction => ({
    id,
    transaction_id: `TX${id}`,
    provider_id: 'PROV001',
    amount: 1000,
    transaction_date: '2024-01-15T10:30:00Z',
    patient_id: 'PAT001',
    procedure_code: '99213',
    diagnosis_code: 'Z00.00',
    created_at: '2024-01-15T10:30:00Z',
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default successful responses
    mockSupabaseQuery.neq.mockResolvedValue({ data: [], error: null });
    mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null });
    mockSupabaseQuery.single.mockResolvedValue({
      data: { id: 'created-id', transaction_id: 'TX123456', risk_score: 85 },
      error: null
    });
  });

  describe('Single Transaction Analysis Performance', () => {
    it('should analyze a single transaction within acceptable time limit', async () => {
      const transaction = createMockTransaction('1');
      const startTime = performance.now();

      const result = await fraudDetectionService.analyzeTransaction(transaction);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should analyze high-risk transaction within acceptable time limit', async () => {
      const transaction = createMockTransaction('1', {
        amount: 50000,
        procedure_code: '90834',
        diagnosis_code: 'Z00.00',
        transaction_date: '2024-01-13T02:30:00Z'
      });

      const startTime = performance.now();

      const result = await fraudDetectionService.analyzeTransaction(transaction);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.isAnomalous).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second even for complex analysis
    });

    it('should handle database query timeouts gracefully', async () => {
      // Mock slow database response
      const slowPromise = new Promise(resolve => {
        setTimeout(() => resolve({ data: [], error: null }), 2000);
      });
      mockSupabaseQuery.neq.mockReturnValue(slowPromise);

      const transaction = createMockTransaction('1');
      const startTime = performance.now();

      const result = await fraudDetectionService.analyzeTransaction(transaction);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeGreaterThan(1500); // Should wait for slow query
    });
  });

  describe('Batch Transaction Processing Performance', () => {
    it('should process multiple transactions concurrently', async () => {
      const transactionCount = 10;
      const transactions = Array.from({ length: transactionCount }, (_, i) =>
        createMockTransaction(`${i}`, { amount: 1000 + i * 100 })
      );

      const startTime = performance.now();

      const promises = transactions.map(tx =>
        fraudDetectionService.analyzeTransaction(tx)
      );
      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(transactionCount);
      expect(duration).toBeLessThan(transactionCount * 500); // Should be faster than sequential processing
    });

    it('should handle large batch processing efficiently', async () => {
      const transactionCount = 50;
      const transactions = Array.from({ length: transactionCount }, (_, i) =>
        createMockTransaction(`${i}`, { amount: 1000 + i * 50 })
      );

      const startTime = performance.now();

      const promises = transactions.map(tx =>
        fraudDetectionService.processTransaction(tx)
      );
      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(transactionCount);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should maintain performance with mixed transaction types', async () => {
      const transactions = [
        createMockTransaction('1', { amount: 100 }), // Normal
        createMockTransaction('2', { amount: 50000 }), // High amount
        createMockTransaction('3', {
          procedure_code: '90834',
          diagnosis_code: 'Z00.00'
        }), // Incompatible
        createMockTransaction('4', {
          transaction_date: '2024-01-13T02:30:00Z'
        }), // Weekend + unusual time
        createMockTransaction('5', { amount: 200 }), // Normal
      ];

      const startTime = performance.now();

      const promises = transactions.map(tx =>
        fraudDetectionService.analyzeTransaction(tx)
      );
      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should not accumulate memory leaks during repeated analysis', async () => {
      const transaction = createMockTransaction('1');
      const iterations = 100;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        await fraudDetectionService.analyzeTransaction({
          ...transaction,
          id: `tx-${i}`,
          transaction_id: `TX${i}`
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for 100 analyses)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle service instance reuse efficiently', async () => {
      const transaction = createMockTransaction('1');
      const iterations = 20;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        // Get fresh instance each time to test singleton efficiency
        const service = fraudDetectionService;
        await service.analyzeTransaction({
          ...transaction,
          id: `tx-${i}`,
          transaction_id: `TX${i}`
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Sequential processing should still be efficient
      expect(duration).toBeLessThan(iterations * 200); // 200ms per transaction max
    });
  });

  describe('Database Query Optimization', () => {
    it('should minimize database queries per transaction', async () => {
      const transaction = createMockTransaction('1');

      await fraudDetectionService.analyzeTransaction(transaction);

      // Should make minimal database calls
      expect(mockSupabaseQuery.select).toHaveBeenCalledTimes(2); // duplicate + frequency checks
    });

    it('should handle high-frequency provider check efficiently', async () => {
      // Mock provider with many transactions
      const manyTransactions = new Array(100).fill({ id: 'tx' });
      mockSupabaseQuery.gte.mockResolvedValue({
        data: manyTransactions,
        error: null
      });

      const transaction = createMockTransaction('1');
      const startTime = performance.now();

      const result = await fraudDetectionService.analyzeTransaction(transaction);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.flags).toContain('provider_frequency');
      expect(duration).toBeLessThan(500); // Should handle large result set efficiently
    });

    it('should handle duplicate transaction check efficiently', async () => {
      // Mock many duplicate transactions
      const duplicates = new Array(20).fill({ id: 'dup' });
      mockSupabaseQuery.neq.mockResolvedValue({
        data: duplicates,
        error: null
      });

      const transaction = createMockTransaction('1');
      const startTime = performance.now();

      const result = await fraudDetectionService.analyzeTransaction(transaction);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.flags).toContain('duplicate_transaction');
      expect(duration).toBeLessThan(500); // Should handle many duplicates efficiently
    });
  });

  describe('Scalability Tests', () => {
    it('should scale linearly with transaction volume', async () => {
      const smallBatchSize = 5;
      const largeBatchSize = 20;

      // Test small batch
      const smallBatch = Array.from({ length: smallBatchSize }, (_, i) =>
        createMockTransaction(`small-${i}`)
      );

      const smallBatchStart = performance.now();
      await Promise.all(smallBatch.map(tx => fraudDetectionService.analyzeTransaction(tx)));
      const smallBatchDuration = performance.now() - smallBatchStart;

      // Test large batch
      const largeBatch = Array.from({ length: largeBatchSize }, (_, i) =>
        createMockTransaction(`large-${i}`)
      );

      const largeBatchStart = performance.now();
      await Promise.all(largeBatch.map(tx => fraudDetectionService.analyzeTransaction(tx)));
      const largeBatchDuration = performance.now() - largeBatchStart;

      // Large batch should not be significantly slower per transaction
      const smallBatchPerTransaction = smallBatchDuration / smallBatchSize;
      const largeBatchPerTransaction = largeBatchDuration / largeBatchSize;

      expect(largeBatchPerTransaction).toBeLessThan(smallBatchPerTransaction * 2);
    });

    it('should handle varying transaction complexity efficiently', async () => {
      const complexTransactions = [
        // Simple transaction
        createMockTransaction('simple', { amount: 100 }),
        // Complex high-risk transaction
        createMockTransaction('complex', {
          amount: 75000,
          procedure_code: '90834',
          diagnosis_code: 'Z00.00',
          transaction_date: '2024-01-13T02:30:00Z'
        })
      ];

      // Mock complex database responses for high-risk transaction
      mockSupabaseQuery.neq.mockResolvedValue({ data: [{ id: 'dup' }], error: null });
      mockSupabaseQuery.gte.mockResolvedValue({ data: new Array(60).fill({ id: 'tx' }), error: null });

      const times: number[] = [];

      for (const tx of complexTransactions) {
        const start = performance.now();
        await fraudDetectionService.analyzeTransaction(tx);
        const duration = performance.now() - start;
        times.push(duration);
      }

      // Complex transaction should not be dramatically slower
      expect(times[1]).toBeLessThan(times[0] * 5); // At most 5x slower
    });
  });

  describe('Error Handling Performance', () => {
    it('should fail fast on database errors', async () => {
      mockSupabaseQuery.neq.mockRejectedValue(new Error('Database error'));

      const transaction = createMockTransaction('1');
      const startTime = performance.now();

      const result = await fraudDetectionService.analyzeTransaction(transaction);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(100); // Should fail quickly
    });

    it('should handle partial database failures efficiently', async () => {
      // First query fails, second succeeds
      mockSupabaseQuery.neq.mockRejectedValue(new Error('Query 1 failed'));
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null });

      const transaction = createMockTransaction('1');
      const startTime = performance.now();

      const result = await fraudDetectionService.analyzeTransaction(transaction);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(500); // Should continue processing other rules
    });
  });

  describe('Concurrent Processing Load Test', () => {
    it('should handle high concurrent load', async () => {
      const concurrentRequests = 25;
      const transactions = Array.from({ length: concurrentRequests }, (_, i) =>
        createMockTransaction(`concurrent-${i}`, {
          amount: 1000 + Math.random() * 10000,
          transaction_date: new Date(Date.now() - Math.random() * 86400000).toISOString()
        })
      );

      const startTime = performance.now();

      // Process all transactions concurrently
      const promises = transactions.map(tx =>
        fraudDetectionService.processTransaction(tx)
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(concurrentRequests);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all results are valid
      results.forEach(result => {
        expect(result.detectionResult).toBeDefined();
        expect(result.shouldBlock).toBeDefined();
      });
    });
  });
});