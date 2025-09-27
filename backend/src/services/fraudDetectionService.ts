import { supabase, BillingTransaction, Anomaly, Alert } from '../lib/supabase';
import { mlFraudService } from './mlFraudService';

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

export class FraudDetectionService {
  private static instance: FraudDetectionService;
  private validationRules: ValidationRule[] = [];

  private constructor() {
    this.initializeRules();
  }

  public static getInstance(): FraudDetectionService {
    if (!FraudDetectionService.instance) {
      FraudDetectionService.instance = new FraudDetectionService();
    }
    return FraudDetectionService.instance;
  }

  private initializeRules(): void {
    this.validationRules = [
      {
        name: 'duplicate_transaction',
        description: 'Duplicate billing within 24 hours',
        severity: 'critical',
        points: 35,
        check: this.checkDuplicateTransaction.bind(this)
      },
      {
        name: 'excessive_amount',
        description: 'Amount exceeds procedure threshold',
        severity: 'critical',
        points: 30,
        check: this.checkExcessiveAmount.bind(this)
      },
      {
        name: 'invalid_procedure_diagnosis',
        description: 'Incompatible procedure-diagnosis combination',
        severity: 'high',
        points: 25,
        check: this.checkProcedureDiagnosisMatch.bind(this)
      },
      {
        name: 'provider_frequency',
        description: 'Excessive billing frequency by provider',
        severity: 'high',
        points: 20,
        check: this.checkProviderFrequency.bind(this)
      },
      {
        name: 'weekend_billing',
        description: 'Non-emergency procedure billed on weekend',
        severity: 'medium',
        points: 10,
        check: this.checkWeekendBilling.bind(this)
      },
      {
        name: 'unusual_time',
        description: 'Billing outside normal business hours',
        severity: 'low',
        points: 5,
        check: this.checkUnusualTime.bind(this)
      }
    ];
  }

  public async analyzeTransaction(transaction: BillingTransaction): Promise<FraudDetectionResult> {
    const flags: string[] = [];
    const scoreBreakdown: ScoreBreakdown[] = [];
    let ruleBasedScore = 0;
    let maxSeverity: 'critical' | 'high' | 'medium' | 'low' = 'low';

    // Step 1: Rule-based analysis (existing logic)
    for (const rule of this.validationRules) {
      try {
        const isViolated = await rule.check(transaction);
        if (isViolated) {
          flags.push(rule.name);
          ruleBasedScore += rule.points;

          scoreBreakdown.push({
            rule: rule.name,
            points: rule.points,
            description: rule.description
          });

          if (this.getSeverityWeight(rule.severity) > this.getSeverityWeight(maxSeverity)) {
            maxSeverity = rule.severity;
          }
        }
      } catch (error) {
        console.error(`Error in rule ${rule.name}:`, error);
      }
    }

    // Cap rule-based score at 100
    ruleBasedScore = Math.min(ruleBasedScore, 100);

    // Step 2: ML-based analysis (parallel execution)
    const mlRiskScore = await mlFraudService.getMlRiskScore(transaction);

    // Step 3: Ensemble scoring (70% rules + 30% ML)
    const ensembleScore = this.calculateEnsembleScore(ruleBasedScore, mlRiskScore);
    const confidence = this.calculateConfidence(ruleBasedScore, mlRiskScore);
    const primarySource = this.determinePrimarySource(ruleBasedScore, mlRiskScore);

    // Add ML score to breakdown if available
    if (mlRiskScore > 0) {
      scoreBreakdown.push({
        rule: 'ml_risk_assessment',
        points: Math.round(mlRiskScore * 0.3), // Show ML contribution (30% weight)
        description: `Machine Learning risk assessment (${mlRiskScore.toFixed(1)}/100)`
      });
    }

    // Determine risk level based on ensemble score
    const riskLevel = this.calculateRiskLevel(ensembleScore);
    const preventativeAction = this.getPreventativeAction(riskLevel, flags);

    // Enhanced reason with ML context
    const reason = this.generateEnhancedReason(flags, ruleBasedScore, mlRiskScore, primarySource);

    return {
      isAnomalous: flags.length > 0 || ensembleScore >= 25,
      riskScore: ensembleScore,
      riskLevel,
      flags,
      severity: maxSeverity,
      reason,
      preventativeAction,
      scoreBreakdown,
      mlRiskScore,
      confidence,
      primarySource
    };
  }

