import React, { useState, useEffect } from 'react';
import { supabase, BillingTransaction, Anomaly, Alert } from '../lib/supabase';
import FraudScoreDisplay from './FraudScoreDisplay';
import TransactionAnalyzer from './TransactionAnalyzer';
import { fraudDetectionService, FraudDetectionResult } from '../services/fraudDetectionService';

interface DashboardStats {
  totalTransactions: number;
  riskTransactions: number;
  criticalAlerts: number;
  highRiskAlerts: number;
  avgRiskScore: number;
}

const FraudMonitoringDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalTransactions: 0,
    riskTransactions: 0,
    criticalAlerts: 0,
    highRiskAlerts: 0,
    avgRiskScore: 0
  });

  const [recentTransactions, setRecentTransactions] = useState<BillingTransaction[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<BillingTransaction | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastAnalysisResults, setLastAnalysisResults] = useState<{[key: string]: FraudDetectionResult}>({});

  // Load initial data
  useEffect(() => {
    loadDashboardData();
    loadRecentTransactions();
    loadRecentAlerts();

    // Set up real-time monitoring
    if (isMonitoring) {
      const interval = setInterval(() => {
        loadDashboardData();
        loadRecentAlerts();
      }, 10000); // Update every 10 seconds

      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const loadDashboardData = async () => {
    try {
      // Get transaction stats from last 24 hours
      const { data: transactions, error: transError } = await supabase
        .from('billing_transactions')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: anomalies, error: anomError } = await supabase
        .from('anomalies')
        .select('risk_score')
        .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: criticalAlerts, error: criticalError } = await supabase
        .from('alerts')
        .select('id')
        .eq('severity', 'critical')
        .eq('is_resolved', false);

      const { data: highAlerts, error: highError } = await supabase
        .from('alerts')
        .select('id')
        .eq('severity', 'high')
        .eq('is_resolved', false);

      if (!transError && !anomError && !criticalError && !highError) {
        const totalTransactions = transactions?.length || 0;
        const riskTransactions = anomalies?.length || 0;
        const avgRiskScore = anomalies?.length
          ? anomalies.reduce((sum, a) => sum + a.risk_score, 0) / anomalies.length
          : 0;

        setStats({
          totalTransactions,
          riskTransactions,
          criticalAlerts: criticalAlerts?.length || 0,
          highRiskAlerts: highAlerts?.length || 0,
          avgRiskScore: Math.round(avgRiskScore)
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadRecentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setRecentTransactions(data);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadRecentAlerts = async () => {
    try {
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

      if (!error && data) {
        setRecentAlerts(data as Alert[]);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const analyzeTransactionQuickly = async (transaction: BillingTransaction) => {
    try {
      const result = await fraudDetectionService.analyzeTransaction(transaction);
      setLastAnalysisResults(prev => ({
        ...prev,
        [transaction.id]: result
      }));
      return result;
    } catch (error) {
      console.error('Quick analysis failed:', error);
      return null;
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 50) return 'text-orange-600';
    if (score >= 25) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Fraud Monitoring Dashboard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isMonitoring
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isMonitoring ? '⏸️ Stop Monitoring' : '▶️ Start Monitoring'}
            </button>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Transactions</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
            <p className="text-xs text-gray-500">Last 24 hours</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500">Risk Transactions</h3>
            <p className="text-2xl font-bold text-orange-600">{stats.riskTransactions}</p>
            <p className="text-xs text-gray-500">Flagged for review</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500">Critical Alerts</h3>
            <p className="text-2xl font-bold text-red-600">{stats.criticalAlerts}</p>
            <p className="text-xs text-gray-500">Requires immediate action</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500">High Risk Alerts</h3>
            <p className="text-2xl font-bold text-orange-600">{stats.highRiskAlerts}</p>
            <p className="text-xs text-gray-500">Pending review</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500">Avg Risk Score</h3>
            <p className={`text-2xl font-bold ${getRiskColor(stats.avgRiskScore)}`}>
              {stats.avgRiskScore}
            </p>
            <p className="text-xs text-gray-500">Out of 100</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentTransactions.map((transaction) => {
                const analysis = lastAnalysisResults[transaction.id];
                return (
                  <div
                    key={transaction.id}
                    onClick={() => setSelectedTransaction(transaction)}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.transaction_id}
                        </p>
                        <p className="text-sm text-gray-600">
                          Provider: {transaction.provider_id}
                        </p>
                        <p className="text-sm text-gray-600">
                          Amount: ${transaction.amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {analysis ? (
                          <div>
                            <span className={`text-sm font-semibold ${getRiskColor(analysis.riskScore)}`}>
                              Score: {analysis.riskScore}
                            </span>
                            <p className={`text-xs px-2 py-1 rounded ${getSeverityBadge(analysis.riskLevel)}`}>
                              {analysis.riskLevel.toUpperCase()}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              analyzeTransactionQuickly(transaction);
                            }}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                          >
                            Analyze
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{alert.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${getSeverityBadge(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      {alert.anomaly?.transaction_id}
                    </span>
                    <span>
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transaction Analyzer */}
        {selectedTransaction && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Transaction Analysis</h2>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕ Close
              </button>
            </div>
            <TransactionAnalyzer
              transaction={selectedTransaction}
              onAnalysisComplete={(result) => {
                console.log('Analysis completed:', result);
                loadRecentAlerts(); // Refresh alerts if new ones were created
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FraudMonitoringDashboard;