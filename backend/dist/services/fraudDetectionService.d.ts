import { BillingTransaction, Anomaly, Alert } from '../lib/supabase';
export interface FraudDetectionResult {
    isAnomalous: boolean;
    riskScore: number;
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
    flags: string[];
    severity: 'critical' | 'high' | 'medium' | 'low';
    reason: string;
    preventativeAction: string;
    scoreBreakdown: ScoreBreakdown[];
    mlRiskScore?: number;
    confidence: number;
    primarySource: 'rules' | 'ml' | 'ensemble';
}
export interface ScoreBreakdown {
    rule: string;
    points: number;
    description: string;
}
export interface ValidationRule {
    name: string;
    description: string;
    check: (transaction: BillingTransaction) => Promise<boolean>;
    severity: 'critical' | 'high' | 'medium' | 'low';
    points: number;
}
export declare class FraudDetectionService {
    private static instance;
    private validationRules;
    private constructor();
    static getInstance(): FraudDetectionService;
    private initializeRules;
    analyzeTransaction(transaction: BillingTransaction): Promise<FraudDetectionResult>;
    private calculateRiskLevel;
    private getPreventativeAction;
    private getSeverityWeight;
    private checkDuplicateTransaction;
    private checkExcessiveAmount;
    private checkProcedureDiagnosisMatch;
    private checkProviderFrequency;
    private checkWeekendBilling;
    private checkUnusualTime;
    createAnomalyRecord(transaction: BillingTransaction, detectionResult: FraudDetectionResult): Promise<Anomaly | null>;
    createAlert(anomaly: Anomaly, detectionResult: FraudDetectionResult): Promise<Alert | null>;
    processTransaction(transaction: BillingTransaction): Promise<{
        anomaly: Anomaly | null;
        alert: Alert | null;
        detectionResult: FraudDetectionResult;
        shouldBlock: boolean;
    }>;
    private calculateEnsembleScore;
    private calculateConfidence;
    private determinePrimarySource;
    private generateEnhancedReason;
}
export declare const fraudDetectionService: FraudDetectionService;
//# sourceMappingURL=fraudDetectionService.d.ts.map