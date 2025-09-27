import { fraudDetectionService } from '../../services/fraudDetectionService';
import { BillingTransaction } from '../../lib/supabase';

// Mock Supabase for security testing
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

describe('Fraud Detection Security Validation Tests', () => {
  const createMockTransaction = (overrides?: Partial<BillingTransaction>): BillingTransaction => ({
    id: 'test-tx-1',
    transaction_id: 'TX123456',
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

  describe('Input Validation and Sanitization', () => {
    it('should handle malicious SQL injection attempts in transaction ID', async () => {
      const maliciousTransaction = createMockTransaction({
        transaction_id: "'; DROP TABLE billing_transactions; --",
      });

      const result = await fraudDetectionService.analyzeTransaction(maliciousTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      // Should not crash or execute malicious SQL
    });

    it('should handle malicious SQL injection attempts in provider ID', async () => {
      const maliciousTransaction = createMockTransaction({
        provider_id: "PROV001' UNION SELECT * FROM users WHERE '1'='1",
      });

      const result = await fraudDetectionService.analyzeTransaction(maliciousTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle malicious SQL injection attempts in procedure code', async () => {
      const maliciousTransaction = createMockTransaction({
        procedure_code: "99213'; UPDATE billing_transactions SET amount = 0; --",
      });

      const result = await fraudDetectionService.analyzeTransaction(maliciousTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle XSS attempts in string fields', async () => {
      const xssTransaction = createMockTransaction({
        transaction_id: '<script>alert("XSS")</script>',
        provider_id: '<img src="x" onerror="alert(1)">',
        diagnosis_code: '"><script>document.location="http://evil.com"</script>',
      });

      const result = await fraudDetectionService.analyzeTransaction(xssTransaction);

      expect(result).toBeDefined();
      expect(result.reason).not.toContain('<script>');
      expect(result.preventativeAction).not.toContain('<script>');
    });

    it('should handle extremely large string inputs', async () => {
      const largeString = 'A'.repeat(100000); // 100KB string
      const largeStringTransaction = createMockTransaction({
        transaction_id: largeString,
        provider_id: largeString,
        procedure_code: largeString,
      });

      const result = await fraudDetectionService.analyzeTransaction(largeStringTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle null and undefined values safely', async () => {
      const nullTransaction = createMockTransaction({
        procedure_code: undefined,
        diagnosis_code: undefined,
        patient_id: undefined,
        raw_data: undefined,
      });

      const result = await fraudDetectionService.analyzeTransaction(nullTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle special characters and unicode', async () => {
      const unicodeTransaction = createMockTransaction({
        transaction_id: 'TX123456\u0000\u0001\u0002',
        provider_id: 'PROV001©®™€',
        procedure_code: '99213\u202E\u200B',
        diagnosis_code: 'Z00.00\uFEFF',
      });

      const result = await fraudDetectionService.analyzeTransaction(unicodeTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Type and Range Validation', () => {
    it('should handle negative amounts safely', async () => {
      const negativeAmountTransaction = createMockTransaction({
        amount: -50000,
      });

      const result = await fraudDetectionService.analyzeTransaction(negativeAmountTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      // Negative amounts should not trigger excessive amount check
      expect(result.flags).not.toContain('excessive_amount');
    });

    it('should handle extremely large amounts', async () => {
      const largeAmountTransaction = createMockTransaction({
        amount: Number.MAX_SAFE_INTEGER,
      });

      const result = await fraudDetectionService.analyzeTransaction(largeAmountTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.flags).toContain('excessive_amount');
    });

    it('should handle floating point precision issues', async () => {
      const precisionTransaction = createMockTransaction({
        amount: 0.1 + 0.2, // 0.30000000000000004
      });

      const result = await fraudDetectionService.analyzeTransaction(precisionTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle NaN and Infinity values', async () => {
      const invalidAmountTransaction = createMockTransaction({
        amount: NaN,
      });

      const result = await fraudDetectionService.analyzeTransaction(invalidAmountTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Date and Time Validation', () => {
    it('should handle malformed date strings', async () => {
      const malformedDateCases = [
        'not-a-date',
        '2024-13-45T25:70:80Z',
        '2024-01-01T00:00:00',
        '2024/01/01 10:30:00',
        '01-15-2024T10:30:00Z',
        '',
        null,
        undefined,
      ];

      for (const malformedDate of malformedDateCases) {
        const transaction = createMockTransaction({
          transaction_date: malformedDate as any,
        });

        const result = await fraudDetectionService.analyzeTransaction(transaction);

        expect(result).toBeDefined();
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle future dates safely', async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year in future
      const futureTransaction = createMockTransaction({
        transaction_date: futureDate.toISOString(),
      });

      const result = await fraudDetectionService.analyzeTransaction(futureTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle very old dates', async () => {
      const oldDate = new Date('1900-01-01T00:00:00Z');
      const oldTransaction = createMockTransaction({
        transaction_date: oldDate.toISOString(),
      });

      const result = await fraudDetectionService.analyzeTransaction(oldTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Database Injection Prevention', () => {
    it('should prevent SQL injection through parameterized queries', async () => {
      const maliciousTransaction = createMockTransaction({
        provider_id: "'; DELETE FROM billing_transactions WHERE id = '1'; --",
        transaction_id: "'; INSERT INTO billing_transactions (amount) VALUES (999999); --",
      });

      // Verify that Supabase methods are called with proper parameters
      await fraudDetectionService.analyzeTransaction(maliciousTransaction);

      // Check that .eq() method is called with the malicious string as a parameter
      // This ensures parameterized queries are used
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith(
        'provider_id',
        "'; DELETE FROM billing_transactions WHERE id = '1'; --"
      );
    });

    it('should handle database error responses safely', async () => {
      mockSupabaseQuery.neq.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'CONNECTION_ERROR' }
      });

      const transaction = createMockTransaction();
      const result = await fraudDetectionService.analyzeTransaction(transaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Access Control and Authorization', () => {
    it('should not expose sensitive database information in error messages', async () => {
      mockSupabaseQuery.neq.mockRejectedValue(
        new Error('FATAL: password authentication failed for user "fraud_admin"')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const transaction = createMockTransaction();
      const result = await fraudDetectionService.analyzeTransaction(transaction);

      expect(result).toBeDefined();

      // Error should be logged but not exposed in result
      expect(result.reason).not.toContain('password');
      expect(result.reason).not.toContain('fraud_admin');
      expect(result.preventativeAction).not.toContain('password');

      consoleSpy.mockRestore();
    });

    it('should not leak internal system information', async () => {
      const transaction = createMockTransaction();
      const result = await fraudDetectionService.analyzeTransaction(transaction);

      expect(result.reason).not.toContain('database');
      expect(result.reason).not.toContain('server');
      expect(result.reason).not.toContain('internal');
      expect(result.reason).not.toContain('system');
      expect(result.preventativeAction).not.toContain('database');
    });
  });

  describe('Resource Exhaustion Protection', () => {
    it('should handle memory exhaustion attempts', async () => {
      // Create transaction with very large raw_data
      const largeObject = {
        data: new Array(10000).fill('x'.repeat(1000)),
        nested: {
          level1: {
            level2: {
              level3: new Array(1000).fill('large data')
            }
          }
        }
      };

      const memoryTransaction = createMockTransaction({
        raw_data: largeObject,
      });

      const result = await fraudDetectionService.analyzeTransaction(memoryTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle excessive concurrent requests', async () => {
      const concurrentRequests = 100;
      const transactions = Array.from({ length: concurrentRequests }, (_, i) =>
        createMockTransaction({ id: `concurrent-${i}`, transaction_id: `TX${i}` })
      );

      const promises = transactions.map(tx =>
        fraudDetectionService.analyzeTransaction(tx)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Data Integrity Validation', () => {
    it('should validate transaction object integrity', async () => {
      const corruptedTransaction = {
        ...createMockTransaction(),
        __proto__: { maliciousProperty: 'malicious' },
        constructor: { name: 'MaliciousConstructor' },
      };

      const result = await fraudDetectionService.analyzeTransaction(corruptedTransaction as BillingTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle circular references in raw_data', async () => {
      const circularObject: any = { data: 'test' };
      circularObject.self = circularObject;

      const circularTransaction = createMockTransaction({
        raw_data: circularObject,
      });

      const result = await fraudDetectionService.analyzeTransaction(circularTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should validate required fields are present', async () => {
      const incompleteTransaction = {
        id: 'test-tx-1',
        // Missing required fields
      } as BillingTransaction;

      const result = await fraudDetectionService.analyzeTransaction(incompleteTransaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Output Sanitization', () => {
    it('should sanitize output strings to prevent XSS', async () => {
      const transaction = createMockTransaction({
        transaction_id: '<script>alert("XSS")</script>',
        provider_id: '<img src="x" onerror="alert(1)">',
      });

      const result = await fraudDetectionService.analyzeTransaction(transaction);

      expect(result.reason).not.toContain('<script>');
      expect(result.reason).not.toContain('<img');
      expect(result.preventativeAction).not.toContain('<script>');
      expect(result.preventativeAction).not.toContain('<img');
    });

    it('should limit output string lengths', async () => {
      const transaction = createMockTransaction({
        transaction_id: 'TX' + 'A'.repeat(10000),
      });

      const result = await fraudDetectionService.analyzeTransaction(transaction);

      expect(result.reason.length).toBeLessThan(5000);
      expect(result.preventativeAction.length).toBeLessThan(5000);
    });

    it('should not include sensitive data in outputs', async () => {
      const sensitiveTransaction = createMockTransaction({
        raw_data: {
          creditCard: '4111-1111-1111-1111',
          ssn: '123-45-6789',
          password: 'secret123',
          api_key: 'sk_test_123456789',
        },
      });

      const result = await fraudDetectionService.analyzeTransaction(sensitiveTransaction);

      expect(result.reason).not.toContain('4111-1111-1111-1111');
      expect(result.reason).not.toContain('123-45-6789');
      expect(result.reason).not.toContain('secret123');
      expect(result.reason).not.toContain('sk_test_123456789');
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose stack traces in production errors', async () => {
      mockSupabaseQuery.neq.mockRejectedValue(
        new Error('Database connection failed\n    at fraudDetectionService.js:169:36')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const transaction = createMockTransaction();
      const result = await fraudDetectionService.analyzeTransaction(transaction);

      expect(result).toBeDefined();
      expect(result.reason).not.toContain('fraudDetectionService.js');
      expect(result.reason).not.toContain('at ');

      consoleSpy.mockRestore();
    });

    it('should handle null/undefined database responses safely', async () => {
      mockSupabaseQuery.neq.mockResolvedValue(null);
      mockSupabaseQuery.gte.mockResolvedValue(undefined);

      const transaction = createMockTransaction();
      const result = await fraudDetectionService.analyzeTransaction(transaction);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });
  });
});