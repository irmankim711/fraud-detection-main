import { fraudDetectionService } from '../../services/fraudDetectionService';
import { BillingTransaction } from '../../lib/supabase';

// Mock Supabase for integration testing
const mockSupabaseQuery = {
  select: jest.fn(),
  eq: jest.fn(),
  gte: jest.fn(),
  neq: jest.fn(),
  insert: jest.fn(),
  single: jest.fn(),
};

// Chain methods
mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
mockSupabaseQuery.gte.mockReturnValue(mockSupabaseQuery);
mockSupabaseQuery.neq.mockReturnValue(mockSupabaseQuery);
mockSupabaseQuery.insert.mockReturnValue(mockSupabaseQuery);
mockSupabaseQuery.single.mockReturnValue(mockSupabaseQuery);

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockSupabaseQuery),
  },
  BillingTransaction: {},
  Anomaly: {},
  Alert: {},
}));

describe('Fraud Detection Integration Tests', () => {
  const baseTransaction: BillingTransaction = {
    id: 'test-tx-1',
    transaction_id: 'TX123456',
    provider_id: 'PROV001',
    amount: 1000,
    transaction_date: '2024-01-15T10:30:00Z',
    patient_id: 'PAT001',
    procedure_code: '99213',
    diagnosis_code: 'Z00.00',
    created_at: '2024-01-15T10:30:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default success responses
    mockSupabaseQuery.neq.mockResolvedValue({ data: [], error: null });
    mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null });
    mockSupabaseQuery.single.mockResolvedValue({
      data: { id: 'created-id', transaction_id: 'TX123456', risk_score: 85 },
      error: null
    });
  });

  describe('End-to-End Fraud Detection Workflow', () => {
    it('should complete full fraud detection workflow for normal transaction', async () => {
      const transaction = { ...baseTransaction, amount: 250 }; // Normal amount

      const result = await fraudDetectionService.processTransaction(transaction);

      expect(result.detectionResult).toBeDefined();
      expect(result.detectionResult.isAnomalous).toBe(false);
      expect(result.detectionResult.riskLevel).toBe('low');
      expect(result.shouldBlock).toBe(false);
      expect(result.anomaly).toBeNull();
      expect(result.alert).toBeNull();
    });

    it('should complete full fraud detection workflow for high-risk transaction', async () => {
      const transaction = {
        ...baseTransaction,
        amount: 50000, // Excessive amount
        procedure_code: '90834', // Psychotherapy
        diagnosis_code: 'Z00.00', // Incompatible diagnosis
        transaction_date: '2024-01-13T02:30:00Z' // Weekend + unusual time
      };

      const result = await fraudDetectionService.processTransaction(transaction);

      expect(result.detectionResult).toBeDefined();
      expect(result.detectionResult.isAnomalous).toBe(true);
      expect(result.detectionResult.riskLevel).toBe('critical');
      expect(result.detectionResult.flags).toEqual(
        expect.arrayContaining(['excessive_amount', 'invalid_procedure_diagnosis', 'weekend_billing', 'unusual_time'])
      );
      expect(result.shouldBlock).toBe(true);
      expect(result.anomaly).toBeDefined();
      expect(result.alert).toBeDefined();
    });

    it('should handle duplicate transaction detection', async () => {
      // Mock finding duplicate transactions
      mockSupabaseQuery.neq.mockResolvedValue({
        data: [{ id: 'duplicate-1' }, { id: 'duplicate-2' }],
        error: null
      });

      const transaction = { ...baseTransaction };

      const result = await fraudDetectionService.processTransaction(transaction);

      expect(result.detectionResult.flags).toContain('duplicate_transaction');
      expect(result.detectionResult.riskScore).toBeGreaterThan(0);
      expect(result.anomaly).toBeDefined();
      expect(result.alert).toBeDefined();
    });

    it('should handle provider frequency violations', async () => {
      // Mock high frequency provider
      mockSupabaseQuery.gte.mockResolvedValue({
        data: new Array(51).fill({ id: 'tx' }), // 51 transactions > 50 threshold
        error: null
      });

      const transaction = { ...baseTransaction };

      const result = await fraudDetectionService.processTransaction(transaction);

      expect(result.detectionResult.flags).toContain('provider_frequency');
      expect(result.detectionResult.riskScore).toBeGreaterThan(0);
      expect(result.anomaly).toBeDefined();
      expect(result.alert).toBeDefined();
    });
  });

  describe('Multiple Rule Violations', () => {
    it('should accumulate risk scores from multiple violations', async () => {
      // Mock duplicate and high frequency
      mockSupabaseQuery.neq.mockResolvedValue({
        data: [{ id: 'duplicate' }],
        error: null
      });
      mockSupabaseQuery.gte.mockResolvedValue({
        data: new Array(51).fill({ id: 'tx' }),
        error: null
      });

      const transaction = {
        ...baseTransaction,
        amount: 10000, // Excessive amount (30 points)
        procedure_code: '90834', // Incompatible (25 points)
        diagnosis_code: 'Z00.00',
        transaction_date: '2024-01-13T02:30:00Z' // Weekend + unusual time (15 points)
        // + duplicate (35 points) + frequency (20 points) = 125, capped at 100
      };

      const result = await fraudDetectionService.processTransaction(transaction);

      expect(result.detectionResult.riskScore).toBe(100); // Should be capped at 100
      expect(result.detectionResult.flags).toHaveLength(6); // All 6 rules violated
      expect(result.detectionResult.riskLevel).toBe('critical');
      expect(result.shouldBlock).toBe(true);
    });

    it('should correctly prioritize severity levels', async () => {
      const transaction = {
        ...baseTransaction,
        transaction_date: '2024-01-13T02:30:00Z' // Only weekend + unusual time (medium + low = medium)
      };

      const result = await fraudDetectionService.processTransaction(transaction);

      expect(result.detectionResult.severity).toBe('medium'); // Highest severity from violations
      expect(result.detectionResult.flags).toContain('weekend_billing');
      expect(result.detectionResult.flags).toContain('unusual_time');
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database errors during duplicate check', async () => {
      mockSupabaseQuery.neq.mockRejectedValue(new Error('Database connection failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const transaction = { ...baseTransaction };
      const result = await fraudDetectionService.processTransaction(transaction);

      expect(result.detectionResult).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in rule duplicate_transaction:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle database errors during anomaly creation', async () => {
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Insert failed')
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const transaction = {
        ...baseTransaction,
        amount: 50000 // Will trigger anomaly
      };

      const result = await fraudDetectionService.processTransaction(transaction);

      expect(result.detectionResult.isAnomalous).toBe(true);
      expect(result.anomaly).toBeNull();
      expect(result.alert).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error creating anomaly record:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle database errors during alert creation', async () => {
      // Anomaly creation succeeds
      mockSupabaseQuery.single
        .mockResolvedValueOnce({
          data: { id: 'anomaly-id', transaction_id: 'TX123456', risk_score: 85 },
          error: null
        })
        // Alert creation fails
        .mockResolvedValueOnce({
          data: null,
          error: new Error('Alert insert failed')
        });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const transaction = {
        ...baseTransaction,
        amount: 50000 // Will trigger anomaly
      };

      const result = await fraudDetectionService.processTransaction(transaction);

      expect(result.detectionResult.isAnomalous).toBe(true);
      expect(result.anomaly).toBeDefined();
      expect(result.alert).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error creating alert:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases and Data Validation', () => {
    it('should handle transactions with missing fields', async () => {
      const incompleteTransaction = {
        ...baseTransaction,
        procedure_code: undefined,
        diagnosis_code: undefined,
        patient_id: undefined
      };

      const result = await fraudDetectionService.processTransaction(incompleteTransaction);

      expect(result.detectionResult).toBeDefined();
      expect(result.detectionResult.riskScore).toBeGreaterThanOrEqual(0);
      // Should not fail procedure-diagnosis check due to missing data
      expect(result.detectionResult.flags).not.toContain('invalid_procedure_diagnosis');
    });

    it('should handle invalid date formats gracefully', async () => {
      const invalidDateTransaction = {
        ...baseTransaction,
        transaction_date: 'invalid-date-format'
      };

      const result = await fraudDetectionService.processTransaction(invalidDateTransaction);

      expect(result.detectionResult).toBeDefined();
      expect(result.detectionResult.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero and negative amounts', async () => {
      const zeroAmountTransaction = {
        ...baseTransaction,
        amount: 0
      };

      const negativeAmountTransaction = {
        ...baseTransaction,
        amount: -1000
      };

      const zeroResult = await fraudDetectionService.processTransaction(zeroAmountTransaction);
      const negativeResult = await fraudDetectionService.processTransaction(negativeAmountTransaction);

      expect(zeroResult.detectionResult).toBeDefined();
      expect(negativeResult.detectionResult).toBeDefined();

      // Zero amounts should not trigger excessive amount
      expect(zeroResult.detectionResult.flags).not.toContain('excessive_amount');
      expect(negativeResult.detectionResult.flags).not.toContain('excessive_amount');
    });

    it('should handle unknown procedure codes', async () => {
      const unknownProcedureTransaction = {
        ...baseTransaction,
        procedure_code: 'UNKNOWN123',
        amount: 6000 // Should trigger default threshold of 5000
      };

      const result = await fraudDetectionService.processTransaction(unknownProcedureTransaction);

      expect(result.detectionResult.flags).toContain('excessive_amount');
      expect(result.detectionResult.riskScore).toBeGreaterThan(0);
    });
  });

  describe('Time-based Detection Rules', () => {
    it('should correctly identify different time zones and unusual hours', async () => {
      const timeTestCases = [
        { time: '2024-01-15T05:30:00Z', shouldFlag: true, description: '5:30 AM UTC' },
        { time: '2024-01-15T08:30:00Z', shouldFlag: false, description: '8:30 AM UTC' },
        { time: '2024-01-15T21:30:00Z', shouldFlag: false, description: '9:30 PM UTC' },
        { time: '2024-01-15T23:30:00Z', shouldFlag: true, description: '11:30 PM UTC' }
      ];

      for (const testCase of timeTestCases) {
        const transaction = {
          ...baseTransaction,
          transaction_date: testCase.time
        };

        const result = await fraudDetectionService.processTransaction(transaction);

        if (testCase.shouldFlag) {
          expect(result.detectionResult.flags).toContain('unusual_time');
        } else {
          expect(result.detectionResult.flags).not.toContain('unusual_time');
        }
      }
    });

    it('should correctly identify weekend dates', async () => {
      const weekendTestCases = [
        { date: '2024-01-13T10:30:00Z', isWeekend: true, description: 'Saturday' },
        { date: '2024-01-14T10:30:00Z', isWeekend: true, description: 'Sunday' },
        { date: '2024-01-15T10:30:00Z', isWeekend: false, description: 'Monday' },
        { date: '2024-01-16T10:30:00Z', isWeekend: false, description: 'Tuesday' }
      ];

      for (const testCase of weekendTestCases) {
        const transaction = {
          ...baseTransaction,
          transaction_date: testCase.date,
          procedure_code: '99213' // Weekend-sensitive procedure
        };

        const result = await fraudDetectionService.processTransaction(transaction);

        if (testCase.isWeekend) {
          expect(result.detectionResult.flags).toContain('weekend_billing');
        } else {
          expect(result.detectionResult.flags).not.toContain('weekend_billing');
        }
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent transaction analyses', async () => {
      const transactions = Array.from({ length: 10 }, (_, i) => ({
        ...baseTransaction,
        id: `tx-${i}`,
        transaction_id: `TX${i.toString().padStart(6, '0')}`,
        amount: 1000 + i * 100
      }));

      const promises = transactions.map(tx =>
        fraudDetectionService.processTransaction(tx)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.detectionResult).toBeDefined();
        expect(result.shouldBlock).toBeDefined();
      });
    });

    it('should maintain service state across multiple calls', async () => {
      const service1 = fraudDetectionService;
      const service2 = fraudDetectionService;

      expect(service1).toBe(service2); // Singleton pattern

      const transaction = { ...baseTransaction };

      const result1 = await service1.analyzeTransaction(transaction);
      const result2 = await service2.analyzeTransaction(transaction);

      expect(result1.riskScore).toBe(result2.riskScore);
      expect(result1.flags).toEqual(result2.flags);
    });
  });
});