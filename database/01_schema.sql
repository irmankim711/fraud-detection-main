-- ============================================================================
-- Fraud Detection Application - PostgreSQL Schema for Supabase
-- ============================================================================
-- This schema supports healthcare fraud detection with real-time monitoring,
-- AI-powered anomaly detection, and comprehensive audit trails.
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS AND CUSTOM TYPES
-- ============================================================================

-- Alert severity levels
CREATE TYPE alert_severity AS ENUM ('critical', 'high', 'medium', 'low');

-- Anomaly status types
CREATE TYPE anomaly_status AS ENUM ('pending', 'investigating', 'resolved', 'false_positive');

-- Transaction status types
CREATE TYPE transaction_status AS ENUM ('approved', 'declined', 'pending', 'suspended');

-- Fraud alert types
CREATE TYPE fraud_alert_type AS ENUM (
    'billing_anomaly',
    'procurement_fraud',
    'duplicate_claims',
    'provider_fraud',
    'phantom_billing',
    'upcoding',
    'unbundling'
);

-- System health status
CREATE TYPE system_health_status AS ENUM ('excellent', 'good', 'warning', 'critical');

-- User roles for access control
CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'investigator', 'viewer');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role user_role DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Healthcare providers
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id VARCHAR(50) NOT NULL UNIQUE, -- External provider ID
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255),
    license_number VARCHAR(100),
    address JSONB, -- Flexible address storage
    contact_info JSONB, -- Phone, email, etc.
    risk_score DECIMAL(5,2) DEFAULT 0.00,
    is_flagged BOOLEAN DEFAULT false,
    registration_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id VARCHAR(50) NOT NULL UNIQUE, -- External patient ID
    date_of_birth DATE,
    gender VARCHAR(10),
    insurance_info JSONB, -- Insurance details
    medical_history JSONB, -- Relevant medical history
    risk_indicators JSONB, -- Fraud risk indicators
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical procedures and diagnosis codes
CREATE TABLE medical_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_type VARCHAR(20) NOT NULL, -- 'ICD-10', 'CPT', 'HCPCS'
    code VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    typical_cost_range NUMRANGE, -- Cost range for anomaly detection
    is_high_risk BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(code_type, code)
);

-- Billing transactions (enhanced from existing)
CREATE TABLE billing_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    provider_id UUID NOT NULL REFERENCES providers(id),
    patient_id UUID REFERENCES patients(id),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    transaction_date TIMESTAMPTZ NOT NULL,
    service_date DATE, -- When the service was actually provided
    procedure_code VARCHAR(20),
    diagnosis_code VARCHAR(20),
    claim_number VARCHAR(100),
    status transaction_status DEFAULT 'pending',
    risk_score DECIMAL(5,2) DEFAULT 0.00,
    raw_data JSONB, -- Original claim data
    metadata JSONB, -- Additional transaction metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction items (line items for each billing transaction)
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES billing_transactions(id) ON DELETE CASCADE,
    procedure_code VARCHAR(20),
    diagnosis_code VARCHAR(20),
    quantity INTEGER DEFAULT 1,
    unit_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    modifier_codes VARCHAR(50), -- Procedure modifiers
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anomalies (enhanced from existing)
CREATE TABLE anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES billing_transactions(id),
    anomaly_type VARCHAR(100) NOT NULL,
    risk_score DECIMAL(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 10),
    confidence DECIMAL(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    ai_model_version VARCHAR(50),
    model_features JSONB, -- Features used by AI model
    gemini_summary TEXT,
    detailed_analysis JSONB, -- Detailed AI analysis
    status anomaly_status DEFAULT 'pending',
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts (enhanced from existing)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anomaly_id UUID NOT NULL REFERENCES anomalies(id),
    alert_type fraud_alert_type NOT NULL,
    severity alert_severity NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_loss DECIMAL(12,2) DEFAULT 0.00,
    urgency_level INTEGER CHECK (urgency_level >= 1 AND urgency_level <= 5),
    ai_recommendation TEXT,
    assigned_to UUID REFERENCES users(id),
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- METRICS AND MONITORING TABLES
-- ============================================================================

-- Real-time metrics snapshots
CREATE TABLE metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE NOT NULL,
    total_claims INTEGER DEFAULT 0,
    fraudulent_detected INTEGER DEFAULT 0,
    accuracy_rate DECIMAL(5,2) DEFAULT 0.00,
    alerts_today INTEGER DEFAULT 0,
    total_financial_impact DECIMAL(15,2) DEFAULT 0.00,
    prevented_losses DECIMAL(15,2) DEFAULT 0.00,
    avg_processing_time DECIMAL(8,2) DEFAULT 0.00, -- in seconds
    system_health system_health_status DEFAULT 'good',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(snapshot_date)
);

