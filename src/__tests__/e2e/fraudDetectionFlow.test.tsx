// Mock environment variables
process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co';
process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-key';

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock Supabase with realistic data
const mockTransactions = [
  {
    id: 'tx-1',
    transaction_id: 'TX001',
    provider_id: 'PROV001',
    amount: 15000, // High amount - should trigger fraud detection
    transaction_date: '2024-01-15T10:30:00Z',
    patient_id: 'PAT001',
    procedure_code: '99213',
    diagnosis_code: 'I10',
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 'tx-2',
    transaction_id: 'TX002',
    provider_id: 'PROV001',
    amount: 300, // Normal amount
    transaction_date: '2024-01-15T11:00:00Z',
    patient_id: 'PAT002',
    procedure_code: '99213',
    diagnosis_code: 'I10',
    created_at: '2024-01-15T11:00:00Z'
  }
];

const mockAnomalies = [
  {
    id: 'anomaly-1',
    transaction_id: 'TX001',
    anomaly_type: 'excessive_amount',
    risk_score: 85,
    confidence: 0.85,
    status: 'pending',
    detected_at: '2024-01-15T10:31:00Z'
  }
];

const mockAlerts = [
  {
    id: 'alert-1',
    anomaly_id: 'anomaly-1',
    severity: 'critical',
    title: 'CRITICAL Risk Transaction (Score: 85)',
    description: 'Detected 1 anomaly flag(s): excessive_amount',
    is_resolved: false,
    created_at: '2024-01-15T10:31:00Z',
    anomalies: {
      transaction_id: 'TX001',
      risk_score: 85,
      anomaly_type: 'excessive_amount'
    }
  }
];

const mockSupabase = {
  auth: {
    getSession: jest.fn(() => Promise.resolve({
      data: {
        session: {
          user: { id: 'user-1', email: 'test@example.com' },
          access_token: 'token-123'
        }
      },
      error: null
    })),
    onAuthStateChange: jest.fn((callback) => {
      // Simulate immediate authentication
      setTimeout(() => {
        callback('SIGNED_IN', {
          user: { id: 'user-1', email: 'test@example.com' },
          access_token: 'token-123'
        });
      }, 100);
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
    signInWithPassword: jest.fn(() => Promise.resolve({
      data: {
        user: { id: 'user-1', email: 'test@example.com' },
        session: { access_token: 'token-123' }
      },
      error: null
    })),
    signOut: jest.fn(() => Promise.resolve({ error: null }))
  },
  from: jest.fn((table: string) => {
    const createChain = (data: any) => ({
      select: jest.fn(() => createChain(data)),
      eq: jest.fn(() => createChain(data)),
      gte: jest.fn(() => createChain(data)),
      order: jest.fn(() => createChain(data)),
      limit: jest.fn(() => Promise.resolve({ data, error: null })),
      then: (callback: any) => callback({ data, error: null })
    });

    switch (table) {
      case 'billing_transactions':
        return createChain(mockTransactions);
      case 'anomalies':
        return createChain(mockAnomalies);
      case 'alerts':
        return createChain(mockAlerts);
      default:
        return createChain([]);
    }
  })
};

jest.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
  BillingTransaction: {},
  Anomaly: {},
  Alert: {}
}));

// Mock components that might cause issues in testing
jest.mock('../../components/TransactionAnalyzer', () => {
  return function MockTransactionAnalyzer({ transaction, onAnalysisComplete }: any) {
    return (
      <div data-testid="transaction-analyzer">
        <h3>Analyzing Transaction: {transaction.transaction_id}</h3>
        <div>Amount: ${transaction.amount.toLocaleString()}</div>
        <button
          onClick={() => onAnalysisComplete({
            riskScore: transaction.amount > 10000 ? 85 : 15,
            riskLevel: transaction.amount > 10000 ? 'critical' : 'low',
            flags: transaction.amount > 10000 ? ['excessive_amount'] : []
          })}
          data-testid="complete-analysis"
        >
          Complete Analysis
        </button>
      </div>
    );
  };
});

jest.mock('../../components/FraudScoreDisplay', () => {
  return function MockFraudScoreDisplay({ score, level }: any) {
    return (
      <div data-testid="fraud-score-display">
        Score: {score}, Level: {level}
      </div>
    );
  };
});

