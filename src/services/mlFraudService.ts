import { BillingTransaction } from '../lib/supabase';

export interface MLPredictionResult {
  risk_score: number;
  suggested_action: string;
  message: string;
}

export class MLFraudService {
  private readonly ML_SERVICE_URL = 'http://localhost:8001';
  private readonly TIMEOUT_MS = 5000; // 5 second timeout

  /**
   * Gets ML-based risk score for a billing transaction
   * Returns 0 if service is unavailable (graceful fallback)
   */
  public async getMlRiskScore(transaction: BillingTransaction): Promise<number> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(`${this.ML_SERVICE_URL}/api/fraud-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          transaction_id: transaction.transaction_id,
          provider_id: transaction.provider_id,
          amount: transaction.amount,
          transaction_date: transaction.transaction_date,
          patient_id: transaction.patient_id || '',
          procedure_code: transaction.procedure_code || '',
          diagnosis_code: transaction.diagnosis_code || ''
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`ML service returned ${response.status}: ${response.statusText}`);
        return 0; // Fallback value
      }

      const result: MLPredictionResult = await response.json();

      // Convert 0-1 ML score to 0-100 scale to match rule-based scoring
      return Math.min(Math.max(result.risk_score * 100, 0), 100);

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn('ML service request timed out, falling back to rules only');
        } else {
          console.warn('ML service unavailable:', error.message);
        }
      }
      return 0; // Graceful fallback - let rule-based system handle everything
    }
  }

  /**
   * Gets detailed ML prediction with action recommendation
   */
  public async getMlPrediction(transaction: BillingTransaction): Promise<MLPredictionResult | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(`${this.ML_SERVICE_URL}/api/fraud-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          transaction_id: transaction.transaction_id,
          provider_id: transaction.provider_id,
          amount: transaction.amount,
          transaction_date: transaction.transaction_date,
          patient_id: transaction.patient_id || '',
          procedure_code: transaction.procedure_code || '',
          diagnosis_code: transaction.diagnosis_code || ''
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      return await response.json();

    } catch (error) {
      console.warn('ML prediction service error:', error);
      return null;
    }
  }

  /**
   * Check if ML service is available
   */
  public async isServiceAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout for health check

      const response = await fetch(`${this.ML_SERVICE_URL}/docs`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;

    } catch (error) {
      return false;
    }
  }
}

export const mlFraudService = new MLFraudService();