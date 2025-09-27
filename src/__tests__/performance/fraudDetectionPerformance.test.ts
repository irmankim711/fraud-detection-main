import { performance } from 'perf_hooks';
import { fraudDetectionService } from '../../services/fraudDetectionService';
import { BillingTransaction } from '../../lib/supabase';

// Mock Supabase for performance testing
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              neq: jest.fn(() => Promise.resolve({ data: [], error: null }))
            })),
            neq: jest.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          gte: jest.fn(() => ({
            neq: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        })),
        gte: jest.fn(() => Promise.resolve({ data: [], error: null })),
        neq: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { id: 'test-id', transaction_id: 'test-tx', risk_score: 85 },
            error: null
          }))
        }))
      }))
    }))
  }
}));

describe('Fraud Detection Performance Tests', () => {
  const createMockTransaction = (id: string, amount: number = 1000): BillingTransaction => ({
    id,
    transaction_id: `TX${id}`,
    provider_id: 'PROV001',
    amount,
    transaction_date: '2024-01-15T10:30:00Z',
    patient_id: 'PAT001',
    procedure_code: '99213',
    diagnosis_code: 'I10',
    created_at: '2024-01-15T10:30:00Z'
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Single Transaction Analysis Performance', () => {
    it('should analyze a single transaction within acceptable time limits', async () => {
      const transaction = createMockTransaction('perf-test-1');

      const startTime = performance.now();
      const result = await fraudDetectionService.analyzeTransaction(transaction);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle complex transactions efficiently', async () => {
      const complexTransaction = createMockTransaction('complex-1', 50000);

      const startTime = performance.now();
      const result = await fraudDetectionService.analyzeTransaction(complexTransaction);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThan(0);
      expect(duration).toBeLessThan(200); // Even complex analysis should be fast
    });
  });

  describe('Batch Processing Performance', () => {
    it('should process multiple transactions efficiently', async () => {
      const transactions = Array.from({ length: 10 }, (_, i) =>
        createMockTransaction(`batch-${i}`, Math.random() * 10000)
      );

      const startTime = performance.now();
      const results = await Promise.all(
        transactions.map(tx => fraudDetectionService.analyzeTransaction(tx))
      );
      const endTime = performance.now();

      const duration = endTime - startTime;
      const avgDuration = duration / transactions.length;

      expect(results).toHaveLength(10);
      expect(avgDuration).toBeLessThan(50); // Average should be under 50ms per transaction
      expect(duration).toBeLessThan(500); // Total batch should complete in under 500ms
    });

    it('should scale linearly with batch size', async () => {
      const batchSizes = [5, 10, 20];
      const timings: number[] = [];

      for (const size of batchSizes) {
        const transactions = Array.from({ length: size }, (_, i) =>
          createMockTransaction(`scale-${size}-${i}`)
        );

        const startTime = performance.now();
        await Promise.all(
          transactions.map(tx => fraudDetectionService.analyzeTransaction(tx))
        );
        const endTime = performance.now();

        timings.push(endTime - startTime);
      }

      // Check that timing scales roughly linearly (within 2x tolerance)
      const ratio1 = timings[1] / timings[0]; // 10 vs 5
      const ratio2 = timings[2] / timings[1]; // 20 vs 10

      expect(ratio1).toBeLessThan(3); // Should not be more than 3x slower
      expect(ratio2).toBeLessThan(3);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not have memory leaks during repeated analysis', async () => {
      const transaction = createMockTransaction('memory-test');

      // Measure initial memory if available
      const initialMemory = process.memoryUsage?.() || { heapUsed: 0 };

      // Run many analyses
      for (let i = 0; i < 100; i++) {
        await fraudDetectionService.analyzeTransaction({
          ...transaction,
          id: `memory-test-${i}`
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage?.() || { heapUsed: 0 };
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle large transaction objects efficiently', async () => {
      const largeTransaction = createMockTransaction('large-test');
      // Add large raw_data to simulate real-world scenario
      (largeTransaction as any).raw_data = {
        metadata: new Array(1000).fill('large data chunk'),
        details: {
          procedureDetails: new Array(500).fill('procedure info'),
          patientHistory: new Array(200).fill('history entry')
        }
      };

      const startTime = performance.now();
      const result = await fraudDetectionService.analyzeTransaction(largeTransaction);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(300); // Should handle large objects within 300ms
    });
  });

  describe('Concurrent Processing Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 50;
      const transactions = Array.from({ length: concurrentRequests }, (_, i) =>
        createMockTransaction(`concurrent-${i}`, Math.random() * 5000)
      );

      const startTime = performance.now();
      const results = await Promise.all(
        transactions.map(tx => fraudDetectionService.analyzeTransaction(tx))
      );
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
      });

      // Should handle 50 concurrent requests in under 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should maintain performance under load', async () => {
      const highLoadCount = 100;
      const transactions = Array.from({ length: highLoadCount }, (_, i) =>
        createMockTransaction(`load-${i}`, Math.random() * 15000)
      );

      // Split into chunks to simulate realistic load
      const chunkSize = 10;
      const chunks = [];
      for (let i = 0; i < transactions.length; i += chunkSize) {
        chunks.push(transactions.slice(i, i + chunkSize));
      }

      const startTime = performance.now();

      // Process chunks sequentially but items within chunks concurrently
      for (const chunk of chunks) {
        await Promise.all(
          chunk.map(tx => fraudDetectionService.analyzeTransaction(tx))
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgDuration = duration / highLoadCount;

      expect(avgDuration).toBeLessThan(100); // Average under 100ms per transaction
      expect(duration).toBeLessThan(10000); // Total under 10 seconds
    });
  });

  describe('Database Performance', () => {
    it('should minimize database calls per analysis', async () => {
      const transaction = createMockTransaction('db-test');

      // Count database calls
      let dbCallCount = 0;
      const originalFrom = require('../../lib/supabase').supabase.from;

      require('../../lib/supabase').supabase.from = jest.fn((...args) => {
        dbCallCount++;
        return originalFrom(...args);
      });

      await fraudDetectionService.analyzeTransaction(transaction);

      // Should make reasonable number of DB calls (one per validation rule at most)
      expect(dbCallCount).toBeLessThan(10);
    });

    it('should handle database latency gracefully', async () => {
      const transaction = createMockTransaction('latency-test');

      // Mock slow database responses
      const slowDbResponse = () => new Promise(resolve => {
        setTimeout(() => resolve({ data: [], error: null }), 100); // 100ms delay
      });

      require('../../lib/supabase').supabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                neq: jest.fn(() => slowDbResponse())
              })),
              neq: jest.fn(() => slowDbResponse())
            })),
            gte: jest.fn(() => ({
              neq: jest.fn(() => slowDbResponse())
            }))
          })),
          gte: jest.fn(() => slowDbResponse()),
          neq: jest.fn(() => slowDbResponse())
        }))
      }));

      const startTime = performance.now();
      const result = await fraudDetectionService.analyzeTransaction(transaction);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      // Should still complete within reasonable time even with DB latency
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Algorithm Performance', () => {
    it('should perform rule evaluation efficiently', async () => {
      const transaction = createMockTransaction('rule-test', 25000); // Triggers multiple rules

      const startTime = performance.now();
      const result = await fraudDetectionService.analyzeTransaction(transaction);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.flags.length).toBeGreaterThan(0); // Should trigger some rules
      expect(duration).toBeLessThan(150); // Rule evaluation should be fast
    });

    it('should calculate risk scores efficiently', async () => {
      const complexScenarioTransaction = createMockTransaction('complex-score', 50000);
      complexScenarioTransaction.transaction_date = '2024-01-13T02:30:00Z'; // Weekend + unusual time
      complexScenarioTransaction.procedure_code = '90834';
      complexScenarioTransaction.diagnosis_code = 'Z00.00'; // Incompatible combination

      const startTime = performance.now();
      const result = await fraudDetectionService.analyzeTransaction(complexScenarioTransaction);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThan(50); // Should be high risk
      expect(result.flags.length).toBeGreaterThan(2); // Multiple flags
      expect(duration).toBeLessThan(200); // Complex scoring should still be fast
    });
  });

  describe('Resource Cleanup Performance', () => {
    it('should clean up resources properly', async () => {
      const transactions = Array.from({ length: 20 }, (_, i) =>
        createMockTransaction(`cleanup-${i}`)
      );

      // Track if promises are properly resolved
      const startTime = performance.now();
      const promises = transactions.map(tx =>
        fraudDetectionService.analyzeTransaction(tx)
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      // All promises should resolve quickly
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle invalid data without performance degradation', async () => {
      const invalidTransaction = {
        ...createMockTransaction('invalid-test'),
        amount: NaN,
        transaction_date: 'invalid-date',
        procedure_code: null,
        diagnosis_code: undefined
      } as any;

      const startTime = performance.now();
      const result = await fraudDetectionService.analyzeTransaction(invalidTransaction);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(100); // Should handle invalid data quickly
    });

    it('should maintain performance with missing optional fields', async () => {
      const minimalTransaction = {
        id: 'minimal-test',
        transaction_id: 'TX-MINIMAL',
        provider_id: 'PROV001',
        amount: 1000,
        transaction_date: '2024-01-15T10:30:00Z',
        created_at: '2024-01-15T10:30:00Z'
      } as BillingTransaction;

      const startTime = performance.now();
      const result = await fraudDetectionService.analyzeTransaction(minimalTransaction);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(50); // Minimal data should be very fast
    });
  });
});