import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock Supabase
const mockSupabaseQuery = {
  select: jest.fn(),
  eq: jest.fn(),
  gte: jest.fn(),
  neq: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
  insert: jest.fn(),
  single: jest.fn(),
};

// Chain methods
Object.keys(mockSupabaseQuery).forEach(key => {
  if (typeof mockSupabaseQuery[key as keyof typeof mockSupabaseQuery] === 'function') {
    (mockSupabaseQuery[key as keyof typeof mockSupabaseQuery] as jest.Mock).mockReturnValue(mockSupabaseQuery);
  }
});

// Mock auth functions
const mockAuth = {
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockSupabaseQuery),
    auth: mockAuth,
  },
  BillingTransaction: {},
  Anomaly: {},
  Alert: {},
}));

// Mock fraud detection service
const mockFraudDetectionService = {
  analyzeTransaction: jest.fn(),
  processTransaction: jest.fn(),
  createAnomalyRecord: jest.fn(),
  createAlert: jest.fn(),
};

jest.mock('../../services/fraudDetectionService', () => ({
  fraudDetectionService: mockFraudDetectionService,
  FraudDetectionService: {
    getInstance: () => mockFraudDetectionService,
  },
}));

describe('End-to-End Fraud Detection Flow', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockSession = {
    user: mockUser,
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
  };

  const mockTransactions = [
    {
      id: 'tx-1',
      transaction_id: 'TX001',
      provider_id: 'PROV001',
      amount: 1000,
      transaction_date: '2024-01-15T10:30:00Z',
      patient_id: 'PAT001',
      procedure_code: '99213',
      diagnosis_code: 'Z00.00',
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: 'tx-2',
      transaction_id: 'TX002',
      provider_id: 'PROV002',
      amount: 50000,
      transaction_date: '2024-01-15T11:30:00Z',
      patient_id: 'PAT002',
      procedure_code: '99214',
      diagnosis_code: 'Z01.00',
      created_at: '2024-01-15T11:30:00Z'
    }
  ];

  const mockAlerts = [
    {
      id: 'alert-1',
      anomaly_id: 'anom-1',
      severity: 'critical' as const,
      title: 'CRITICAL Risk Transaction (Score: 85)',
      description: 'Excessive amount detected\n\nAction: IMMEDIATE ACTION: Suspend transaction',
      is_resolved: false,
      created_at: '2024-01-15T11:30:00Z',
      anomalies: {
        transaction_id: 'TX002',
        risk_score: 85,
        anomaly_type: 'excessive_amount'
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup authentication mocks
    mockAuth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    });

    mockAuth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });

    // Setup database mocks
    mockSupabaseQuery.limit.mockResolvedValue({
      data: [],
      error: null
    });

    // Setup fraud detection mocks
    mockFraudDetectionService.analyzeTransaction.mockResolvedValue({
      isAnomalous: false,
      riskScore: 25,
      riskLevel: 'low',
      flags: [],
      severity: 'low',
      reason: 'No anomalies detected',
      preventativeAction: 'Process normally',
      scoreBreakdown: []
    });
  });

  describe('User Authentication Flow', () => {
    it('should show landing page when not authenticated', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Welcome to FraudShield/i)).toBeInTheDocument();
      });
    });

    it('should show login page when login button is clicked', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Get Started/i)).toBeInTheDocument();
      });

      const getStartedButton = screen.getByText(/Get Started/i);
      await act(async () => {
        fireEvent.click(getStartedButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Sign in to your account/i)).toBeInTheDocument();
      });
    });

    it('should show dashboard when authenticated', async () => {
      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Navigation Flow', () => {
    beforeEach(async () => {
      // Setup authenticated state
      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });
    });

    it('should navigate to fraud monitoring dashboard', async () => {
      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Fraud Detection/i)).toBeInTheDocument();
      });

      const fraudDetectionLink = screen.getByText(/Fraud Detection/i);
      await act(async () => {
        fireEvent.click(fraudDetectionLink);
      });

      await waitFor(() => {
        expect(screen.getByText(/Fraud Monitoring Dashboard/i)).toBeInTheDocument();
      });
    });

    it('should navigate to transactions page', async () => {
      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Transactions/i)).toBeInTheDocument();
      });

      const transactionsLink = screen.getByText(/Transactions/i);
      await act(async () => {
        fireEvent.click(transactionsLink);
      });

      await waitFor(() => {
        expect(screen.getByText(/Transaction History/i)).toBeInTheDocument();
      });
    });

    it('should navigate to alerts page', async () => {
      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Alerts/i)).toBeInTheDocument();
      });

      const alertsLink = screen.getByText(/Alerts/i);
      await act(async () => {
        fireEvent.click(alertsLink);
      });

      await waitFor(() => {
        expect(screen.getByText(/Security Alerts/i)).toBeInTheDocument();
      });
    });
  });

  describe('Fraud Detection Workflow', () => {
    beforeEach(async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      // Navigate to fraud monitoring dashboard
      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Fraud Detection/i)).toBeInTheDocument();
      });

      const fraudDetectionLink = screen.getByText(/Fraud Detection/i);
      await act(async () => {
        fireEvent.click(fraudDetectionLink);
      });
    });

    it('should display dashboard with statistics', async () => {
      // Mock dashboard data
      mockSupabaseQuery.limit
        .mockResolvedValueOnce({ data: mockTransactions, error: null }) // transactions
        .mockResolvedValueOnce({ data: [{ risk_score: 85 }], error: null }) // anomalies
        .mockResolvedValueOnce({ data: [mockAlerts[0]], error: null }) // critical alerts
        .mockResolvedValueOnce({ data: [], error: null }); // high alerts

      await waitFor(() => {
        expect(screen.getByText(/Fraud Monitoring Dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/Total Transactions/i)).toBeInTheDocument();
        expect(screen.getByText(/Risk Transactions/i)).toBeInTheDocument();
        expect(screen.getByText(/Critical Alerts/i)).toBeInTheDocument();
      });
    });

    it('should start and stop monitoring', async () => {
      await waitFor(() => {
        expect(screen.getByText(/▶️ Start Monitoring/i)).toBeInTheDocument();
      });

      const startButton = screen.getByText(/▶️ Start Monitoring/i);
      await act(async () => {
        fireEvent.click(startButton);
      });

      expect(screen.getByText(/⏸️ Stop Monitoring/i)).toBeInTheDocument();

      const stopButton = screen.getByText(/⏸️ Stop Monitoring/i);
      await act(async () => {
        fireEvent.click(stopButton);
      });

      expect(screen.getByText(/▶️ Start Monitoring/i)).toBeInTheDocument();
    });

    it('should analyze transactions and display results', async () => {
      // Mock transactions
      mockSupabaseQuery.limit.mockResolvedValue({
        data: mockTransactions,
        error: null
      });

      mockFraudDetectionService.analyzeTransaction.mockResolvedValue({
        isAnomalous: true,
        riskScore: 85,
        riskLevel: 'critical',
        flags: ['excessive_amount'],
        severity: 'critical',
        reason: 'Amount exceeds threshold',
        preventativeAction: 'IMMEDIATE ACTION: Suspend transaction',
        scoreBreakdown: [
          {
            rule: 'excessive_amount',
            points: 30,
            description: 'Amount exceeds procedure threshold'
          }
        ]
      });

      await waitFor(() => {
        expect(screen.getByText('TX001')).toBeInTheDocument();
      });

      const analyzeButton = screen.getAllByText('Analyze')[0];
      await act(async () => {
        fireEvent.click(analyzeButton);
      });

      await waitFor(() => {
        expect(mockFraudDetectionService.analyzeTransaction).toHaveBeenCalledWith(mockTransactions[0]);
        expect(screen.getByText('Score: 85')).toBeInTheDocument();
        expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      });
    });

    it('should open transaction analyzer for detailed analysis', async () => {
      mockSupabaseQuery.limit.mockResolvedValue({
        data: mockTransactions,
        error: null
      });

      await waitFor(() => {
        expect(screen.getByText('TX001')).toBeInTheDocument();
      });

      const transactionRow = screen.getByText('TX001').closest('div');
      await act(async () => {
        fireEvent.click(transactionRow!);
      });

      await waitFor(() => {
        expect(screen.getByText('Transaction Analysis')).toBeInTheDocument();
        expect(screen.getByText('✕ Close')).toBeInTheDocument();
      });
    });

    it('should display active alerts', async () => {
      mockSupabaseQuery.limit.mockResolvedValue({
        data: mockAlerts,
        error: null
      });

      await waitFor(() => {
        expect(screen.getByText('Active Alerts')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('CRITICAL Risk Transaction (Score: 85)')).toBeInTheDocument();
        expect(screen.getByText('Excessive amount detected')).toBeInTheDocument();
        expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });
    });

    it('should handle authentication errors gracefully', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Auth error')
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Welcome to FraudShield/i)).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle database connection errors', async () => {
      // Navigate to fraud monitoring
      await act(async () => {
        render(<App />);
      });

      const fraudDetectionLink = screen.getByText(/Fraud Detection/i);
      await act(async () => {
        fireEvent.click(fraudDetectionLink);
      });

      // Mock database error
      mockSupabaseQuery.limit.mockRejectedValue(new Error('Database connection failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Trigger refresh
      const refreshButton = screen.getByText(/🔄 Refresh/i);
      await act(async () => {
        fireEvent.click(refreshButton);
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle fraud detection service errors', async () => {
      await act(async () => {
        render(<App />);
      });

      const fraudDetectionLink = screen.getByText(/Fraud Detection/i);
      await act(async () => {
        fireEvent.click(fraudDetectionLink);
      });

      mockSupabaseQuery.limit.mockResolvedValue({
        data: mockTransactions,
        error: null
      });

      mockFraudDetectionService.analyzeTransaction.mockRejectedValue(
        new Error('Analysis service unavailable')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await waitFor(() => {
        expect(screen.getByText('Analyze')).toBeInTheDocument();
      });

      const analyzeButton = screen.getByText('Analyze');
      await act(async () => {
        fireEvent.click(analyzeButton);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Quick analysis failed:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should handle loading states appropriately', async () => {
      // Mock slow auth response
      let resolveAuth: (value: any) => void;
      const authPromise = new Promise(resolve => {
        resolveAuth = resolve;
      });
      mockAuth.getSession.mockReturnValue(authPromise);

      await act(async () => {
        render(<App />);
      });

      // Should show loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Resolve auth
      await act(async () => {
        resolveAuth({
          data: { session: mockSession },
          error: null
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interaction Patterns', () => {
    beforeEach(async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent;

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      });

      // Use Tab to navigate to fraud detection link
      await user.tab();
      await user.tab();

      const fraudDetectionLink = screen.getByText(/Fraud Detection/i);
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/Fraud Monitoring Dashboard/i)).toBeInTheDocument();
      });
    });

    it('should maintain state across navigation', async () => {
      await act(async () => {
        render(<App />);
      });

      // Navigate to fraud monitoring and start monitoring
      const fraudDetectionLink = screen.getByText(/Fraud Detection/i);
      await act(async () => {
        fireEvent.click(fraudDetectionLink);
      });

      await waitFor(() => {
        expect(screen.getByText(/▶️ Start Monitoring/i)).toBeInTheDocument();
      });

      const startButton = screen.getByText(/▶️ Start Monitoring/i);
      await act(async () => {
        fireEvent.click(startButton);
      });

      expect(screen.getByText(/⏸️ Stop Monitoring/i)).toBeInTheDocument();

      // Navigate away and back
      const dashboardLink = screen.getByText(/Dashboard/i);
      await act(async () => {
        fireEvent.click(dashboardLink);
      });

      const fraudDetectionLink2 = screen.getByText(/Fraud Detection/i);
      await act(async () => {
        fireEvent.click(fraudDetectionLink2);
      });

      // Monitoring state should be preserved
      expect(screen.getByText(/⏸️ Stop Monitoring/i)).toBeInTheDocument();
    });

    it('should handle sign out flow', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });

      await act(async () => {
        render(<App />);
      });

      await waitFor(() => {
        expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
      });

      // Trigger sign out (this would typically be in a header or profile menu)
      await act(async () => {
        // Simulate auth state change to signed out
        mockAuth.onAuthStateChange.mock.calls[0][0]('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(screen.getByText(/Welcome to FraudShield/i)).toBeInTheDocument();
      });
    });
  });
});