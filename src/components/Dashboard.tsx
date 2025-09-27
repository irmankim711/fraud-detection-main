import React, { useState } from 'react';
import { useRealTimeMetrics, useCriticalAlerts, usePricingInsights } from '../hooks/useRealTimeData';
import { FraudAlert, PricingInsight } from '../lib/supabase';

export function Dashboard() {
  const { metrics, loading: metricsLoading, error: metricsError } = useRealTimeMetrics();
  const { alerts, loading: alertsLoading, error: alertsError } = useCriticalAlerts();
  const { insights: pricingInsights, loading: insightsLoading, error: insightsError } = usePricingInsights();
  const [isRealTimeActive] = useState(true);

  // Loading state
  if (metricsLoading || alertsLoading || insightsLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg font-medium text-gray-600">Loading fraud detection dashboard...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (metricsError || alertsError || insightsError) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-800">Error Loading Dashboard</h3>
          <p className="text-red-600 mt-2">
            {metricsError || alertsError || insightsError}
          </p>
          <p className="text-sm text-red-600 mt-2">
            Please ensure your Supabase database is set up correctly and try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="text-center text-gray-600">No metrics data available</div>
      </div>
    );
  }

  const getSeverityColor = (severity: FraudAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-l-red-500 text-red-900';
      case 'high':
        return 'bg-orange-50 border-l-orange-500 text-orange-900';
      case 'medium':
        return 'bg-yellow-50 border-l-yellow-500 text-yellow-900';
      case 'low':
        return 'bg-blue-50 border-l-blue-500 text-blue-900';
      default:
        return 'bg-gray-50 border-l-gray-500 text-gray-900';
    }
  };

  const getUrgencyIndicator = (level: number) => {
    const colors = ['bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500', 'bg-red-600'];
    return colors[level - 1] || 'bg-gray-500';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Enhanced Header with Real-time Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Healthcare Fraud Detection Center</h1>
            <p className="text-gray-600 mt-2">Real-time fraud monitoring and anomaly detection system</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isRealTimeActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">
                {isRealTimeActive ? 'Live Monitoring' : 'Offline'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Last updated: {formatTimestamp(metrics.lastUpdated)}
            </div>
          </div>
        </div>
      </div>

      {/* Critical Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Financial Impact - Most Critical */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl shadow-lg border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-red-900">Fraud Detected Today</h3>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          </div>
          <p className="text-3xl font-bold text-red-700 mb-1">{formatCurrency(metrics.totalFinancialImpact)}</p>
          <p className="text-red-600 text-sm">{metrics.fraudulentDetected} fraudulent claims identified</p>
          <div className="mt-3 flex items-center">
            <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">
              {metrics.alertsToday} active alerts
            </span>
          </div>
        </div>

        {/* Prevention Impact */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-900">Prevented Losses</h3>
          <p className="text-3xl font-bold text-green-700 mt-2">{formatCurrency(metrics.preventedLosses)}</p>
          <p className="text-green-600 text-sm mt-1">↗ 28% more than last month</p>
          <div className="mt-3">
            <div className="w-full bg-green-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{width: '73%'}}></div>
            </div>
            <p className="text-xs text-green-700 mt-1">73% of potential fraud prevented</p>
          </div>
        </div>

        {/* Detection Accuracy */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900">AI Detection Accuracy</h3>
          <p className="text-3xl font-bold text-blue-700 mt-2">{metrics.accuracyRate}%</p>
          <p className="text-blue-600 text-sm mt-1">↗ +0.3% from last week</p>
          <div className="mt-3 text-xs text-blue-700">
            Avg processing: {metrics.avgProcessingTime}s per claim
          </div>
        </div>

        {/* System Health */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-lg border border-purple-200">
          <h3 className="text-lg font-semibold text-purple-900">System Health</h3>
          <p className="text-2xl font-bold text-purple-700 mt-2 capitalize">{metrics.systemHealth}</p>
          <p className="text-purple-600 text-sm mt-1">{metrics.totalClaims.toLocaleString()} claims processed</p>
          <div className="mt-3">
            <span className={`text-xs px-2 py-1 rounded-full ${
              metrics.systemHealth === 'excellent' ? 'bg-green-200 text-green-800' :
              metrics.systemHealth === 'good' ? 'bg-blue-200 text-blue-800' :
              metrics.systemHealth === 'warning' ? 'bg-yellow-200 text-yellow-800' :
              'bg-red-200 text-red-800'
            }`}>
              All systems operational
            </span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Critical Alerts - Prominent Position */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Critical Fraud Alerts</h3>
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                {alerts.filter(a => a.severity === 'critical').length} Critical
              </span>
            </div>
            <p className="text-gray-600 mt-1">Immediate attention required</p>
          </div>
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${getUrgencyIndicator(alert.urgencyLevel)}`}></div>
                      <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        {alert.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                    <div className="bg-blue-50 p-3 rounded-md mb-3">
                      <p className="text-sm text-blue-900 font-medium">AI Recommendation:</p>
                      <p className="text-sm text-blue-800">{alert.aiRecommendation}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex space-x-4">
                        <span>ID: {alert.claimId}</span>
                        <span>Provider: {alert.providerId}</span>
                        <span>{formatTimestamp(alert.timestamp)}</span>
                      </div>
                      <span className="font-semibold text-red-600">
                        Loss: {formatCurrency(alert.estimatedLoss)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <button className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200 transition-colors">
                      Investigate
                    </button>
                    <button className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200 transition-colors">
                      Escalate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Insights */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Pricing Anomaly Insights</h3>
            <p className="text-gray-600 mt-1">Cost variance analysis</p>
          </div>
          <div className="p-6 space-y-4">
            {pricingInsights.map((insight, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{insight.category}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Claim:</span>
                    <span className="font-medium">{formatCurrency(insight.average_claim_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Suspicious Avg:</span>
                    <span className="font-medium text-red-600">{formatCurrency(insight.suspicious_claim_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Variance:</span>
                    <span className="font-bold text-red-600">+{insight.variance_percentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Flagged Claims:</span>
                    <span className="font-medium">{insight.flagged_claims_count}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Potential Savings:</span>
                    <span className="font-bold text-green-600">{formatCurrency(insight.potential_savings)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fraud Pattern Analysis */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Fraud Pattern Trends</h3>
            <p className="text-gray-600 mt-1">Real-time anomaly detection patterns</p>
          </div>
          <div className="p-6">
            <div className="h-64 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-600 font-medium">Advanced Pattern Analytics</p>
                <p className="text-sm text-gray-500 mt-1">Chart integration with fraud detection algorithms</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommendations Summary */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">AI-Powered Recommendations</h3>
            <p className="text-gray-600 mt-1">Automated fraud prevention actions</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <h4 className="font-semibold text-yellow-900">Provider Risk Assessment</h4>
              </div>
              <p className="text-sm text-yellow-800 mt-2">
                PROV-8834 shows 340% increase in claim submissions. Recommend immediate audit.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <h4 className="font-semibold text-red-900">Billing Pattern Alert</h4>
              </div>
              <p className="text-sm text-red-800 mt-2">
                Unusual diagnostic code clustering detected. Auto-flag similar patterns for review.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <h4 className="font-semibold text-green-900">System Optimization</h4>
              </div>
              <p className="text-sm text-green-800 mt-2">
                Detection model performance increased 12% with latest algorithm update.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <h4 className="font-semibold text-blue-900">Process Improvement</h4>
              </div>
              <p className="text-sm text-blue-800 mt-2">
                Implement automated claim suspension for confidence scores above 95%.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}