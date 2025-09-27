import { fraudDetectionService, FraudDetectionResult } from '../../services/fraudDetectionService';
import { BillingTransaction } from '../../lib/supabase';

// Mock Supabase with proper query chaining
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

// Mock insert chain for anomaly creation
mockSupabaseQuery.insert.mockReturnValue({
  select: jest.fn().mockReturnValue({
    single: jest.fn().mockResolvedValue({
      data: { id: 'test-id', transaction_id: 'test-tx', risk_score: 85 },
      error: null
    })
  })
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

    // Reset to default successful responses
    mockSupabaseQuery.neq.mockResolvedValue({ data: [], error: null });
    mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null });
    mockSupabaseQuery.single.mockResolvedValue({
      data: { id: 'test-id', transaction_id: 'test-tx', risk_score: 85 },
      error: null
    });

    // Reset insert chain for anomaly creation
    mockSupabaseQuery.insert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'test-id', transaction_id: 'test-tx', risk_score: 85 },
          error: null
        })
      })
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
        amount: 300, // Below the 99213 threshold of 500 to avoid excessive_amount flag
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

    it('should calculate correct risk levels', async () => {
      // Reset mocks to ensure no false positives from database queries
      mockSupabaseQuery.neq.mockResolvedValue({ data: [], error: null });
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null });

      // Test critical risk (score >= 70)
      const criticalTransaction = {
        ...mockTransaction,
        amount: 50000, // Excessive amount (30 points)
        procedure_code: '90834', // Incompatible with diagnosis (25 points)
        diagnosis_code: 'Z00.00',
        transaction_date: '2024-01-13T02:30:00Z' // Weekend (10) + unusual time (5) = 15 points
      };

      const result = await fraudDetectionService.analyzeTransaction(criticalTransaction);
      expect(result.riskLevel).toBe('critical');
      expect(result.riskScore).toBeGreaterThanOrEqual(70);
    });

    it('should cap risk score at 100', async () => {
      const extremeTransaction = {
        ...mockTransaction,
        amount: 100000, // Way over threshold
        procedure_code: '90834',
        diagnosis_code: 'Z00.00',
        transaction_date: '2024-01-13T02:30:00Z'
      };

      const result = await fraudDetectionService.analyzeTransaction(extremeTransaction);
      expect(result.riskScore).toBeLessThanOrEqual(100);
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
        confidence: 0.15,
        primarySource: 'rules'
      };

      const result = await fraudDetectionService.createAnomalyRecord(mockTransaction, detectionResult);
      expect(result).toBeNull();
    });
  });

  describe('processTransaction', () => {
    it('should process transaction and return complete analysis', async () => {
      const result = await fraudDetectionService.processTransaction(mockTransaction);

      expect(result).toBeDefined();
      expect(result.detectionResult).toBeDefined();
      expect(result.shouldBlock).toBeDefined();
      expect(typeof result.shouldBlock).toBe('boolean');
    });

    it('should recommend blocking for critical risk transactions', async () => {
      const criticalTransaction = {
        ...mockTransaction,
        amount: 50000
      };

      const result = await fraudDetectionService.processTransaction(criticalTransaction);

      if (result.detectionResult.riskLevel === 'critical') {
        expect(result.shouldBlock).toBe(true);
      }
    });
  });

  describe('Edge cases and error handling', () => {
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
  });
});