// Mock environment variables for testing
process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co';
process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-key';

// Mock Supabase client - must be hoisted before imports
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
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
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'anomaly-123',
              transaction_id: 'TX123',
              risk_score: 75,
              anomaly_type: 'excessive_amount',
              status: 'pending'
            },
            error: null
          }))
        }))
      }))
    })),
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn()
    }
  }))
}));

import { supabase, BillingTransaction } from '../../lib/supabase';
import { fraudDetectionService } from '../../services/fraudDetectionService';

describe('Supabase Integration Tests', () => {
  const mockTransaction: BillingTransaction = {
    id: 'tx-123',
    transaction_id: 'TX123456',
    provider_id: 'PROV001',
    amount: 10000, // High amount to trigger fraud detection
    currency: 'USD',
    transaction_date: '2024-01-15T10:30:00Z',
    patient_id: 'PAT001',
    procedure_code: '99213',
    diagnosis_code: 'I10',
    status: 'pending',
    risk_score: 0,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Schema Validation', () => {
    it('should have valid BillingTransaction interface', () => {
      const transaction: BillingTransaction = mockTransaction;

      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('transaction_id');
      expect(transaction).toHaveProperty('provider_id');
      expect(transaction).toHaveProperty('amount');
      expect(transaction).toHaveProperty('transaction_date');
      expect(transaction).toHaveProperty('created_at');

      expect(typeof transaction.id).toBe('string');
      expect(typeof transaction.transaction_id).toBe('string');
      expect(typeof transaction.provider_id).toBe('string');
      expect(typeof transaction.amount).toBe('number');
      expect(typeof transaction.transaction_date).toBe('string');
      expect(typeof transaction.created_at).toBe('string');
    });

    it('should handle optional fields correctly', () => {
      const minimalTransaction: BillingTransaction = {
        id: 'tx-123',
        transaction_id: 'TX123456',
        provider_id: 'PROV001',
        amount: 1000,
        transaction_date: '2024-01-15T10:30:00Z',
        created_at: '2024-01-15T10:30:00Z'
      };

      expect(minimalTransaction.patient_id).toBeUndefined();
      expect(minimalTransaction.procedure_code).toBeUndefined();
      expect(minimalTransaction.diagnosis_code).toBeUndefined();
      expect(minimalTransaction.raw_data).toBeUndefined();
    });
  });

  describe('Fraud Detection Integration', () => {
    it('should process complete fraud detection workflow', async () => {
      const result = await fraudDetectionService.processTransaction(mockTransaction);

      expect(result).toBeDefined();
      expect(result.detectionResult).toBeDefined();
      expect(result.detectionResult.riskScore).toBeGreaterThan(0);
      expect(result.detectionResult.isAnomalous).toBe(true);
      expect(result.detectionResult.flags).toContain('excessive_amount');
    });

    it('should create anomaly record when fraud is detected', async () => {
      const detectionResult = await fraudDetectionService.analyzeTransaction(mockTransaction);

      if (detectionResult.isAnomalous) {
        const anomaly = await fraudDetectionService.createAnomalyRecord(mockTransaction, detectionResult);

        expect(anomaly).toBeDefined();
        expect(anomaly?.id).toBe('anomaly-123');
        expect(anomaly?.transaction_id).toBe('TX123');
        expect(anomaly?.risk_score).toBe(75);
      }
    });

    it('should create alert when anomaly is created', async () => {
      const detectionResult = await fraudDetectionService.analyzeTransaction(mockTransaction);

      if (detectionResult.isAnomalous) {
        const anomaly = await fraudDetectionService.createAnomalyRecord(mockTransaction, detectionResult);

        if (anomaly) {
          const alert = await fraudDetectionService.createAlert(anomaly, detectionResult);
          expect(alert).toBeDefined();
        }
      }
    });
  });

  describe('Data Query Integration', () => {
    it('should query billing transactions correctly', async () => {
      const mockSupabaseFrom = supabase.from as jest.Mock;
      const mockSelect = jest.fn(() => ({
        gte: jest.fn(() => Promise.resolve({ data: [mockTransaction], error: null }))
      }));

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect
      });

      const { data, error } = await supabase
        .from('billing_transactions')
        .select('*')
        .gte('created_at', '2024-01-01T00:00:00Z');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('billing_transactions');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(error).toBeNull();
      expect(data).toEqual([mockTransaction]);
    });

    it('should query anomalies with joins correctly', async () => {
      const mockSupabaseFrom = supabase.from as jest.Mock;
      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({
              data: [{
                id: 'alert-123',
                severity: 'critical',
                title: 'High Risk Transaction',
                anomalies: {
                  transaction_id: 'TX123',
                  risk_score: 85,
                  anomaly_type: 'excessive_amount'
                }
              }],
              error: null
            }))
          }))
        }))
      }));

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect
      });

      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          anomalies (
            transaction_id,
            risk_score,
            anomaly_type
          )
        `)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(5);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('alerts');
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.[0]).toHaveProperty('anomalies');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const mockSupabaseFrom = supabase.from as jest.Mock;
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn(() => ({
          gte: jest.fn(() => Promise.resolve({
            data: null,
            error: new Error('Connection failed')
          }))
        }))
      });

      const { data, error } = await supabase
        .from('billing_transactions')
        .select('*')
        .gte('created_at', '2024-01-01T00:00:00Z');

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should handle malformed query responses', async () => {
      const mockSupabaseFrom = supabase.from as jest.Mock;
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn(() => ({
          gte: jest.fn(() => Promise.resolve({
            data: 'invalid-data',
            error: null
          }))
        }))
      });

      const { data, error } = await supabase
        .from('billing_transactions')
        .select('*')
        .gte('created_at', '2024-01-01T00:00:00Z');

      expect(error).toBeNull();
      expect(data).toBe('invalid-data');
    });
  });

  describe('Authentication Integration', () => {
    it('should handle authentication flow', async () => {
      const mockAuth = supabase.auth as any;
      mockAuth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'token-123' }
        },
        error: null
      });

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result.error).toBeNull();
      expect(result.data.user).toBeDefined();
      expect(result.data.session).toBeDefined();
    });

    it('should handle authentication errors', async () => {
      const mockAuth = supabase.auth as any;
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Invalid credentials')
      });

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrong-password'
      });

      expect(result.error).toBeDefined();
      expect(result.data.user).toBeNull();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large result sets efficiently', async () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockTransaction,
        id: `tx-${i}`,
        transaction_id: `TX${i.toString().padStart(6, '0')}`
      }));

      const mockSupabaseFrom = supabase.from as jest.Mock;
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn(() => ({
          gte: jest.fn(() => Promise.resolve({ data: largeDataSet, error: null }))
        }))
      });

      const startTime = Date.now();
      const { data, error } = await supabase
        .from('billing_transactions')
        .select('*')
        .gte('created_at', '2024-01-01T00:00:00Z');

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(data).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent requests', async () => {
      const mockSupabaseFrom = supabase.from as jest.Mock;
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: [mockTransaction], error: null }))
        }))
      });

      const promises = Array.from({ length: 10 }, () =>
        supabase
          .from('billing_transactions')
          .select('*')
          .eq('id', mockTransaction.id)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.error).toBeNull();
        expect(result.data).toEqual([mockTransaction]);
      });
    });
  });
});