-- Pricing insights for cost variance analysis
CREATE TABLE pricing_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    procedure_codes TEXT[], -- Array of related procedure codes
    average_claim_amount DECIMAL(12,2) NOT NULL,
    suspicious_claim_amount DECIMAL(12,2) NOT NULL,
    variance_percentage DECIMAL(8,2) NOT NULL,
    flagged_claims_count INTEGER DEFAULT 0,
    potential_savings DECIMAL(12,2) DEFAULT 0.00,
    analysis_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System performance metrics
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20), -- 'seconds', 'percentage', 'count', etc.
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIT AND LOGGING TABLES
-- ============================================================================

-- Investigation cases
CREATE TABLE investigation_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity alert_severity NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- open, investigating, closed
    assigned_investigator UUID REFERENCES users(id),
    estimated_loss DECIMAL(12,2) DEFAULT 0.00,
    actual_loss DECIMAL(12,2) DEFAULT 0.00,
    related_alerts UUID[], -- Array of alert IDs
    evidence JSONB, -- Collected evidence
    findings TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- Audit trail for all significant actions
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provider risk assessments
CREATE TABLE provider_risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(id),
    assessment_date DATE NOT NULL,
    risk_score DECIMAL(5,2) NOT NULL,
    risk_factors JSONB, -- Detailed risk analysis
    claims_volume_30d INTEGER DEFAULT 0,
    claims_volume_variance DECIMAL(8,2) DEFAULT 0.00,
    average_claim_amount DECIMAL(12,2) DEFAULT 0.00,
    flags JSONB, -- Various risk flags
    reviewer_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Billing transactions indexes
CREATE INDEX idx_billing_transactions_provider_id ON billing_transactions(provider_id);
CREATE INDEX idx_billing_transactions_patient_id ON billing_transactions(patient_id);
CREATE INDEX idx_billing_transactions_date ON billing_transactions(transaction_date);
CREATE INDEX idx_billing_transactions_status ON billing_transactions(status);
CREATE INDEX idx_billing_transactions_risk_score ON billing_transactions(risk_score DESC);
CREATE INDEX idx_billing_transactions_amount ON billing_transactions(amount DESC);

-- Composite indexes for common queries
CREATE INDEX idx_billing_transactions_provider_date ON billing_transactions(provider_id, transaction_date);
CREATE INDEX idx_billing_transactions_status_date ON billing_transactions(status, transaction_date);

-- Anomalies indexes
CREATE INDEX idx_anomalies_transaction_id ON anomalies(transaction_id);
CREATE INDEX idx_anomalies_status ON anomalies(status);
CREATE INDEX idx_anomalies_risk_score ON anomalies(risk_score DESC);
CREATE INDEX idx_anomalies_detected_at ON anomalies(detected_at);

