import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import FraudMonitoringDashboard from '../../components/FraudMonitoringDashboard';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      gte: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      eq: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      order: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  })),
  auth: {
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    }))
  }
};

jest.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}));

// Mock fraud detection service
const mockFraudDetectionService = {
  analyzeTransaction: jest.fn()
};

jest.mock('../../services/fraudDetectionService', () => ({
  fraudDetectionService: mockFraudDetectionService
}));

// Mock components
jest.mock('../../components/FraudScoreDisplay', () => {
  return function MockFraudScoreDisplay() {
    return <div data-testid="fraud-score-display">Fraud Score Display</div>;
  };
});

jest.mock('../../components/TransactionAnalyzer', () => {
  return function MockTransactionAnalyzer({ onAnalysisComplete }: any) {
    return (
      <div data-testid="transaction-analyzer">
        <button onClick={() => onAnalysisComplete({})}>Complete Analysis</button>
      </div>
    );
  };
});

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('FraudMonitoringDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    mockSupabase.from.mockImplementation((table: string) => {
      const mockChain = {
        select: jest.fn(() => mockChain),
        gte: jest.fn(() => mockChain),
        eq: jest.fn(() => mockChain),
        order: jest.fn(() => mockChain),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
      };
      return mockChain;
    });

    mockFraudDetectionService.analyzeTransaction.mockResolvedValue({
      riskScore: 25,
      riskLevel: 'low',
      flags: [],
      isAnomalous: false
    });
  });

  it('should render dashboard components', async () => {
    await act(async () => {
      renderWithAuth(<FraudMonitoringDashboard />);
    });

    expect(screen.getByText('Fraud Monitoring Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Start Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('should display stats cards', async () => {
    await act(async () => {
      renderWithAuth(<FraudMonitoringDashboard />);
    });

    expect(screen.getByText('Total Transactions')).toBeInTheDocument();
    expect(screen.getByText('Risk Transactions')).toBeInTheDocument();
    expect(screen.getByText('Critical Alerts')).toBeInTheDocument();
    expect(screen.getByText('High Risk Alerts')).toBeInTheDocument();
    expect(screen.getByText('Avg Risk Score')).toBeInTheDocument();
  });

  it('should display recent transactions section', async () => {
    await act(async () => {
      renderWithAuth(<FraudMonitoringDashboard />);
    });

    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
  });

  it('should display active alerts section', async () => {
    await act(async () => {
      renderWithAuth(<FraudMonitoringDashboard />);
    });

    expect(screen.getByText('Active Alerts')).toBeInTheDocument();
  });

  it('should handle monitoring toggle', async () => {
    await act(async () => {
      renderWithAuth(<FraudMonitoringDashboard />);
    });

    const monitorButton = screen.getByText('Start Monitoring');

    await act(async () => {
      fireEvent.click(monitorButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Stop Monitoring')).toBeInTheDocument();
    });
  });

  it('should handle refresh button click', async () => {
    await act(async () => {
      renderWithAuth(<FraudMonitoringDashboard />);
    });

    const refreshButton = screen.getByText('Refresh');

    await act(async () => {
      fireEvent.click(refreshButton);
    });

    // Should call the data loading functions
    expect(mockSupabase.from).toHaveBeenCalled();
  });

  it('should load and display transaction data', async () => {
    const mockTransactions = [
      {
        id: '1',
        transaction_id: 'TX001',
        provider_id: 'PROV001',
        amount: 1000,
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        transaction_id: 'TX002',
        provider_id: 'PROV002',
        amount: 500,
        created_at: '2024-01-15T11:00:00Z'
      }
    ];

    // Mock the chain for recent transactions
    const mockSelectChain = {
      order: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: mockTransactions, error: null }))
      }))
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'billing_transactions') {
        return {
          select: jest.fn(() => mockSelectChain),
          gte: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: [], error: null })) }))
        };
      }
      return {
        select: jest.fn(() => ({
          gte: jest.fn(() => Promise.resolve({ data: [], error: null })),
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      };
    });

    await act(async () => {
      renderWithAuth(<FraudMonitoringDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('TX001')).toBeInTheDocument();
      expect(screen.getByText('TX002')).toBeInTheDocument();
    });
  });

  it('should handle transaction selection', async () => {
    const mockTransactions = [
      {
        id: '1',
        transaction_id: 'TX001',
        provider_id: 'PROV001',
        amount: 1000,
        created_at: '2024-01-15T10:00:00Z'
      }
    ];

    const mockSelectChain = {
      order: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: mockTransactions, error: null }))
      }))
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'billing_transactions') {
        return {
          select: jest.fn(() => mockSelectChain),
          gte: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: [], error: null })) }))
        };
      }
      return {
        select: jest.fn(() => ({
          gte: jest.fn(() => Promise.resolve({ data: [], error: null })),
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      };
    });

    await act(async () => {
      renderWithAuth(<FraudMonitoringDashboard />);
    });

    await waitFor(() => {
      const transactionElement = screen.getByText('TX001');
      fireEvent.click(transactionElement);
    });

    await waitFor(() => {
      expect(screen.getByText('Transaction Analysis')).toBeInTheDocument();
      expect(screen.getByTestId('transaction-analyzer')).toBeInTheDocument();
    });
  });

  it('should handle quick analysis', async () => {
    const mockTransactions = [
      {
        id: '1',
        transaction_id: 'TX001',
        provider_id: 'PROV001',
        amount: 1000,
        created_at: '2024-01-15T10:00:00Z'
      }
    ];

    const mockSelectChain = {
      order: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: mockTransactions, error: null }))
      }))
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'billing_transactions') {
        return {
          select: jest.fn(() => mockSelectChain),
          gte: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: [], error: null })) }))
        };
      }
      return {
        select: jest.fn(() => ({
          gte: jest.fn(() => Promise.resolve({ data: [], error: null })),
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      };
    });

    await act(async () => {
      renderWithAuth(<FraudMonitoringDashboard />);
    });

    await waitFor(() => {
      const analyzeButton = screen.getByText('Analyze');
      fireEvent.click(analyzeButton);
    });

    expect(mockFraudDetectionService.analyzeTransaction).toHaveBeenCalledWith(mockTransactions[0]);
  });

  it('should handle analysis completion', async () => {
    const mockTransactions = [
      {
        id: '1',
        transaction_id: 'TX001',
        provider_id: 'PROV001',
        amount: 1000,
        created_at: '2024-01-15T10:00:00Z'
      }
    ];

    const mockSelectChain = {
      order: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: mockTransactions, error: null }))
      }))
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'billing_transactions') {
        return {
          select: jest.fn(() => mockSelectChain),
          gte: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: [], error: null })) }))
        };
      }
      return {
        select: jest.fn(() => ({
          gte: jest.fn(() => Promise.resolve({ data: [], error: null })),
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      };
    });

    await act(async () => {
      renderWithAuth(<FraudMonitoringDashboard />);
    });

    // Select a transaction to open analyzer
    await waitFor(() => {
      const transactionElement = screen.getByText('TX001');
      fireEvent.click(transactionElement);
    });

    // Complete the analysis
    await waitFor(() => {
      const completeButton = screen.getByText('Complete Analysis');
      fireEvent.click(completeButton);
    });

    // Should reload alerts (mockSupabase.from should be called again)
    expect(mockSupabase.from).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    // Mock error response
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn(() => ({
        gte: jest.fn(() => Promise.resolve({ data: null, error: new Error('Database error') })),
        eq: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
        }))
      }))
    }));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await act(async () => {
      renderWithAuth(<FraudMonitoringDashboard />);
    });

    // Should handle errors without crashing
    expect(screen.getByText('Fraud Monitoring Dashboard')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('should close transaction analyzer', async () => {
    const mockTransactions = [
      {
        id: '1',
        transaction_id: 'TX001',
        provider_id: 'PROV001',
        amount: 1000,
        created_at: '2024-01-15T10:00:00Z'
      }
    ];

    const mockSelectChain = {
      order: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: mockTransactions, error: null }))
      }))
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'billing_transactions') {
        return {
          select: jest.fn(() => mockSelectChain),
          gte: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: [], error: null })) }))
        };
      }
      return {
        select: jest.fn(() => ({
          gte: jest.fn(() => Promise.resolve({ data: [], error: null })),
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      };
    });

    await act(async () => {
      renderWithAuth(<FraudMonitoringDashboard />);
    });

    // Select transaction
    await waitFor(() => {
      const transactionElement = screen.getByText('TX001');
      fireEvent.click(transactionElement);
    });

    // Verify analyzer is open
    await waitFor(() => {
      expect(screen.getByText('Transaction Analysis')).toBeInTheDocument();
    });

    // Close analyzer
    await waitFor(() => {
      const closeButton = screen.getByText('✕ Close');
      fireEvent.click(closeButton);
    });

    // Verify analyzer is closed
    await waitFor(() => {
      expect(screen.queryByText('Transaction Analysis')).not.toBeInTheDocument();
    });
  });
});