-- ============================================================================
-- Row Level Security (RLS) Policies for Fraud Detection Application
-- ============================================================================
-- This file implements comprehensive RLS policies to ensure data security
-- and proper access control based on user roles and data sensitivity.
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_risk_assessments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- ============================================================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val
    FROM users
    WHERE id = auth.uid();

    RETURN COALESCE(user_role_val, 'viewer'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is analyst or higher
CREATE OR REPLACE FUNCTION is_analyst_or_higher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'analyst');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is investigator or higher
CREATE OR REPLACE FUNCTION is_investigator_or_higher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'analyst', 'investigator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user exists and is active
CREATE OR REPLACE FUNCTION is_authenticated_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- USER MANAGEMENT POLICIES
-- ============================================================================

-- Users can read their own profile, admins can read all
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (
        id = auth.uid() OR is_admin()
    );

-- Only admins can insert new users
CREATE POLICY "Only admins can create users" ON users
    FOR INSERT WITH CHECK (is_admin());

-- Users can update their own profile, admins can update any
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (
        id = auth.uid() OR is_admin()
    ) WITH CHECK (
        id = auth.uid() OR is_admin()
    );

-- Only admins can delete users
CREATE POLICY "Only admins can delete users" ON users
    FOR DELETE USING (is_admin());

-- ============================================================================
-- PROVIDER POLICIES
-- ============================================================================

-- All authenticated users can read provider data (needed for investigations)
CREATE POLICY "Authenticated users can view providers" ON providers
    FOR SELECT USING (is_authenticated_user());

-- Only admins and analysts can modify provider data
CREATE POLICY "Analysts and admins can modify providers" ON providers
    FOR ALL USING (is_analyst_or_higher()) WITH CHECK (is_analyst_or_higher());

-- ============================================================================
-- PATIENT POLICIES (SENSITIVE DATA)
-- ============================================================================

-- Only investigators and above can access patient data
CREATE POLICY "Investigators can view patients" ON patients
    FOR SELECT USING (is_investigator_or_higher());

-- Only admins and analysts can modify patient data
CREATE POLICY "Analysts and admins can modify patients" ON patients
    FOR ALL USING (is_analyst_or_higher()) WITH CHECK (is_analyst_or_higher());

-- ============================================================================
-- MEDICAL CODES POLICIES
-- ============================================================================

-- All authenticated users can read medical codes (reference data)
CREATE POLICY "Authenticated users can view medical codes" ON medical_codes
    FOR SELECT USING (is_authenticated_user());

-- Only admins can modify medical codes
CREATE POLICY "Only admins can modify medical codes" ON medical_codes
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- BILLING TRANSACTIONS POLICIES
-- ============================================================================

-- All authenticated users can view billing transactions
CREATE POLICY "Authenticated users can view transactions" ON billing_transactions
    FOR SELECT USING (is_authenticated_user());

-- Only analysts and above can create/modify transactions
CREATE POLICY "Analysts can modify transactions" ON billing_transactions
    FOR INSERT WITH CHECK (is_analyst_or_higher());

CREATE POLICY "Analysts can update transactions" ON billing_transactions
    FOR UPDATE USING (is_analyst_or_higher()) WITH CHECK (is_analyst_or_higher());

-- Only admins can delete transactions
CREATE POLICY "Only admins can delete transactions" ON billing_transactions
    FOR DELETE USING (is_admin());

-- ============================================================================
-- TRANSACTION ITEMS POLICIES
-- ============================================================================

-- Follow same pattern as billing transactions
CREATE POLICY "Authenticated users can view transaction items" ON transaction_items
    FOR SELECT USING (is_authenticated_user());

CREATE POLICY "Analysts can modify transaction items" ON transaction_items
    FOR ALL USING (is_analyst_or_higher()) WITH CHECK (is_analyst_or_higher());

-- ============================================================================
-- ANOMALIES POLICIES
-- ============================================================================

-- All authenticated users can view anomalies
CREATE POLICY "Authenticated users can view anomalies" ON anomalies
    FOR SELECT USING (is_authenticated_user());

-- System can insert anomalies (bypass RLS for automated processes)
CREATE POLICY "System can create anomalies" ON anomalies
    FOR INSERT WITH CHECK (true);

