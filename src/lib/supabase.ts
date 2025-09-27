import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set.'
  );
}

// Create Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// ENUMS AND UNION TYPES
// ============================================================================

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AnomalyStatus = 'pending' | 'investigating' | 'resolved' | 'false_positive';
export type TransactionStatus = 'approved' | 'declined' | 'pending' | 'suspended';
export type FraudAlertType =
  | 'billing_anomaly'
  | 'procurement_fraud'
  | 'duplicate_claims'
  | 'provider_fraud'
  | 'phantom_billing'
  | 'upcoding'
  | 'unbundling';
export type SystemHealthStatus = 'excellent' | 'good' | 'warning' | 'critical';
export type UserRole = 'admin' | 'analyst' | 'investigator' | 'viewer';

// ============================================================================
// ENHANCED DATABASE TYPES
// ============================================================================

// Users table (enhanced)
export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// Providers table
export interface Provider {
  id: string;
  provider_id: string;
  name: string;
  specialty?: string;
  license_number?: string;
  address?: any; // JSONB
  contact_info?: any; // JSONB
  risk_score: number;
  is_flagged: boolean;
  registration_date?: string;
  created_at: string;
  updated_at: string;
}

// Patients table
export interface Patient {
  id: string;
  patient_id: string;
  date_of_birth?: string;
  gender?: string;
  insurance_info?: any; // JSONB
  medical_history?: any; // JSONB
  risk_indicators?: any; // JSONB
  created_at: string;
  updated_at: string;
}

// Medical codes table
export interface MedicalCode {
  id: string;
  code_type: string; // 'ICD-10', 'CPT', 'HCPCS'
  code: string;
  description: string;
  category?: string;
  typical_cost_range?: string; // PostgreSQL NUMRANGE as string
  is_high_risk: boolean;
  created_at: string;
}

// Enhanced billing transactions
export interface BillingTransaction {
  id: string;
  transaction_id: string;
  provider_id: string;
  patient_id?: string;
  amount: number;
  currency: string;
  transaction_date: string;
  service_date?: string;
  procedure_code?: string;
  diagnosis_code?: string;
  claim_number?: string;
  status: TransactionStatus;
  risk_score: number;
  raw_data?: any; // JSONB
  metadata?: any; // JSONB
  created_at: string;
  updated_at: string;
  // Relations
  provider?: Provider;
  patient?: Patient;
}

// Transaction items (line items)
export interface TransactionItem {
  id: string;
  transaction_id: string;
  procedure_code?: string;
  diagnosis_code?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  modifier_codes?: string;
  created_at: string;
  // Relations
  billing_transaction?: BillingTransaction;
}

// Enhanced anomalies
export interface Anomaly {
  id: string;
  transaction_id: string;
  anomaly_type: string;
  risk_score: number;
  confidence: number;
  ai_model_version?: string;
  model_features?: any; // JSONB
  gemini_summary?: string;
  detailed_analysis?: any; // JSONB
  status: AnomalyStatus;
  detected_at: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  billing_transaction?: BillingTransaction;
}

// Enhanced alerts
export interface Alert {
  id: string;
  anomaly_id: string;
  alert_type: FraudAlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  estimated_loss: number;
  urgency_level?: number; // 1-5
  ai_recommendation?: string;
  assigned_to?: string;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  anomaly?: Anomaly;
  assigned_user?: User;
  resolver?: User;
}

// ============================================================================
// METRICS AND MONITORING TYPES
// ============================================================================

// Real-time metrics snapshots
export interface MetricsSnapshot {
  id: string;
  snapshot_date: string;
  total_claims: number;
  fraudulent_detected: number;
  accuracy_rate: number;
  alerts_today: number;
  total_financial_impact: number;
  prevented_losses: number;
  avg_processing_time: number;
  system_health: SystemHealthStatus;
  created_at: string;
}

// Pricing insights
export interface PricingInsight {
  id: string;
  category: string;
  procedure_codes: string[]; // Array of procedure codes
  average_claim_amount: number;
  suspicious_claim_amount: number;
  variance_percentage: number;
  flagged_claims_count: number;
  potential_savings: number;
  analysis_date: string;
  created_at: string;
}

// System metrics
export interface SystemMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  recorded_at: string;
}

// ============================================================================
// INVESTIGATION AND AUDIT TYPES
// ============================================================================

// Investigation cases
export interface InvestigationCase {
  id: string;
  case_number: string;
  title: string;
  description?: string;
  severity: AlertSeverity;
  status: string; // 'open', 'investigating', 'closed'
  assigned_investigator?: string;
  estimated_loss: number;
  actual_loss: number;
  related_alerts: string[]; // Array of alert IDs
  evidence?: any; // JSONB
  findings?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  // Relations
  investigator?: User;
}

