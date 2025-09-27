import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file and ensure SUPABASE_URL and SUPABASE_ANON_KEY are set."
  );
}

// Create Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Database Types
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
  status: "pending" | "investigating" | "resolved" | "false_positive";
  detected_at: string;
  billing_transactions?: BillingTransaction;
}

export interface Alert {
  id: string;
  anomaly_id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description?: string;
  is_resolved: boolean;
  created_at: string;
  anomalies?: Anomaly;
}

// Auth types
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
