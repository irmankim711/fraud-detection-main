import { useState, useCallback } from 'react';
import { fraudDetectionService, FraudDetectionResult } from '../services/fraudDetectionService';
import { BillingTransaction } from '../lib/supabase';

export interface FraudDetectionState {
  isAnalyzing: boolean;
  result: FraudDetectionResult | null;
  error: string | null;
  lastAnalyzedTransaction: string | null;
}

export const useFraudDetection = () => {
  const [state, setState] = useState<FraudDetectionState>({
    isAnalyzing: false,
    result: null,
    error: null,
    lastAnalyzedTransaction: null
  });

  const analyzeTransaction = useCallback(async (transaction: BillingTransaction) => {
    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      error: null
    }));

    try {
      const result = await fraudDetectionService.analyzeTransaction(transaction);

      setState({
        isAnalyzing: false,
        result,
        error: null,
        lastAnalyzedTransaction: transaction.transaction_id
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      setState({
        isAnalyzing: false,
        result: null,
        error: errorMessage,
        lastAnalyzedTransaction: transaction.transaction_id
      });

      throw error;
    }
  }, []);

  const processTransaction = useCallback(async (transaction: BillingTransaction) => {
    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      error: null
    }));

    try {
      const processResult = await fraudDetectionService.processTransaction(transaction);

      setState({
        isAnalyzing: false,
        result: processResult.detectionResult,
        error: null,
        lastAnalyzedTransaction: transaction.transaction_id
      });

      return processResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      setState({
        isAnalyzing: false,
        result: null,
        error: errorMessage,
        lastAnalyzedTransaction: transaction.transaction_id
      });

      throw error;
    }
  }, []);

  const clearResult = useCallback(() => {
    setState({
      isAnalyzing: false,
      result: null,
      error: null,
      lastAnalyzedTransaction: null
    });
  }, []);

  return {
    ...state,
    analyzeTransaction,
    processTransaction,
    clearResult
  };
};