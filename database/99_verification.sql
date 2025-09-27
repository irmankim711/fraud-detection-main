-- ============================================================================
-- Database Setup Verification Script
-- ============================================================================
-- Run this script in Supabase SQL Editor to verify that your fraud detection
-- database is properly configured and ready for the MVP demo.
-- ============================================================================

-- ============================================================================
-- COMPREHENSIVE SETUP VERIFICATION
-- ============================================================================

-- Header
DO $$
BEGIN
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║              FRAUD DETECTION DATABASE VERIFICATION          ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;

-- 1. SCHEMA VERIFICATION
DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
    function_count INTEGER;
    trigger_count INTEGER;
BEGIN
    RAISE NOTICE '1. SCHEMA VERIFICATION';
    RAISE NOTICE '════════════════════════';

    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%';

    RAISE NOTICE 'Tables created: % (Expected: 13)', table_count;

    -- Count views
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views
    WHERE table_schema = 'public';

    RAISE NOTICE 'Views created: % (Expected: 3)', view_count;

    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION';

    RAISE NOTICE 'Functions created: % (Expected: 15+)', function_count;

    -- Count triggers
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public';

    RAISE NOTICE 'Triggers created: % (Expected: 10+)', trigger_count;

    RAISE NOTICE '';
END $$;

-- 2. ROW LEVEL SECURITY VERIFICATION
DO $$
DECLARE
    rls_count INTEGER;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '2. SECURITY VERIFICATION';
    RAISE NOTICE '═══════════════════════════';

    -- Count tables with RLS enabled
    SELECT COUNT(*) INTO rls_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND rowsecurity = true;

    RAISE NOTICE 'Tables with RLS enabled: % (Expected: 13)', rls_count;

    -- Count RLS policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';

    RAISE NOTICE 'RLS policies created: % (Expected: 30+)', policy_count;

    RAISE NOTICE '';
END $$;

-- 3. DATA POPULATION VERIFICATION
DO $$
DECLARE
    users_count INTEGER;
    providers_count INTEGER;
    transactions_count INTEGER;
    anomalies_count INTEGER;
    alerts_count INTEGER;
    medical_codes_count INTEGER;
BEGIN
    RAISE NOTICE '3. DATA POPULATION VERIFICATION';
    RAISE NOTICE '═══════════════════════════════════';

    SELECT COUNT(*) INTO users_count FROM users;
    SELECT COUNT(*) INTO providers_count FROM providers;
    SELECT COUNT(*) INTO transactions_count FROM billing_transactions;
    SELECT COUNT(*) INTO anomalies_count FROM anomalies;
    SELECT COUNT(*) INTO alerts_count FROM alerts;
    SELECT COUNT(*) INTO medical_codes_count FROM medical_codes;

    RAISE NOTICE 'Demo users: % (Expected: 4)', users_count;
    RAISE NOTICE 'Healthcare providers: % (Expected: 5)', providers_count;
    RAISE NOTICE 'Billing transactions: % (Expected: 8)', transactions_count;
    RAISE NOTICE 'Detected anomalies: % (Expected: 4)', anomalies_count;
    RAISE NOTICE 'Active alerts: % (Expected: 4)', alerts_count;
    RAISE NOTICE 'Medical codes: % (Expected: 15)', medical_codes_count;

    RAISE NOTICE '';
END $$;

-- 4. AUTHENTICATION INTEGRATION VERIFICATION
DO $$
DECLARE
    auth_trigger_count INTEGER;
BEGIN
    RAISE NOTICE '4. AUTHENTICATION INTEGRATION';
    RAISE NOTICE '═══════════════════════════════════';

    -- Count auth-related triggers
    SELECT COUNT(*) INTO auth_trigger_count
    FROM information_schema.triggers
    WHERE trigger_name LIKE 'on_auth_user%';

    RAISE NOTICE 'Auth synchronization triggers: % (Expected: 3)', auth_trigger_count;

    -- Check if auth sync functions exist
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') THEN
        RAISE NOTICE 'User registration sync: ✓ ACTIVE';
    ELSE
        RAISE NOTICE 'User registration sync: ✗ MISSING';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'sync_existing_auth_users') THEN
        RAISE NOTICE 'User migration function: ✓ AVAILABLE';
    ELSE
        RAISE NOTICE 'User migration function: ✗ MISSING';
    END IF;

    RAISE NOTICE '';
