import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import FraudMonitoringDashboard from '../../components/FraudMonitoringDashboard';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock Supabase
const mockSupabaseQuery = {
  select: jest.fn(),
  eq: jest.fn(),
  gte: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
};

// Chain methods
mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
mockSupabaseQuery.gte.mockReturnValue(mockSupabaseQuery);
mockSupabaseQuery.order.mockReturnValue(mockSupabaseQuery);
mockSupabaseQuery.limit.mockReturnValue(mockSupabaseQuery);

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockSupabaseQuery),
  },
  BillingTransaction: {},
  Anomaly: {},
  Alert: {},
}));

// Mock fraud detection service
const mockFraudDetectionService = {
  analyzeTransaction: jest.fn(),
};

jest.mock('../../services/fraudDetectionService', () => ({
  fraudDetectionService: mockFraudDetectionService,
  FraudDetectionResult: {},
}));

// Mock auth context
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
};

const mockAuthContext = {
  user: mockUser,
  session: { user: mockUser, access_token: 'token' },
  loading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('FraudMonitoringDashboard', () => {
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
      amount: 5000,
      transaction_date: '2024-01-15T11:30:00Z',
      patient_id: 'PAT002',
      procedure_code: '99214',
      diagnosis_code: 'Z01.00',
      created_at: '2024-01-15T11:30:00Z'
    }
  ];

  const mockAnomalies = [
    {
      id: 'anom-1',
      transaction_id: 'TX002',
      risk_score: 85,
      anomaly_type: 'excessive_amount'
    }
  ];

  const mockAlerts = [
    {
      id: 'alert-1',
      anomaly_id: 'anom-1',
      severity: 'critical' as const,
      title: 'Critical Risk Transaction',
      description: 'High amount detected',
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
    jest.useFakeTimers();

    // Setup default mock responses
    mockSupabaseQuery.limit.mockResolvedValue({
      data: [],
      error: null
    });

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

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render dashboard with initial state', async () => {
    await act(async () => {
      render(<FraudMonitoringDashboard />);
    });

    expect(screen.getByText('Fraud Monitoring Dashboard')).toBeInTheDocument();
    expect(screen.getByText('▶️ Start Monitoring')).toBeInTheDocument();
    expect(screen.getByText('🔄 Refresh')).toBeInTheDocument();
    expect(screen.getByText('Total Transactions')).toBeInTheDocument();
    expect(screen.getByText('Risk Transactions')).toBeInTheDocument();
    expect(screen.getByText('Critical Alerts')).toBeInTheDocument();
    expect(screen.getByText('High Risk Alerts')).toBeInTheDocument();
    expect(screen.getByText('Avg Risk Score')).toBeInTheDocument();
  });

  it('should load and display dashboard statistics', async () => {
    // Mock successful data loading
    mockSupabaseQuery.limit
      .mockResolvedValueOnce({ data: mockTransactions, error: null }) // transactions
      .mockResolvedValueOnce({ data: mockAnomalies, error: null }) // anomalies
      .mockResolvedValueOnce({ data: [mockAlerts[0]], error: null }) // critical alerts
      .mockResolvedValueOnce({ data: [], error: null }); // high alerts

    await act(async () => {
      render(<FraudMonitoringDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Total transactions
      expect(screen.getByText('1')).toBeInTheDocument(); // Risk transactions
      expect(screen.getByText('85')).toBeInTheDocument(); // Avg risk score
    });
  });

  it('should load and display recent transactions', async () => {
    mockSupabaseQuery.limit.mockResolvedValue({
      data: mockTransactions,
      error: null
    });

    await act(async () => {
      render(<FraudMonitoringDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('TX001')).toBeInTheDocument();
      expect(screen.getByText('TX002')).toBeInTheDocument();
      expect(screen.getByText('Provider: PROV001')).toBeInTheDocument();
      expect(screen.getByText('Amount: $1,000')).toBeInTheDocument();
    });
  });

  it('should load and display active alerts', async () => {
    mockSupabaseQuery.limit.mockResolvedValue({
      data: mockAlerts,
      error: null
    });

    await act(async () => {
      render(<FraudMonitoringDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Critical Risk Transaction')).toBeInTheDocument();
      expect(screen.getByText('High amount detected')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });
  });

  it('should toggle monitoring state', async () => {
    await act(async () => {
      render(<FraudMonitoringDashboard />);
    });

    const monitorButton = screen.getByText('▶️ Start Monitoring');

    await act(async () => {
      fireEvent.click(monitorButton);
    });

    expect(screen.getByText('⏸️ Stop Monitoring')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('⏸️ Stop Monitoring'));
    });

    expect(screen.getByText('▶️ Start Monitoring')).toBeInTheDocument();
  });

  it('should refresh dashboard data when refresh button is clicked', async () => {
    mockSupabaseQuery.limit.mockResolvedValue({
      data: mockTransactions,
      error: null
    });

    await act(async () => {
      render(<FraudMonitoringDashboard />);
    });

    const refreshButton = screen.getByText('🔄 Refresh');

    await act(async () => {
      fireEvent.click(refreshButton);
    });

    // Verify that data loading functions were called again
    await waitFor(() => {
      expect(mockSupabaseQuery.select).toHaveBeenCalled();
    });
  });

  it('should analyze transaction when analyze button is clicked', async () => {
    mockSupabaseQuery.limit.mockResolvedValue({
      data: mockTransactions,
      error: null
    });

    mockFraudDetectionService.analyzeTransaction.mockResolvedValue({
      isAnomalous: true,
      riskScore: 75,
      riskLevel: 'critical',
      flags: ['excessive_amount'],
      severity: 'critical',
      reason: 'Amount exceeds threshold',
      preventativeAction: 'Hold for review',
      scoreBreakdown: []
    });

    await act(async () => {
      render(<FraudMonitoringDashboard />);
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
    });
  });

  it('should select transaction and show analyzer', async () => {
    mockSupabaseQuery.limit.mockResolvedValue({
      data: mockTransactions,
      error: null
    });

    await act(async () => {
      render(<FraudMonitoringDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('TX001')).toBeInTheDocument();
    });

    const transactionElement = screen.getByText('TX001').closest('div');

    await act(async () => {
      fireEvent.click(transactionElement!);
    });

    await waitFor(() => {
      expect(screen.getByText('Transaction Analysis')).toBeInTheDocument();
      expect(screen.getByText('✕ Close')).toBeInTheDocument();
    });
  });

  it('should close transaction analyzer', async () => {
    mockSupabaseQuery.limit.mockResolvedValue({
      data: mockTransactions,
      error: null
    });

    await act(async () => {
      render(<FraudMonitoringDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('TX001')).toBeInTheDocument();
    });

    // Select transaction
    const transactionElement = screen.getByText('TX001').closest('div');
    await act(async () => {
      fireEvent.click(transactionElement!);
    });

    await waitFor(() => {
      expect(screen.getByText('Transaction Analysis')).toBeInTheDocument();
    });

    // Close analyzer
    const closeButton = screen.getByText('✕ Close');
    await act(async () => {
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Transaction Analysis')).not.toBeInTheDocument();
    });
  });

  it('should handle database errors gracefully', async () => {
    mockSupabaseQuery.limit.mockRejectedValue(new Error('Database error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await act(async () => {
      render(<FraudMonitoringDashboard />);
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should update monitoring data periodically when monitoring is active', async () => {
    mockSupabaseQuery.limit.mockResolvedValue({
      data: mockTransactions,
      error: null
    });

    await act(async () => {
      render(<FraudMonitoringDashboard />);
    });

    // Start monitoring
    const monitorButton = screen.getByText('▶️ Start Monitoring');
    await act(async () => {
      fireEvent.click(monitorButton);
    });

    // Fast-forward time to trigger interval
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    // Verify that data loading was called multiple times
    expect(mockSupabaseQuery.select).toHaveBeenCalledTimes(4); // Initial load + interval update
  });

  it('should display risk colors correctly', async () => {
    const highRiskTransaction = {
      ...mockTransactions[0],
      id: 'tx-high-risk'
    };

    mockSupabaseQuery.limit.mockResolvedValue({
      data: [highRiskTransaction],
      error: null
    });

    mockFraudDetectionService.analyzeTransaction.mockResolvedValue({
      isAnomalous: true,
      riskScore: 85,
      riskLevel: 'critical',
      flags: ['excessive_amount'],
      severity: 'critical',
      reason: 'High risk detected',
      preventativeAction: 'Immediate action required',
      scoreBreakdown: []
    });

    await act(async () => {
      render(<FraudMonitoringDashboard />);
    });

    // Click analyze to get risk score
    await waitFor(() => {
      expect(screen.getByText('Analyze')).toBeInTheDocument();
    });

    const analyzeButton = screen.getByText('Analyze');
    await act(async () => {
      fireEvent.click(analyzeButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Score: 85')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });
  });

  it('should handle empty data states', async () => {
    mockSupabaseQuery.limit.mockResolvedValue({
      data: [],
      error: null
    });

    await act(async () => {
      render(<FraudMonitoringDashboard />);
    });

    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    expect(screen.getByText('Active Alerts')).toBeInTheDocument();

    // Should not crash with empty data
    expect(screen.getByText('0')).toBeInTheDocument(); // Stats should show 0
  });

  it('should handle analysis errors gracefully', async () => {
    mockSupabaseQuery.limit.mockResolvedValue({
      data: mockTransactions,
      error: null
    });

    mockFraudDetectionService.analyzeTransaction.mockRejectedValue(new Error('Analysis failed'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await act(async () => {
      render(<FraudMonitoringDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Analyze')).toBeInTheDocument();
    });

    const analyzeButton = screen.getByText('Analyze');
    await act(async () => {
      fireEvent.click(analyzeButton);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Quick analysis failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});