-- Only investigators and above can update anomaly status
CREATE POLICY "Investigators can update anomalies" ON anomalies
    FOR UPDATE USING (is_investigator_or_higher()) WITH CHECK (is_investigator_or_higher());

-- Only admins can delete anomalies
CREATE POLICY "Only admins can delete anomalies" ON anomalies
    FOR DELETE USING (is_admin());

-- ============================================================================
-- ALERTS POLICIES
-- ============================================================================

-- All authenticated users can view alerts
CREATE POLICY "Authenticated users can view alerts" ON alerts
    FOR SELECT USING (is_authenticated_user());

-- System can create alerts
CREATE POLICY "System can create alerts" ON alerts
    FOR INSERT WITH CHECK (true);

-- Investigators can update alerts assigned to them or unassigned alerts
CREATE POLICY "Investigators can update assigned alerts" ON alerts
    FOR UPDATE USING (
        is_investigator_or_higher() AND (
            assigned_to = auth.uid() OR
            assigned_to IS NULL OR
            is_analyst_or_higher()
        )
    ) WITH CHECK (
        is_investigator_or_higher() AND (
            assigned_to = auth.uid() OR
            assigned_to IS NULL OR
            is_analyst_or_higher()
        )
    );

-- Only admins can delete alerts
CREATE POLICY "Only admins can delete alerts" ON alerts
    FOR DELETE USING (is_admin());

-- ============================================================================
-- METRICS AND MONITORING POLICIES
-- ============================================================================

-- All authenticated users can view metrics (dashboard access)
CREATE POLICY "Authenticated users can view metrics snapshots" ON metrics_snapshots
    FOR SELECT USING (is_authenticated_user());

CREATE POLICY "Authenticated users can view pricing insights" ON pricing_insights
    FOR SELECT USING (is_authenticated_user());

CREATE POLICY "Authenticated users can view system metrics" ON system_metrics
    FOR SELECT USING (is_authenticated_user());

-- Only analysts and above can modify metrics
CREATE POLICY "Analysts can modify metrics snapshots" ON metrics_snapshots
    FOR ALL USING (is_analyst_or_higher()) WITH CHECK (is_analyst_or_higher());

CREATE POLICY "Analysts can modify pricing insights" ON pricing_insights
    FOR ALL USING (is_analyst_or_higher()) WITH CHECK (is_analyst_or_higher());

-- System can insert metrics data
CREATE POLICY "System can insert system metrics" ON system_metrics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Analysts can modify system metrics" ON system_metrics
    FOR UPDATE USING (is_analyst_or_higher()) WITH CHECK (is_analyst_or_higher());

CREATE POLICY "Analysts can delete system metrics" ON system_metrics
    FOR DELETE USING (is_analyst_or_higher());

-- ============================================================================
-- INVESTIGATION CASES POLICIES
-- ============================================================================

-- Investigators can view cases they're assigned to, analysts can view all
CREATE POLICY "Investigators can view relevant cases" ON investigation_cases
    FOR SELECT USING (
        assigned_investigator = auth.uid() OR
        is_analyst_or_higher()
    );

-- Only analysts and above can create investigation cases
CREATE POLICY "Analysts can create investigation cases" ON investigation_cases
    FOR INSERT WITH CHECK (is_analyst_or_higher());

-- Assigned investigators can update their cases, analysts can update all
CREATE POLICY "Investigators can update assigned cases" ON investigation_cases
    FOR UPDATE USING (
        assigned_investigator = auth.uid() OR
        is_analyst_or_higher()
    ) WITH CHECK (
        assigned_investigator = auth.uid() OR
        is_analyst_or_higher()
    );

-- Only admins can delete investigation cases
CREATE POLICY "Only admins can delete investigation cases" ON investigation_cases
    FOR DELETE USING (is_admin());

-- ============================================================================
-- AUDIT LOGS POLICIES
-- ============================================================================

-- Only analysts and above can view audit logs
CREATE POLICY "Analysts can view audit logs" ON audit_logs
    FOR SELECT USING (is_analyst_or_higher());

-- System can insert audit logs (automated logging)
CREATE POLICY "System can create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Only admins can delete audit logs (for maintenance)
CREATE POLICY "Only admins can delete audit logs" ON audit_logs
    FOR DELETE USING (is_admin());

-- ============================================================================
-- PROVIDER RISK ASSESSMENTS POLICIES
-- ============================================================================