END $$;

-- 5. DASHBOARD DATA VERIFICATION
DO $$
DECLARE
    dashboard_data RECORD;
    pricing_insights_count INTEGER;
    metrics_snapshots_count INTEGER;
BEGIN
    RAISE NOTICE '5. DASHBOARD DATA VERIFICATION';
    RAISE NOTICE '═══════════════════════════════════';

    -- Test fraud dashboard summary view
    SELECT * INTO dashboard_data FROM fraud_dashboard_summary LIMIT 1;

    IF dashboard_data IS NOT NULL THEN
        RAISE NOTICE 'Dashboard summary view: ✓ WORKING';
        RAISE NOTICE 'Today''s claims: %', dashboard_data.total_claims_today;
        RAISE NOTICE 'High-risk claims: %', dashboard_data.high_risk_claims;
        RAISE NOTICE 'Active alerts: %', dashboard_data.alerts_generated;
    ELSE
        RAISE NOTICE 'Dashboard summary view: ✗ NO DATA';
    END IF;

    -- Check supporting data
    SELECT COUNT(*) INTO pricing_insights_count FROM pricing_insights;
    SELECT COUNT(*) INTO metrics_snapshots_count FROM metrics_snapshots;

    RAISE NOTICE 'Pricing insights: % (Expected: 4)', pricing_insights_count;
    RAISE NOTICE 'Metrics snapshots: % (Expected: 4)', metrics_snapshots_count;

    RAISE NOTICE '';
END $$;

-- 6. SAMPLE ALERT VERIFICATION
DO $$
DECLARE
    critical_alerts_count INTEGER;
    alert_sample RECORD;
BEGIN
    RAISE NOTICE '6. FRAUD DETECTION ALERTS';
    RAISE NOTICE '═══════════════════════════';

    SELECT COUNT(*) INTO critical_alerts_count
    FROM alerts
    WHERE severity = 'critical' AND is_resolved = false;

    RAISE NOTICE 'Critical unresolved alerts: % (Expected: 2)', critical_alerts_count;

    -- Get a sample alert
    SELECT title, estimated_loss, alert_type
    INTO alert_sample
    FROM alerts
    WHERE severity = 'critical'
    ORDER BY created_at DESC
    LIMIT 1;

    IF alert_sample IS NOT NULL THEN
        RAISE NOTICE 'Sample alert: "%"', alert_sample.title;
        RAISE NOTICE 'Estimated loss: $%', alert_sample.estimated_loss;
        RAISE NOTICE 'Alert type: %', alert_sample.alert_type;
    END IF;

    RAISE NOTICE '';
END $$;

-- 7. ROLE-BASED ACCESS VERIFICATION
DO $$
DECLARE
    admin_count INTEGER;
    analyst_count INTEGER;
    investigator_count INTEGER;
    viewer_count INTEGER;
BEGIN
    RAISE NOTICE '7. USER ROLES VERIFICATION';
    RAISE NOTICE '═══════════════════════════';

    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
    SELECT COUNT(*) INTO analyst_count FROM users WHERE role = 'analyst';
    SELECT COUNT(*) INTO investigator_count FROM users WHERE role = 'investigator';
    SELECT COUNT(*) INTO viewer_count FROM users WHERE role = 'viewer';

    RAISE NOTICE 'Admin users: % (Expected: 1)', admin_count;
    RAISE NOTICE 'Analyst users: % (Expected: 1)', analyst_count;
    RAISE NOTICE 'Investigator users: % (Expected: 1)', investigator_count;
    RAISE NOTICE 'Viewer users: % (Expected: 1)', viewer_count;

    RAISE NOTICE '';
END $$;

-- ============================================================================
-- DEMO CREDENTIALS DISPLAY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '8. DEMO USER CREDENTIALS';
    RAISE NOTICE '═══════════════════════════';
    RAISE NOTICE 'Use these credentials to test the application:';
    RAISE NOTICE '';
    RAISE NOTICE 'admin@frauddetect.com / Demo123!';
    RAISE NOTICE '  → Full system access, user management';
    RAISE NOTICE '';
    RAISE NOTICE 'analyst@frauddetect.com / Demo123!';
    RAISE NOTICE '  → Data analysis, fraud investigation management';
    RAISE NOTICE '';
    RAISE NOTICE 'investigator@frauddetect.com / Demo123!';
    RAISE NOTICE '  → Case management, alert handling';
    RAISE NOTICE '';
    RAISE NOTICE 'viewer@frauddetect.com / Demo123!';
    RAISE NOTICE '  → Dashboard access, read-only data';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SETUP STATUS SUMMARY
