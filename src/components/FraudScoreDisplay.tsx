import React from 'react';
import { FraudDetectionResult } from '../services/fraudDetectionService';

interface FraudScoreDisplayProps {
  result: FraudDetectionResult;
  showDetails?: boolean;
}

const FraudScoreDisplay: React.FC<FraudScoreDisplayProps> = ({
  result,
  showDetails = true
}) => {
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 50) return 'bg-orange-500';
    if (score >= 25) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getActionIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return '📝';
      default:
        return '✅';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Fraud Detection Analysis
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskLevelColor(result.riskLevel)}`}>
          {getActionIcon(result.riskLevel)} {result.riskLevel.toUpperCase()}
        </span>
      </div>

      {/* Risk Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Risk Score</span>
          <span className="text-2xl font-bold text-gray-900">{result.riskScore}/100</span>
        </div>

        {/* Score Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getScoreBarColor(result.riskScore)}`}
            style={{ width: `${result.riskScore}%` }}
          ></div>
        </div>

        {/* Score Labels */}
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>70</span>
          <span>100</span>
        </div>
      </div>

      {/* Preventative Action */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Recommended Action</h4>
        <p className="text-sm text-gray-700">{result.preventativeAction}</p>
      </div>

      {/* Detailed Breakdown */}
      {showDetails && result.scoreBreakdown.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Score Breakdown</h4>
          <div className="space-y-2">
            {result.scoreBreakdown.map((breakdown, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                <div>
                  <p className="text-sm font-medium text-red-900 capitalize">
                    {breakdown.rule.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-red-700">{breakdown.description}</p>
                </div>
                <span className="text-sm font-bold text-red-900">+{breakdown.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flags */}
      {result.flags.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Detected Issues</h4>
          <div className="flex flex-wrap gap-2">
            {result.flags.map((flag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full border border-red-200"
              >
                {flag.replace(/_/g, ' ').toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="border-t pt-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Status:</span> {result.reason}
        </p>
        {result.isAnomalous && (
          <p className="text-sm text-red-600 mt-1">
            <span className="font-medium">⚠️ Transaction requires attention</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default FraudScoreDisplay;