-- All authenticated users can view risk assessments
CREATE POLICY "Authenticated users can view risk assessments" ON provider_risk_assessments
    FOR SELECT USING (is_authenticated_user());

-- Only analysts and above can create/modify risk assessments
CREATE POLICY "Analysts can modify risk assessments" ON provider_risk_assessments
    FOR ALL USING (is_analyst_or_higher()) WITH CHECK (is_analyst_or_higher());

-- ============================================================================
-- SECURITY FUNCTIONS FOR APPLICATION LAYER
-- ============================================================================

-- Function to safely get user info (used by application)
CREATE OR REPLACE FUNCTION get_current_user_info()
RETURNS TABLE(
    user_id UUID,
    email VARCHAR,
    full_name VARCHAR,
    role user_role,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.full_name, u.role, u.is_active
    FROM users u
    WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user permissions for specific actions
CREATE OR REPLACE FUNCTION check_user_permission(action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val FROM users WHERE id = auth.uid();

    CASE action
        WHEN 'view_dashboard' THEN
            RETURN user_role_val IS NOT NULL;
        WHEN 'manage_users' THEN
            RETURN user_role_val = 'admin';
        WHEN 'investigate_fraud' THEN
            RETURN user_role_val IN ('admin', 'analyst', 'investigator');
        WHEN 'modify_data' THEN
            RETURN user_role_val IN ('admin', 'analyst');
        WHEN 'view_sensitive_data' THEN
            RETURN user_role_val IN ('admin', 'analyst', 'investigator');
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ADDITIONAL SECURITY MEASURES
-- ============================================================================

-- Create a function to mask sensitive patient data for lower privilege users
CREATE OR REPLACE FUNCTION mask_patient_data(
    original_data JSONB,
    user_role user_role
)
RETURNS JSONB AS $$
BEGIN
    -- If user is investigator or higher, return full data
    IF user_role IN ('admin', 'analyst', 'investigator') THEN
        RETURN original_data;
    END IF;

    -- For viewers, mask sensitive fields
    RETURN jsonb_build_object(
        'id', original_data->>'id',
        'masked', true,
        'access_level', 'restricted'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to log sensitive data access
CREATE OR REPLACE FUNCTION log_data_access(
    table_name TEXT,
    record_id UUID,
    access_type TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        new_values,
        created_at
    ) VALUES (
        auth.uid(),
        'DATA_ACCESS',
        table_name,
        record_id,
        jsonb_build_object('access_type', access_type),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS FOR SECURITY DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_user_role() IS 'Safely retrieves the current user role for RLS policies';
COMMENT ON FUNCTION is_admin() IS 'Checks if current user has admin privileges';
COMMENT ON FUNCTION is_analyst_or_higher() IS 'Checks if current user has analyst or admin privileges';
COMMENT ON FUNCTION is_investigator_or_higher() IS 'Checks if current user has investigator, analyst, or admin privileges';
COMMENT ON FUNCTION check_user_permission(TEXT) IS 'Comprehensive permission checking function for application layer';
COMMENT ON FUNCTION mask_patient_data(JSONB, user_role) IS 'Masks sensitive patient data based on user role';
COMMENT ON FUNCTION log_data_access(TEXT, UUID, TEXT) IS 'Logs access to sensitive data for audit purposes';

-- ============================================================================
-- GRANT STATEMENTS FOR SUPABASE
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions to anonymous users (for public API endpoints if needed)
GRANT USAGE ON SCHEMA public TO anon;

-- Revoke dangerous permissions from public
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM public;

-- ============================================================================
-- SECURITY VALIDATION QUERIES
-- ============================================================================

-- These queries can be used to validate the security setup
-- (Run these after setting up the database to verify RLS is working)

/*
-- Test queries to validate RLS (uncomment to run tests):

-- Should return only current user's data
SELECT * FROM users WHERE id = auth.uid();

-- Should respect role-based access
SELECT COUNT(*) FROM patients; -- Should vary based on user role

-- Should show only accessible alerts
SELECT COUNT(*) FROM alerts WHERE assigned_to = auth.uid() OR assigned_to IS NULL;

-- Test function permissions
SELECT check_user_permission('view_dashboard');
SELECT check_user_permission('manage_users');
SELECT check_user_permission('investigate_fraud');
*/