-- ============================================================================

DO $$
DECLARE
    setup_complete BOOLEAN := true;
    table_count INTEGER;
    users_count INTEGER;
    alerts_count INTEGER;
    rls_count INTEGER;
BEGIN
    RAISE NOTICE '9. SETUP STATUS SUMMARY';
    RAISE NOTICE '═══════════════════════════';

    -- Check critical components
    SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    SELECT COUNT(*) INTO users_count FROM users;
    SELECT COUNT(*) INTO alerts_count FROM alerts;
    SELECT COUNT(*) INTO rls_count FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

    IF table_count < 13 THEN
        RAISE NOTICE '✗ Schema incomplete (% tables)', table_count;
        setup_complete := false;
    ELSE
        RAISE NOTICE '✓ Schema complete (% tables)', table_count;
    END IF;

    IF users_count < 4 THEN
        RAISE NOTICE '✗ User data incomplete (% users)', users_count;
        setup_complete := false;
    ELSE
        RAISE NOTICE '✓ User data complete (% users)', users_count;
    END IF;

    IF alerts_count < 4 THEN
        RAISE NOTICE '✗ Alert data incomplete (% alerts)', alerts_count;
        setup_complete := false;
    ELSE
        RAISE NOTICE '✓ Alert data complete (% alerts)', alerts_count;
    END IF;

    IF rls_count < 13 THEN
        RAISE NOTICE '✗ Security incomplete (% tables with RLS)', rls_count;
        setup_complete := false;
    ELSE
        RAISE NOTICE '✓ Security complete (% tables with RLS)', rls_count;
    END IF;

    RAISE NOTICE '';

    IF setup_complete THEN
        RAISE NOTICE '🎉 DATABASE SETUP COMPLETE!';
        RAISE NOTICE 'Your fraud detection application is ready for demo.';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '1. Update your .env file with Supabase credentials';
        RAISE NOTICE '2. Create demo users in Supabase Auth dashboard';
        RAISE NOTICE '3. Start your React application';
        RAISE NOTICE '4. Test login with demo credentials';
    ELSE
        RAISE NOTICE '⚠️  SETUP INCOMPLETE';
        RAISE NOTICE 'Please review the errors above and re-run missing SQL scripts.';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║                     VERIFICATION COMPLETE                   ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
END $$;

-- ============================================================================
-- DETAILED TABLE AND DATA SUMMARY
-- ============================================================================

-- Table-by-table record count
SELECT
    'TABLES' as category,
    schemaname,
    relname as tablename,
    n_tup_ins as records_inserted,
    n_tup_upd as records_updated,
    n_tup_del as records_deleted
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Quick data summary
SELECT 'DATA SUMMARY' as section, 'Users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'DATA SUMMARY', 'Providers', COUNT(*) FROM providers
UNION ALL
SELECT 'DATA SUMMARY', 'Patients', COUNT(*) FROM patients
UNION ALL
SELECT 'DATA SUMMARY', 'Billing Transactions', COUNT(*) FROM billing_transactions
UNION ALL
SELECT 'DATA SUMMARY', 'Anomalies', COUNT(*) FROM anomalies
UNION ALL
SELECT 'DATA SUMMARY', 'Alerts', COUNT(*) FROM alerts
UNION ALL
SELECT 'DATA SUMMARY', 'Medical Codes', COUNT(*) FROM medical_codes
UNION ALL
SELECT 'DATA SUMMARY', 'Pricing Insights', COUNT(*) FROM pricing_insights
UNION ALL
SELECT 'DATA SUMMARY', 'Metrics Snapshots', COUNT(*) FROM metrics_snapshots
ORDER BY table_name;

-- Sample of high-risk alerts (for demo verification)
SELECT
    'SAMPLE ALERTS' as section,
    severity,
    title,
    estimated_loss,
    alert_type,
    created_at
FROM alerts
WHERE is_resolved = false
ORDER BY severity, estimated_loss DESC
LIMIT 5;