// Audit logs
export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  table_name?: string;
  record_id?: string;
  old_values?: any; // JSONB
  new_values?: any; // JSONB
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  // Relations
  user?: User;
}

// Provider risk assessments
export interface ProviderRiskAssessment {
  id: string;
  provider_id: string;
  assessment_date: string;
  risk_score: number;
  risk_factors?: any; // JSONB
  claims_volume_30d: number;
  claims_volume_variance: number;
  average_claim_amount: number;
  flags?: any; // JSONB
  reviewer_id?: string;
  created_at: string;
  // Relations
  provider?: Provider;
  reviewer?: User;
}

// ============================================================================
// VIEW TYPES (for dashboard queries)
// ============================================================================

// Fraud dashboard summary view
export interface FraudDashboardSummary {
  report_date: string;
  total_claims_today: number;
  high_risk_claims: number;
  anomalies_detected: number;
  alerts_generated: number;
  critical_alerts: number;
  potential_fraud_amount: number;
  avg_risk_score: number;
}

// Provider risk analysis view
export interface ProviderRiskAnalysis {
  id: string;
  provider_id: string;
  name: string;
  specialty?: string;
  risk_score: number;
  total_claims_30d: number;
  avg_claim_amount: number;
  total_claim_amount: number;
  high_risk_claims: number;
  anomalies_count: number;
  alerts_count: number;
}

// Active critical alerts view
export interface ActiveCriticalAlert {
  id: string;
  alert_type: FraudAlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  estimated_loss: number;
  urgency_level?: number;
  ai_recommendation?: string;
  created_at: string;
  transaction_id: string;
  amount: number;
  provider_id: string;
  provider_name: string;
  risk_score: number;
  confidence: number;
}

// ============================================================================
// DASHBOARD DATA TYPES (matching mock data structure)
// ============================================================================

// Real-time metrics for dashboard (compatible with existing mock data)
export interface RealTimeMetrics {
  totalClaims: number;
  fraudulentDetected: number;
  accuracyRate: number;
  alertsToday: number;
  totalFinancialImpact: number;
  preventedLosses: number;
  avgProcessingTime: number;
  systemHealth: SystemHealthStatus;
  lastUpdated: string;
}

// Fraud alert for dashboard (compatible with existing mock data)
export interface FraudAlert {
  id: string;
  type: FraudAlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: string;
  claimId?: string;
  providerId?: string;
  patientId?: string;
  estimatedLoss: number;
  confidence: number;
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  aiRecommendation: string;
  urgencyLevel: 1 | 2 | 3 | 4 | 5;
}

// Transaction for table view (compatible with existing mock data)
export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  merchant: string;
  timestamp: string;
  status: TransactionStatus;
  riskScore: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface AuthSession {
  user: User | null;
  access_token?: string;
  refresh_token?: string;
}

export interface UserPermissions {
  canViewDashboard: boolean;
  canManageUsers: boolean;
  canInvestigateFraud: boolean;
  canModifyData: boolean;
  canViewSensitiveData: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Helper function to transform database metrics to dashboard format
export const transformMetricsForDashboard = (snapshot: MetricsSnapshot): RealTimeMetrics => ({
  totalClaims: snapshot.total_claims,
  fraudulentDetected: snapshot.fraudulent_detected,
  accuracyRate: snapshot.accuracy_rate,
  alertsToday: snapshot.alerts_today,
  totalFinancialImpact: snapshot.total_financial_impact,
  preventedLosses: snapshot.prevented_losses,
  avgProcessingTime: snapshot.avg_processing_time,
  systemHealth: snapshot.system_health,
  lastUpdated: snapshot.created_at
});

// Helper function to transform active alerts for dashboard
export const transformAlertsForDashboard = (alerts: ActiveCriticalAlert[]): FraudAlert[] =>
  alerts.map(alert => ({
    id: alert.id,
    type: alert.alert_type,
    severity: alert.severity,
    title: alert.title,
    description: alert.description || '',
    timestamp: alert.created_at,
    claimId: alert.transaction_id,
    providerId: alert.provider_id,
    estimatedLoss: alert.estimated_loss,
    confidence: alert.confidence,
    status: 'active' as const, // Default to active for dashboard
    aiRecommendation: alert.ai_recommendation || '',
    urgencyLevel: (alert.urgency_level || 3) as 1 | 2 | 3 | 4 | 5
  }));

// Helper function to transform billing transactions for transaction table
export const transformTransactionsForTable = (transactions: BillingTransaction[]): Transaction[] =>
  transactions.map(tx => ({
    id: tx.transaction_id,
    amount: tx.amount,
    currency: tx.currency,
    merchant: tx.provider?.name || 'Healthcare Provider',
    timestamp: tx.transaction_date,
    status: tx.status,
    riskScore: tx.risk_score
  }));