  private calculateRiskLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  private getPreventativeAction(level: string, flags: string[]): string {
    switch (level) {
      case 'critical':
        return 'IMMEDIATE ACTION: Suspend transaction and require manual review before processing';
      case 'high':
        return 'HOLD FOR REVIEW: Flag for priority investigation within 24 hours';
      case 'medium':
        return 'MONITOR: Add to watch list and review within 48 hours';
      case 'low':
        return 'LOG ONLY: Record for pattern analysis, process normally';
      default:
        return 'Process normally';
    }
  }

  private getSeverityWeight(severity: string): number {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    return weights[severity as keyof typeof weights] || 1;
  }

  // Enhanced validation rules
  private async checkDuplicateTransaction(transaction: BillingTransaction): Promise<boolean> {
    const { data, error } = await supabase
      .from('billing_transactions')
      .select('id')
      .eq('provider_id', transaction.provider_id)
      .eq('amount', transaction.amount)
      .eq('procedure_code', transaction.procedure_code)
      .eq('patient_id', transaction.patient_id)
      .gte('transaction_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .neq('id', transaction.id);

    return !error && (data?.length || 0) > 0;
  }

  private async checkExcessiveAmount(transaction: BillingTransaction): Promise<boolean> {
    const amountThresholds: { [key: string]: number } = {
      '99213': 500,   // Office visit
      '99214': 750,   // Office visit
      '99215': 1000,  // Office visit
      '90834': 300,   // Psychotherapy
      '90837': 400,   // Psychotherapy
      '99291': 2000,  // Critical care
      'default': 5000
    };

    const threshold = amountThresholds[transaction.procedure_code || 'default'] || amountThresholds.default;
    return transaction.amount > threshold;
  }

  private async checkProcedureDiagnosisMatch(transaction: BillingTransaction): Promise<boolean> {
    if (!transaction.procedure_code || !transaction.diagnosis_code) {
      return false;
    }

    const incompatibleCombinations = [
      { procedure: '90834', diagnosis: 'Z00.00' },
      { procedure: '99213', diagnosis: 'O80' },
      { procedure: '99291', diagnosis: 'Z01.411' },
    ];

    return incompatibleCombinations.some(combo =>
      combo.procedure === transaction.procedure_code &&
      combo.diagnosis === transaction.diagnosis_code
    );
  }

  private async checkProviderFrequency(transaction: BillingTransaction): Promise<boolean> {
    const { data, error } = await supabase
      .from('billing_transactions')
      .select('id')
      .eq('provider_id', transaction.provider_id)
      .gte('transaction_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return !error && (data?.length || 0) > 50;
  }

  private async checkWeekendBilling(transaction: BillingTransaction): Promise<boolean> {
    const transactionDate = new Date(transaction.transaction_date);
    const dayOfWeek = transactionDate.getDay();

    const weekendSensitiveProcedures = ['99213', '99214', '99215'];

    return (dayOfWeek === 0 || dayOfWeek === 6) &&
           weekendSensitiveProcedures.includes(transaction.procedure_code || '');
  }

  private async checkUnusualTime(transaction: BillingTransaction): Promise<boolean> {
    const transactionDate = new Date(transaction.transaction_date);
    const hour = transactionDate.getHours();

    // Flag transactions outside 6 AM - 10 PM
    return hour < 6 || hour > 22;
  }

  public async createAnomalyRecord(
    transaction: BillingTransaction,
    detectionResult: FraudDetectionResult
  ): Promise<Anomaly | null> {
    if (!detectionResult.isAnomalous) {
      return null;
    }

    const { data, error } = await supabase
      .from('anomalies')
      .insert({
        transaction_id: transaction.transaction_id,
        anomaly_type: detectionResult.flags.join(','),
        risk_score: detectionResult.riskScore,
        confidence: Math.min(detectionResult.riskScore / 100, 1),
        status: detectionResult.riskLevel === 'critical' ? 'investigating' : 'pending',
        detected_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating anomaly record:', error);
      return null;
    }

    return data;
  }

  public async createAlert(anomaly: Anomaly, detectionResult: FraudDetectionResult): Promise<Alert | null> {
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        anomaly_id: anomaly.id,
        severity: detectionResult.riskLevel,
        title: `${detectionResult.riskLevel.toUpperCase()} Risk Transaction (Score: ${detectionResult.riskScore})`,
        description: `${detectionResult.reason}\n\nAction: ${detectionResult.preventativeAction}`,
        is_resolved: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      return null;
    }

    return data;
  }

  public async processTransaction(transaction: BillingTransaction): Promise<{
    anomaly: Anomaly | null;
    alert: Alert | null;
    detectionResult: FraudDetectionResult;
    shouldBlock: boolean;
  }> {
    const detectionResult = await this.analyzeTransaction(transaction);
    const shouldBlock = detectionResult.riskLevel === 'critical';

    let anomaly: Anomaly | null = null;
    let alert: Alert | null = null;

    if (detectionResult.isAnomalous) {
      anomaly = await this.createAnomalyRecord(transaction, detectionResult);
      if (anomaly) {
        alert = await this.createAlert(anomaly, detectionResult);
      }
    }

    return { anomaly, alert, detectionResult, shouldBlock };
  }

  // New ensemble scoring methods
  private calculateEnsembleScore(ruleBasedScore: number, mlRiskScore: number): number {
    // Weighted average: 70% rules + 30% ML
    const RULE_WEIGHT = 0.7;
    const ML_WEIGHT = 0.3;

    const ensembleScore = (ruleBasedScore * RULE_WEIGHT) + (mlRiskScore * ML_WEIGHT);
    return Math.min(Math.round(ensembleScore), 100);
  }

  private calculateConfidence(ruleBasedScore: number, mlRiskScore: number): number {
    // Confidence is higher when both systems agree
    if (mlRiskScore === 0) {
      // Only rule-based system available
      return ruleBasedScore > 0 ? 0.8 : 0.9;
    }

    const scoreDifference = Math.abs(ruleBasedScore - mlRiskScore);
    const maxPossibleDifference = 100;
    const agreement = 1 - (scoreDifference / maxPossibleDifference);

    // Base confidence + agreement bonus
    return Math.min(0.6 + (agreement * 0.4), 1.0);
  }

  private determinePrimarySource(ruleBasedScore: number, mlRiskScore: number): 'rules' | 'ml' | 'ensemble' {
    if (mlRiskScore === 0) {
      return 'rules'; // ML service unavailable
    }

    const scoreDifference = Math.abs(ruleBasedScore - mlRiskScore);

    if (scoreDifference <= 15) {
      return 'ensemble'; // Both systems generally agree
    } else if (ruleBasedScore > mlRiskScore) {
      return 'rules'; // Rules detected more risk
    } else {
      return 'ml'; // ML detected more risk
    }
  }

  private generateEnhancedReason(flags: string[], ruleBasedScore: number, mlRiskScore: number, primarySource: string): string {
    const ruleCount = flags.length;

    if (ruleCount === 0 && mlRiskScore <= 25) {
      return 'No significant anomalies detected by rules or ML analysis';
    }

    let reason = '';

    if (ruleCount > 0) {
      reason = `Detected ${ruleCount} rule violation(s): ${flags.join(', ')}`;
    }

    if (mlRiskScore > 0) {
      const mlRisk = mlRiskScore > 50 ? 'HIGH' : mlRiskScore > 25 ? 'MEDIUM' : 'LOW';
      const mlPart = `ML risk assessment: ${mlRisk} (${mlRiskScore.toFixed(1)}/100)`;

      reason = reason ? `${reason}. ${mlPart}` : mlPart;
    }

    // Add ensemble context
    if (primarySource === 'ensemble') {
      reason += '. Both systems in agreement';
    } else if (primarySource === 'ml') {
      reason += '. ML detected higher risk than rules';
    } else if (primarySource === 'rules') {
      reason += '. Rule-based analysis primary indicator';
    }

    return reason;
  }
}

export const fraudDetectionService = FraudDetectionService.getInstance();