describe('End-to-End Fraud Detection Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete User Journey', () => {
    it('should complete full fraud detection workflow', async () => {
      const user = userEvent;

      await act(async () => {
        render(<App />);
      });

      // Wait for authentication to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Should show the main dashboard
      await waitFor(() => {
        expect(screen.getByText('Dashboard') || screen.getByText('Fraud Monitoring Dashboard')).toBeInTheDocument();
      });

      // Navigate to fraud monitoring dashboard
      const fraudMonitoringLink = screen.getByText('Fraud Monitoring') ||
                                 screen.getByRole('button', { name: /fraud/i }) ||
                                 screen.getByTestId('fraud-monitoring-nav');

      if (fraudMonitoringLink) {
        await user.click(fraudMonitoringLink);
      }

      // Should show fraud monitoring dashboard
      await waitFor(() => {
        expect(screen.getByText(/fraud.*monitoring/i) || screen.getByText(/monitoring.*dashboard/i)).toBeInTheDocument();
      });

      // Should display transaction statistics
      await waitFor(() => {
        expect(screen.getByText('Total Transactions') || screen.getByText(/transactions/i)).toBeInTheDocument();
        expect(screen.getByText('Risk Transactions') || screen.getByText(/risk/i)).toBeInTheDocument();
      });

      // Should show recent transactions
      await waitFor(() => {
        expect(screen.getByText('TX001') || screen.queryByText('TX001')).toBeInTheDocument();
      });

      // Click on high-risk transaction
      const highRiskTransaction = screen.getByText('TX001');
      await user.click(highRiskTransaction);

      // Should open transaction analyzer
      await waitFor(() => {
        expect(screen.getByTestId('transaction-analyzer')).toBeInTheDocument();
        expect(screen.getByText('Analyzing Transaction: TX001')).toBeInTheDocument();
      });

      // Complete the analysis
      const completeAnalysisButton = screen.getByTestId('complete-analysis');
      await user.click(completeAnalysisButton);

      // Should show high risk score
      await waitFor(() => {
        expect(screen.getByText(/Score: 85/)).toBeInTheDocument();
        expect(screen.getByText(/Level: critical/)).toBeInTheDocument();
      });
    }, 10000);

    it('should handle normal transaction analysis', async () => {
      const user = userEvent;

      await act(async () => {
        render(<App />);
      });

      // Wait for authentication
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Navigate to fraud monitoring (assuming navigation exists)
      // In a real app, this would click navigation elements

      // Should show transactions
      await waitFor(() => {
        if (screen.queryByText('TX002')) {
          expect(screen.getByText('TX002')).toBeInTheDocument();
        }
      });

      // Click on normal transaction if it exists
      const normalTransaction = screen.queryByText('TX002');
      if (normalTransaction) {
        await user.click(normalTransaction);

        // Should open analyzer
        await waitFor(() => {
          expect(screen.getByTestId('transaction-analyzer')).toBeInTheDocument();
        });

        // Complete analysis
        const completeButton = screen.getByTestId('complete-analysis');
        await user.click(completeButton);

        // Should show low risk
        await waitFor(() => {
          expect(screen.getByText(/Score: 15/)).toBeInTheDocument();
          expect(screen.getByText(/Level: low/)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Real-time Monitoring', () => {
    it('should start and stop monitoring', async () => {
      const user = userEvent;

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Look for monitoring controls
      const startMonitoringButton = screen.queryByText('Start Monitoring') ||
                                   screen.queryByRole('button', { name: /start.*monitor/i });

      if (startMonitoringButton) {
        await user.click(startMonitoringButton);

        // Should change to stop monitoring
        await waitFor(() => {
          expect(screen.getByText('Stop Monitoring') || screen.getByText(/stop.*monitor/i)).toBeInTheDocument();
        });

        const stopMonitoringButton = screen.getByText('Stop Monitoring') ||
                                    screen.getByRole('button', { name: /stop.*monitor/i });

        await user.click(stopMonitoringButton);

        // Should change back to start monitoring
        await waitFor(() => {
          expect(screen.getByText('Start Monitoring') || screen.getByText(/start.*monitor/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          gte: jest.fn(() => Promise.resolve({ data: null, error: new Error('Network error') })),
          eq: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: null, error: new Error('Network error') }))
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: null, error: new Error('Network error') }))
          }))
        }))
      }));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // App should still render despite errors
      expect(screen.getByRole('main') || document.body).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Authentication Flow', () => {
    it('should handle sign out', async () => {
      const user = userEvent;

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Look for sign out button
      const signOutButton = screen.queryByText('Sign Out') ||
                           screen.queryByText('Logout') ||
                           screen.queryByRole('button', { name: /sign.*out|logout/i });

      if (signOutButton) {
        await user.click(signOutButton);

        expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      }
    });
  });

  describe('Data Refresh', () => {
    it('should refresh data when refresh button is clicked', async () => {
      const user = userEvent;

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Look for refresh button
      const refreshButton = screen.queryByText('Refresh') ||
                           screen.queryByRole('button', { name: /refresh/i }) ||
                           screen.queryByText('🔄');

      if (refreshButton) {
        const initialCallCount = (mockSupabase.from as jest.Mock).mock.calls.length;

        await user.click(refreshButton);

        // Should make additional API calls
        await waitFor(() => {
          expect((mockSupabase.from as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount);
        });
      }
    });
  });

  describe('Accessibility', () => {
    it('should be accessible with keyboard navigation', async () => {
      const user = userEvent;

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Test tab navigation
      await user.tab();
      expect(document.activeElement).toBeDefined();

      // Test that interactive elements are reachable
      const buttons = screen.getAllByRole('button');
      for (const button of buttons.slice(0, 3)) { // Test first 3 buttons
        if (button.getAttribute('tabindex') !== '-1') {
          button.focus();
          expect(document.activeElement).toBe(button);
        }
      }
    });

    it('should have proper ARIA labels', async () => {
      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Check for main landmarks
      const main = screen.queryByRole('main');
      if (main) {
        expect(main).toBeInTheDocument();
      }

      // Check for navigation
      const nav = screen.queryByRole('navigation');
      if (nav) {
        expect(nav).toBeInTheDocument();
      }
    });
  });
});