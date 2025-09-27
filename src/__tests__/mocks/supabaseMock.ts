// Mock Supabase client for testing
export const createMockSupabaseClient = () => ({
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
});

// Mock the Supabase client module
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => createMockSupabaseClient())
}));

// Add a test to satisfy Jest requirement
describe('Supabase Mock', () => {
  it('should create mock client', () => {
    const mockClient = createMockSupabaseClient();
    expect(mockClient).toBeDefined();
    expect(mockClient.from).toBeDefined();
    expect(mockClient.auth).toBeDefined();
  });
});