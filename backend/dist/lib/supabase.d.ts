import { SupabaseClient } from '@supabase/supabase-js';
export declare const supabase: SupabaseClient;
export interface BillingTransaction {
    id: string;
    transaction_id: string;
    provider_id: string;
    amount: number;
    transaction_date: string;
    patient_id?: string;
    procedure_code?: string;
    diagnosis_code?: string;
    raw_data?: any;
    created_at: string;
}
export interface Anomaly {
    id: string;
    transaction_id: string;
    anomaly_type: string;
    risk_score: number;
    confidence: number;
    ai_model_version?: string;
    gemini_summary?: string;
    status: 'pending' | 'investigating' | 'resolved' | 'false_positive';
    detected_at: string;
    billing_transactions?: BillingTransaction;
}
export interface Alert {
    id: string;
    anomaly_id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description?: string;
    is_resolved: boolean;
    created_at: string;
    anomalies?: Anomaly;
}
export interface User {
    id: string;
    email: string;
    created_at: string;
}
export interface AuthSession {
    user: User | null;
    access_token?: string;
    refresh_token?: string;
}
//# sourceMappingURL=supabase.d.ts.map