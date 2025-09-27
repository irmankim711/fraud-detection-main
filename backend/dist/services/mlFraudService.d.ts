import { BillingTransaction } from '../lib/supabase';
export interface MLPredictionResult {
    risk_score: number;
    suggested_action: string;
    message: string;
}
export declare class MLFraudService {
    private readonly ML_SERVICE_URL;
    private readonly TIMEOUT_MS;
    /**
     * Gets ML-based risk score for a billing transaction
     * Returns 0 if service is unavailable (graceful fallback)
     */
    getMlRiskScore(transaction: BillingTransaction): Promise<number>;
    /**
     * Gets detailed ML prediction with action recommendation
     */
    getMlPrediction(transaction: BillingTransaction): Promise<MLPredictionResult | null>;
    /**
     * Check if ML service is available
     */
    isServiceAvailable(): Promise<boolean>;
}
export declare const mlFraudService: MLFraudService;
//# sourceMappingURL=mlFraudService.d.ts.map