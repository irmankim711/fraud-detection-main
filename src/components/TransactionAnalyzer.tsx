import React, { useState } from 'react';
import { BillingTransaction } from '../lib/supabase';
import { useFraudDetection } from '../hooks/useFraudDetection';
import FraudScoreDisplay from './FraudScoreDisplay';

interface TransactionAnalyzerProps {
  transaction?: BillingTransaction;
  onAnalysisComplete?: (result: any) => void;
}

const TransactionAnalyzer: React.FC<TransactionAnalyzerProps> = ({
  transaction,
  onAnalysisComplete
}) => {
  const { result, isAnalyzing, error, analyzeTransaction, processTransaction } = useFraudDetection();
  const [mode, setMode] = useState<'analyze' | 'process'>('analyze');

  const handleAnalyze = async () => {
    if (!transaction) return;

    try {
      if (mode === 'analyze') {
        const analysisResult = await analyzeTransaction(transaction);
        onAnalysisComplete?.(analysisResult);
      } else {
        const processResult = await processTransaction(transaction);
        onAnalysisComplete?.(processResult);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  if (!transaction) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-500">No transaction selected for analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Transaction Details */}
      <div className="bg-white rounded-lg shadow-md p-6 border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Transaction ID:</span>
            <p className="text-gray-900">{transaction.transaction_id}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Provider ID:</span>
            <p className="text-gray-900">{transaction.provider_id}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Amount:</span>
            <p className="text-gray-900 font-semibold">${transaction.amount.toLocaleString()}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Date:</span>
            <p className="text-gray-900">{new Date(transaction.transaction_date).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Procedure Code:</span>
            <p className="text-gray-900">{transaction.procedure_code || 'N/A'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Diagnosis Code:</span>
            <p className="text-gray-900">{transaction.diagnosis_code || 'N/A'}</p>
          </div>
          {transaction.patient_id && (
            <div>
              <span className="font-medium text-gray-700">Patient ID:</span>
              <p className="text-gray-900">{transaction.patient_id}</p>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fraud Analysis</h3>

        {/* Mode Selection */}
        <div className="flex gap-4 mb-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="analyze"
              checked={mode === 'analyze'}
              onChange={(e) => setMode(e.target.value as 'analyze')}
              className="mr-2"
            />
            <span className="text-sm">Analyze Only</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="process"
              checked={mode === 'process'}
              onChange={(e) => setMode(e.target.value as 'process')}
              className="mr-2"
            />
            <span className="text-sm">Process & Create Alerts</span>
          </label>
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            isAnalyzing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isAnalyzing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Analyzing Transaction...
            </div>
          ) : (
            `${mode === 'analyze' ? 'Analyze' : 'Process'} Transaction`
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">
              <span className="font-medium">Error:</span> {error}
            </p>
          </div>
        )}
      </div>

      {/* Results Display */}
      {result && (
        <div>
          <FraudScoreDisplay result={result} showDetails={true} />

          {/* Quick Action Buttons */}
          {result.isAnomalous && (
            <div className="mt-4 bg-white rounded-lg shadow-md p-6 border">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Quick Actions</h4>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                  Block Transaction
                </button>
                <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm">
                  Flag for Review
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                  Mark as Safe
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis Info */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Analysis Information</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• <strong>Risk Score:</strong> 0-24 (Low), 25-49 (Medium), 50-69 (High), 70+ (Critical)</li>
          <li>• <strong>Analyze Only:</strong> Shows risk assessment without creating alerts</li>
          <li>• <strong>Process:</strong> Creates alerts and anomaly records in database</li>
          <li>• <strong>Critical transactions:</strong> Automatically flagged for immediate review</li>
        </ul>
      </div>
    </div>
  );
};

export default TransactionAnalyzer;