-- Alerts indexes
CREATE INDEX idx_alerts_anomaly_id ON alerts(anomaly_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_resolved ON alerts(is_resolved);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_alerts_assigned_to ON alerts(assigned_to);

-- Composite index for alert dashboard queries
CREATE INDEX idx_alerts_severity_created ON alerts(severity, created_at) WHERE is_resolved = false;

-- Providers indexes
CREATE INDEX idx_providers_risk_score ON providers(risk_score DESC);
CREATE INDEX idx_providers_flagged ON providers(is_flagged);

-- Patients indexes
CREATE INDEX idx_patients_patient_id ON patients(patient_id);

-- Medical codes indexes
CREATE INDEX idx_medical_codes_type_code ON medical_codes(code_type, code);
CREATE INDEX idx_medical_codes_high_risk ON medical_codes(is_high_risk);

-- Metrics and monitoring indexes
CREATE INDEX idx_metrics_snapshots_date ON metrics_snapshots(snapshot_date);
CREATE INDEX idx_pricing_insights_category ON pricing_insights(category);
CREATE INDEX idx_pricing_insights_date ON pricing_insights(analysis_date);
CREATE INDEX idx_system_metrics_name_recorded ON system_metrics(metric_name, recorded_at);

-- Audit and investigation indexes
CREATE INDEX idx_investigation_cases_status ON investigation_cases(status);
CREATE INDEX idx_investigation_cases_investigator ON investigation_cases(assigned_investigator);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_provider_risk_assessments_provider_date ON provider_risk_assessments(provider_id, assessment_date);

-- Full-text search indexes
CREATE INDEX idx_alerts_title_description_fts ON alerts USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_providers_name_fts ON providers USING gin(to_tsvector('english', name));

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_transactions_updated_at BEFORE UPDATE ON billing_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_anomalies_updated_at BEFORE UPDATE ON anomalies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investigation_cases_updated_at BEFORE UPDATE ON investigation_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically calculate risk scores
CREATE OR REPLACE FUNCTION calculate_transaction_risk_score(
    p_amount DECIMAL,
    p_provider_id UUID,
    p_procedure_code VARCHAR,
    p_diagnosis_code VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
    risk_score DECIMAL := 0.0;
    provider_risk DECIMAL;
    amount_risk DECIMAL;
    code_risk DECIMAL;
BEGIN
    -- Get provider risk score
    SELECT COALESCE(p.risk_score, 0) INTO provider_risk
    FROM providers p WHERE p.id = p_provider_id;

    -- Calculate amount-based risk (simplified logic)
    CASE
        WHEN p_amount > 10000 THEN amount_risk := 3.0;
        WHEN p_amount > 5000 THEN amount_risk := 2.0;
        WHEN p_amount > 1000 THEN amount_risk := 1.0;
        ELSE amount_risk := 0.5;
    END CASE;

    -- Check if procedure/diagnosis codes are high-risk
    SELECT CASE WHEN COUNT(*) > 0 THEN 2.0 ELSE 0.0 END INTO code_risk
    FROM medical_codes mc
    WHERE mc.code IN (p_procedure_code, p_diagnosis_code)
    AND mc.is_high_risk = true;

    -- Combine risk factors (weighted average)
    risk_score := (provider_risk * 0.4) + (amount_risk * 0.3) + (code_risk * 0.3);

    -- Ensure risk score is within valid range
    RETURN LEAST(GREATEST(risk_score, 0.0), 10.0);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate risk score on billing transaction insert/update
CREATE OR REPLACE FUNCTION auto_calculate_risk_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.risk_score := calculate_transaction_risk_score(
        NEW.amount,
        NEW.provider_id,
        NEW.procedure_code,
        NEW.diagnosis_code
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER billing_transactions_risk_score_trigger
    BEFORE INSERT OR UPDATE ON billing_transactions
    FOR EACH ROW EXECUTE FUNCTION auto_calculate_risk_score();

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        created_at
    ) VALUES (
        auth.uid(), -- Supabase function to get current user
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_billing_transactions AFTER INSERT OR UPDATE OR DELETE ON billing_transactions FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_anomalies AFTER INSERT OR UPDATE OR DELETE ON anomalies FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_alerts AFTER INSERT OR UPDATE OR DELETE ON alerts FOR EACH ROW EXECUTE FUNCTION create_audit_log();
CREATE TRIGGER audit_investigation_cases AFTER INSERT OR UPDATE OR DELETE ON investigation_cases FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for fraud detection dashboard
CREATE OR REPLACE VIEW fraud_dashboard_summary AS
SELECT
    DATE(NOW()) as report_date,
    COUNT(*) as total_claims_today,
    COUNT(*) FILTER (WHERE bt.risk_score >= 7.0) as high_risk_claims,
    COUNT(DISTINCT a.id) as anomalies_detected,
    COUNT(DISTINCT al.id) as alerts_generated,
    COUNT(DISTINCT al.id) FILTER (WHERE al.severity = 'critical') as critical_alerts,
    COALESCE(SUM(bt.amount) FILTER (WHERE bt.risk_score >= 7.0), 0) as potential_fraud_amount,
    AVG(bt.risk_score) as avg_risk_score
FROM billing_transactions bt
LEFT JOIN anomalies a ON bt.id = a.transaction_id AND DATE(a.detected_at) = DATE(NOW())
LEFT JOIN alerts al ON a.id = al.anomaly_id AND DATE(al.created_at) = DATE(NOW())
WHERE DATE(bt.transaction_date) = DATE(NOW());

-- View for provider risk analysis
CREATE OR REPLACE VIEW provider_risk_analysis AS
SELECT
    p.id,
    p.provider_id,
    p.name,
    p.specialty,
    p.risk_score,
    COUNT(bt.id) as total_claims_30d,
    AVG(bt.amount) as avg_claim_amount,
    SUM(bt.amount) as total_claim_amount,
    COUNT(*) FILTER (WHERE bt.risk_score >= 7.0) as high_risk_claims,
    COUNT(DISTINCT a.id) as anomalies_count,
    COUNT(DISTINCT al.id) as alerts_count
FROM providers p
LEFT JOIN billing_transactions bt ON p.id = bt.provider_id
    AND bt.transaction_date >= NOW() - INTERVAL '30 days'
LEFT JOIN anomalies a ON bt.id = a.transaction_id
LEFT JOIN alerts al ON a.id = al.anomaly_id
GROUP BY p.id, p.provider_id, p.name, p.specialty, p.risk_score;

-- View for active critical alerts
CREATE OR REPLACE VIEW active_critical_alerts AS
SELECT
    al.id,
    al.alert_type,
    al.severity,
    al.title,
    al.description,
    al.estimated_loss,
    al.urgency_level,
    al.ai_recommendation,
    al.created_at,
    bt.transaction_id,
    bt.amount,
    p.provider_id,
    p.name as provider_name,
    a.risk_score,
    a.confidence
FROM alerts al
JOIN anomalies a ON al.anomaly_id = a.id
JOIN billing_transactions bt ON a.transaction_id = bt.id
JOIN providers p ON bt.provider_id = p.id
WHERE al.is_resolved = false
ORDER BY al.urgency_level DESC, al.created_at DESC;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE billing_transactions IS 'Core table storing all healthcare billing transactions with fraud detection scores';
COMMENT ON TABLE anomalies IS 'AI-detected anomalies in billing transactions with confidence scores and analysis';
COMMENT ON TABLE alerts IS 'Human-readable alerts generated from anomalies requiring investigation';
COMMENT ON TABLE providers IS 'Healthcare providers with risk assessments and fraud indicators';
COMMENT ON TABLE patients IS 'Patient information with privacy considerations and risk indicators';
COMMENT ON TABLE medical_codes IS 'Standardized medical procedure and diagnosis codes with risk classifications';
COMMENT ON TABLE metrics_snapshots IS 'Daily snapshots of key fraud detection metrics for trending analysis';
COMMENT ON TABLE pricing_insights IS 'Cost variance analysis for different medical procedure categories';
COMMENT ON TABLE investigation_cases IS 'Formal fraud investigation cases with evidence and findings';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system actions and data changes';

COMMENT ON FUNCTION calculate_transaction_risk_score(DECIMAL, UUID, VARCHAR, VARCHAR) IS 'Calculates risk score based on amount, provider history, and procedure codes';