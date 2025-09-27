import { supabase, BillingTransaction, Anomaly, Alert } from '../lib/supabase';

export interface FraudDetectionResult {
  isAnomalous: boolean;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  flags: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  preventativeAction: string;
  scoreBreakdown: ScoreBreakdown[];
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
    let totalRiskScore = 0;
    let maxSeverity: 'critical' | 'high' | 'medium' | 'low' = 'low';

    for (const rule of this.validationRules) {
      try {
        const isViolated = await rule.check(transaction);
        if (isViolated) {
          flags.push(rule.name);
          totalRiskScore += rule.points;

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

    // Cap risk score at 100
    totalRiskScore = Math.min(totalRiskScore, 100);

    // Determine risk level based on score
    const riskLevel = this.calculateRiskLevel(totalRiskScore);
    const preventativeAction = this.getPreventativeAction(riskLevel, flags);

    return {
      isAnomalous: flags.length > 0,
      riskScore: totalRiskScore,
      riskLevel,
      flags,
      severity: maxSeverity,
      reason: flags.length > 0 ?
        `Detected ${flags.length} anomaly flag(s): ${flags.join(', ')}` :
        'No anomalies detected',
      preventativeAction,
      scoreBreakdown
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
}

export const fraudDetectionService = FraudDetectionService.getInstance();