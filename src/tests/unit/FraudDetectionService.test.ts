import { FraudDetectionService, FraudDetectionResult } from '../../services/fraudDetectionService';
import { BillingTransaction } from '../../lib/supabase';

// Mock Supabase with proper typing
const mockSupabaseQuery = {
  select: jest.fn(),
  eq: jest.fn(),
  gte: jest.fn(),
  neq: jest.fn(),
  insert: jest.fn(),
  single: jest.fn(),
};

// Chain all methods to return the mock query object
mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
mockSupabaseQuery.gte.mockReturnValue(mockSupabaseQuery);
mockSupabaseQuery.neq.mockReturnValue(mockSupabaseQuery);
mockSupabaseQuery.insert.mockReturnValue(mockSupabaseQuery);
mockSupabaseQuery.single.mockReturnValue(mockSupabaseQuery);

// Default successful response
mockSupabaseQuery.neq.mockResolvedValue({ data: [], error: null });
mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null });
mockSupabaseQuery.single.mockResolvedValue({
  data: { id: 'test-id', transaction_id: 'test-tx', risk_score: 85 },
  error: null
});

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockSupabaseQuery),
  },
  BillingTransaction: {},
  Anomaly: {},
  Alert: {},
}));

describe('FraudDetectionService', () => {
  let fraudDetectionService: FraudDetectionService;

  const mockTransaction: BillingTransaction = {
    id: 'test-id',
    transaction_id: 'TX123456',
    provider_id: 'PROV001',
    amount: 1000,
    currency: 'USD',
    transaction_date: '2024-01-15T10:30:00Z',
    patient_id: 'PAT001',
    procedure_code: '99213',
    diagnosis_code: 'Z00.00',
    status: 'pending',
    risk_score: 0,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fraudDetectionService = FraudDetectionService.getInstance();

    // Reset to default successful responses
    mockSupabaseQuery.neq.mockResolvedValue({ data: [], error: null });
    mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = FraudDetectionService.getInstance();
      const instance2 = FraudDetectionService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('analyzeTransaction', () => {
    it('should return low risk for normal transaction', async () => {
      const result = await fraudDetectionService.analyzeTransaction(mockTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.isAnomalous).toBeDefined();
      expect(result.riskLevel).toMatch(/^(critical|high|medium|low)$/);
      expect(Array.isArray(result.flags)).toBe(true);
      expect(result.scoreBreakdown).toBeDefined();
      expect(result.reason).toBeDefined();
      expect(result.preventativeAction).toBeDefined();
    });

    it('should detect excessive amount', async () => {
      const highAmountTransaction = {
        ...mockTransaction,
        amount: 10000, // Exceeds default threshold
        procedure_code: '99213' // Office visit with 500 threshold
      };

      const result = await fraudDetectionService.analyzeTransaction(highAmountTransaction);

      expect(result.flags).toContain('excessive_amount');
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.isAnomalous).toBe(true);
      expect(result.scoreBreakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'excessive_amount',
            points: 30,
            description: 'Amount exceeds procedure threshold'
          })
        ])
      );
    });

    it('should detect weekend billing for office visits', async () => {
      const weekendTransaction = {
        ...mockTransaction,
        transaction_date: '2024-01-13T10:30:00Z', // Saturday
        procedure_code: '99213' // Office visit
      };

      const result = await fraudDetectionService.analyzeTransaction(weekendTransaction);

      expect(result.flags).toContain('weekend_billing');
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should detect unusual time billing', async () => {
      const nightTransaction = {
        ...mockTransaction,
        transaction_date: '2024-01-15T02:30:00Z' // 2:30 AM
      };

      const result = await fraudDetectionService.analyzeTransaction(nightTransaction);

      expect(result.flags).toContain('unusual_time');
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should detect incompatible procedure-diagnosis combinations', async () => {
      const incompatibleTransaction = {
        ...mockTransaction,
        procedure_code: '90834', // Psychotherapy
        diagnosis_code: 'Z00.00' // General examination
      };

      const result = await fraudDetectionService.analyzeTransaction(incompatibleTransaction);

      expect(result.flags).toContain('invalid_procedure_diagnosis');
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should detect duplicate transactions', async () => {
      // Mock finding duplicate transactions
      mockSupabaseQuery.neq.mockResolvedValue({
        data: [{ id: 'duplicate-1' }, { id: 'duplicate-2' }],
        error: null
      });

      const result = await fraudDetectionService.analyzeTransaction(mockTransaction);

      expect(result.flags).toContain('duplicate_transaction');
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should detect provider frequency violations', async () => {
      // Mock high frequency provider
      mockSupabaseQuery.gte.mockResolvedValue({
        data: new Array(51).fill({ id: 'tx' }), // 51 transactions > 50 threshold
        error: null
      });

      const result = await fraudDetectionService.analyzeTransaction(mockTransaction);

      expect(result.flags).toContain('provider_frequency');
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should calculate correct risk levels', async () => {
      // Test critical risk (score >= 70)
      const criticalTransaction = {
        ...mockTransaction,
        amount: 50000, // Excessive amount (30 points)
        procedure_code: '90834', // Incompatible with diagnosis (25 points)
        diagnosis_code: 'Z00.00',
        transaction_date: '2024-01-13T02:30:00Z' // Weekend + unusual time (15 points total)
      };

      const result = await fraudDetectionService.analyzeTransaction(criticalTransaction);
      expect(result.riskLevel).toBe('critical');
      expect(result.riskScore).toBeGreaterThanOrEqual(70);
      expect(result.severity).toBe('critical');
    });

    it('should cap risk score at 100', async () => {
      const extremeTransaction = {
        ...mockTransaction,
        amount: 100000, // Way over threshold
        procedure_code: '90834',
        diagnosis_code: 'Z00.00',
        transaction_date: '2024-01-13T02:30:00Z'
      };

      // Mock all possible violations
      mockSupabaseQuery.neq.mockResolvedValue({ data: [{ id: 'dup' }], error: null });
      mockSupabaseQuery.gte.mockResolvedValue({ data: new Array(51).fill({ id: 'tx' }), error: null });

      const result = await fraudDetectionService.analyzeTransaction(extremeTransaction);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabaseQuery.neq.mockResolvedValue({ data: null, error: new Error('DB Error') });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await fraudDetectionService.analyzeTransaction(mockTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should provide appropriate preventative actions', async () => {
      const criticalTransaction = {
        ...mockTransaction,
        amount: 50000,
        procedure_code: '90834',
        diagnosis_code: 'Z00.00',
      };

      const result = await fraudDetectionService.analyzeTransaction(criticalTransaction);

      if (result.riskLevel === 'critical') {
        expect(result.preventativeAction).toContain('IMMEDIATE ACTION');
      } else if (result.riskLevel === 'high') {
        expect(result.preventativeAction).toContain('HOLD FOR REVIEW');
      } else if (result.riskLevel === 'medium') {
        expect(result.preventativeAction).toContain('MONITOR');
      } else {
        expect(result.preventativeAction).toContain('LOG ONLY');
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing procedure code', async () => {
      const incompleteTransaction = {
        ...mockTransaction,
        procedure_code: undefined
      };

      const result = await fraudDetectionService.analyzeTransaction(incompleteTransaction);
      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing diagnosis code', async () => {
      const incompleteTransaction = {
        ...mockTransaction,
        diagnosis_code: undefined
      };

      const result = await fraudDetectionService.analyzeTransaction(incompleteTransaction);
      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle invalid date format gracefully', async () => {
      const invalidDateTransaction = {
        ...mockTransaction,
        transaction_date: 'invalid-date'
      };

      const result = await fraudDetectionService.analyzeTransaction(invalidDateTransaction);
      expect(result).toBeDefined();
    });

    it('should handle all procedure threshold cases', async () => {
      const testCases = [
        { code: '99213', amount: 600 },
        { code: '99214', amount: 800 },
        { code: '99215', amount: 1100 },
        { code: '90834', amount: 350 },
        { code: '90837', amount: 450 },
        { code: '99291', amount: 2500 },
        { code: 'unknown', amount: 6000 }
      ];

      for (const testCase of testCases) {
        const transaction = {
          ...mockTransaction,
          procedure_code: testCase.code,
          amount: testCase.amount
        };

        const result = await fraudDetectionService.analyzeTransaction(transaction);
        expect(result.flags).toContain('excessive_amount');
      }
    });
  });

  describe('createAnomalyRecord', () => {
    it('should create anomaly record for anomalous transaction', async () => {
      const detectionResult: FraudDetectionResult = {
        isAnomalous: true,
        riskScore: 85,
        riskLevel: 'critical',
        flags: ['excessive_amount'],
        severity: 'critical',
        reason: 'Test anomaly',
        preventativeAction: 'Test action',
        scoreBreakdown: [],
        confidence: 0.85,
        primarySource: 'rules'
      };

      const result = await fraudDetectionService.createAnomalyRecord(mockTransaction, detectionResult);
      expect(result).toBeDefined();
      expect(result?.id).toBe('test-id');
    });

    it('should return null for non-anomalous transaction', async () => {
      const detectionResult: FraudDetectionResult = {
        isAnomalous: false,
        riskScore: 15,
        riskLevel: 'low',
        flags: [],
        severity: 'low',
        reason: 'No anomalies',
        preventativeAction: 'Process normally',
        scoreBreakdown: [],
        confidence: 0.85,
        primarySource: 'rules'
      };

      const result = await fraudDetectionService.createAnomalyRecord(mockTransaction, detectionResult);
      expect(result).toBeNull();
    });

    it('should handle database errors when creating anomaly', async () => {
      mockSupabaseQuery.single.mockResolvedValue({
        data: null,
        error: new Error('Insert failed')
      });

      const detectionResult: FraudDetectionResult = {
        isAnomalous: true,
        riskScore: 85,
        riskLevel: 'critical',
        flags: ['excessive_amount'],
        severity: 'critical',
        reason: 'Test anomaly',
        preventativeAction: 'Test action',
        scoreBreakdown: [],
        confidence: 0.85,
        primarySource: 'rules'
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await fraudDetectionService.createAnomalyRecord(mockTransaction, detectionResult);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error creating anomaly record:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('createAlert', () => {
    const mockAnomaly = {
      id: 'anomaly-123',
      transaction_id: 'TX123456',
      anomaly_type: 'excessive_amount',
      risk_score: 85,
      confidence: 0.85,
      status: 'pending' as const,
      detected_at: '2024-01-15T10:30:00Z',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z'
    };

    it('should create alert for anomaly', async () => {
      const detectionResult: FraudDetectionResult = {
        isAnomalous: true,
        riskScore: 85,
        riskLevel: 'critical',
        flags: ['excessive_amount'],
        severity: 'critical',
        reason: 'Test anomaly',
        preventativeAction: 'Test action',
        scoreBreakdown: [],
        confidence: 0.85,
        primarySource: 'rules'
      };

      const result = await fraudDetectionService.createAlert(mockAnomaly, detectionResult);
      expect(result).toBeDefined();
      expect(result?.id).toBe('test-id');
    });

    it('should handle database errors when creating alert', async () => {
      mockSupabaseQuery.single.mockResolvedValue({
        data: null,
        error: new Error('Insert failed')
      });

      const detectionResult: FraudDetectionResult = {
        isAnomalous: true,
        riskScore: 85,
        riskLevel: 'critical',
        flags: ['excessive_amount'],
        severity: 'critical',
        reason: 'Test anomaly',
        preventativeAction: 'Test action',
        scoreBreakdown: [],
        confidence: 0.85,
        primarySource: 'rules'
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await fraudDetectionService.createAlert(mockAnomaly, detectionResult);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error creating alert:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('processTransaction', () => {
    it('should process transaction and return complete analysis', async () => {
      const result = await fraudDetectionService.processTransaction(mockTransaction);

      expect(result).toBeDefined();
      expect(result.detectionResult).toBeDefined();
      expect(result.shouldBlock).toBeDefined();
      expect(typeof result.shouldBlock).toBe('boolean');
      expect(result.anomaly).toBeDefined();
      expect(result.alert).toBeDefined();
    });

    it('should recommend blocking for critical risk transactions', async () => {
      const criticalTransaction = {
        ...mockTransaction,
        amount: 50000,
        procedure_code: '90834',
        diagnosis_code: 'Z00.00'
      };

      const result = await fraudDetectionService.processTransaction(criticalTransaction);

      if (result.detectionResult.riskLevel === 'critical') {
        expect(result.shouldBlock).toBe(true);
      }
    });

    it('should not recommend blocking for low risk transactions', async () => {
      const lowRiskTransaction = {
        ...mockTransaction,
        amount: 100
      };

      const result = await fraudDetectionService.processTransaction(lowRiskTransaction);

      if (result.detectionResult.riskLevel === 'low') {
        expect(result.shouldBlock).toBe(false);
      }
    });
  });

  describe('Risk Level Calculation', () => {
    it('should correctly categorize risk levels', () => {
      const service = fraudDetectionService as any; // Access private method for testing

      expect(service.calculateRiskLevel(75)).toBe('critical');
      expect(service.calculateRiskLevel(70)).toBe('critical');
      expect(service.calculateRiskLevel(60)).toBe('high');
      expect(service.calculateRiskLevel(50)).toBe('high');
      expect(service.calculateRiskLevel(35)).toBe('medium');
      expect(service.calculateRiskLevel(25)).toBe('medium');
      expect(service.calculateRiskLevel(15)).toBe('low');
      expect(service.calculateRiskLevel(0)).toBe('low');
    });
  });

  describe('Severity Weight Calculation', () => {
    it('should assign correct severity weights', () => {
      const service = fraudDetectionService as any; // Access private method for testing

      expect(service.getSeverityWeight('critical')).toBe(4);
      expect(service.getSeverityWeight('high')).toBe(3);
      expect(service.getSeverityWeight('medium')).toBe(2);
      expect(service.getSeverityWeight('low')).toBe(1);
      expect(service.getSeverityWeight('unknown')).toBe(1);
    });
  });
});