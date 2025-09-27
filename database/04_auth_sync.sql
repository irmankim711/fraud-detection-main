-- ============================================================================
-- Supabase Auth Integration for Fraud Detection Application
-- ============================================================================
-- This script creates the necessary triggers and functions to synchronize
-- Supabase's auth.users table with our custom users table, ensuring seamless
-- authentication integration.
-- ============================================================================

-- ============================================================================
-- USER SYNCHRONIZATION FUNCTIONS
-- ============================================================================

-- Function to create a user profile in our custom users table when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    default_role user_role := 'viewer';
BEGIN
    user_email := NEW.email;

    -- Assign roles based on email domain (for demo purposes)
    IF user_email LIKE '%admin%' THEN
        default_role := 'admin';
    ELSIF user_email LIKE '%analyst%' THEN
        default_role := 'analyst';
    ELSIF user_email LIKE '%investigator%' THEN
        default_role := 'investigator';
    ELSE
        default_role := 'viewer';
    END IF;

    -- Insert into our custom users table
    INSERT INTO users (id, email, full_name, role, is_active, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        default_role,
        true,
        NOW(),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile when auth.users is updated
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update email if changed
    IF OLD.email != NEW.email THEN
        UPDATE users
        SET email = NEW.email, updated_at = NOW()
        WHERE id = NEW.id;
    END IF;

    -- Update full_name if provided in metadata
    IF NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
        UPDATE users
        SET full_name = NEW.raw_user_meta_data->>'full_name', updated_at = NOW()
        WHERE id = NEW.id;
    END IF;

    -- Update last_login timestamp
    IF NEW.last_sign_in_at IS NOT NULL AND (OLD.last_sign_in_at IS NULL OR NEW.last_sign_in_at > OLD.last_sign_in_at) THEN
        UPDATE users
        SET last_login = NEW.last_sign_in_at, updated_at = NOW()
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deactivate user when deleted from auth.users
CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Don't actually delete, just deactivate
    UPDATE users
    SET is_active = false, updated_at = NOW()
    WHERE id = OLD.id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS FOR AUTH SYNCHRONIZATION
-- ============================================================================

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_update();

-- Create trigger for user deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_delete();

-- ============================================================================
-- DEMO USER CREATION FUNCTION
-- ============================================================================

-- Function to create demo users in Supabase Auth (call this from application)
CREATE OR REPLACE FUNCTION create_demo_users()
RETURNS TABLE(email TEXT, temp_password TEXT, role user_role) AS $$
DECLARE
    demo_users RECORD;
    temp_pass TEXT;
BEGIN
    -- Demo users with their intended roles
    FOR demo_users IN
        SELECT u.email, u.full_name, u.role
        FROM (VALUES
            ('admin@frauddetect.com', 'System Administrator', 'admin'::user_role),
            ('analyst@frauddetect.com', 'Senior Fraud Analyst', 'analyst'::user_role),
            ('investigator@frauddetect.com', 'Fraud Investigator', 'investigator'::user_role),
            ('viewer@frauddetect.com', 'Dashboard Viewer', 'viewer'::user_role)
        ) AS u(email, full_name, role)
    LOOP
        -- Generate a temporary password
        temp_pass := 'Demo123!';

        -- Return the user info for manual creation
        RETURN QUERY SELECT demo_users.email, temp_pass, demo_users.role;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USER ROLE MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to update user role (admin only)
CREATE OR REPLACE FUNCTION update_user_role(
    user_id UUID,
    new_role user_role
)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_role user_role;
BEGIN
    -- Check if current user is admin
    SELECT role INTO current_user_role FROM users WHERE id = auth.uid();

    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can update user roles';
    END IF;

    -- Update the user role
    UPDATE users
    SET role = new_role, updated_at = NOW()
    WHERE id = user_id;

    -- Log the role change
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (
        auth.uid(),
        'ROLE_UPDATE',
        'users',
        user_id,
        jsonb_build_object('new_role', new_role)
    );

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deactivate/activate users
CREATE OR REPLACE FUNCTION toggle_user_status(
    user_id UUID,
    active_status BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_role user_role;
BEGIN
    -- Check if current user is admin
    SELECT role INTO current_user_role FROM users WHERE id = auth.uid();

    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can modify user status';
    END IF;

    -- Update user status
    UPDATE users
    SET is_active = active_status, updated_at = NOW()
    WHERE id = user_id;

    -- Log the status change
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (
        auth.uid(),
        'STATUS_UPDATE',
        'users',
        user_id,
        jsonb_build_object('is_active', active_status)
    );

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION FUNCTION FOR EXISTING USERS
-- ============================================================================

-- Function to sync existing auth.users with custom users table
CREATE OR REPLACE FUNCTION sync_existing_auth_users()
RETURNS INTEGER AS $$
DECLARE
    auth_user RECORD;
    sync_count INTEGER := 0;
    default_role user_role;
BEGIN
    -- Loop through all existing auth users
    FOR auth_user IN
        SELECT id, email, raw_user_meta_data, created_at, last_sign_in_at
        FROM auth.users
        WHERE id NOT IN (SELECT id FROM users)
    LOOP
        -- Determine role based on email
        IF auth_user.email LIKE '%admin%' THEN
            default_role := 'admin';
        ELSIF auth_user.email LIKE '%analyst%' THEN
            default_role := 'analyst';
        ELSIF auth_user.email LIKE '%investigator%' THEN
            default_role := 'investigator';
        ELSE
            default_role := 'viewer';
        END IF;

        -- Insert into custom users table
        INSERT INTO users (id, email, full_name, role, is_active, last_login, created_at, updated_at)
        VALUES (
            auth_user.id,
            auth_user.email,
            COALESCE(auth_user.raw_user_meta_data->>'full_name', SPLIT_PART(auth_user.email, '@', 1)),
            default_role,
            true,
            auth_user.last_sign_in_at,
            auth_user.created_at,
            NOW()
        );

        sync_count := sync_count + 1;
    END LOOP;

    RETURN sync_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UTILITY FUNCTIONS FOR DEMO SETUP
-- ============================================================================

-- Function to get demo user credentials for testing
CREATE OR REPLACE FUNCTION get_demo_credentials()
RETURNS TABLE(
    email TEXT,
    password TEXT,
    role user_role,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY VALUES
        ('admin@frauddetect.com'::TEXT, 'Demo123!'::TEXT, 'admin'::user_role, 'Full system access, user management'::TEXT),
        ('analyst@frauddetect.com'::TEXT, 'Demo123!'::TEXT, 'analyst'::user_role, 'Data analysis, fraud investigation management'::TEXT),
        ('investigator@frauddetect.com'::TEXT, 'Demo123!'::TEXT, 'investigator'::user_role, 'Case management, alert handling'::TEXT),
        ('viewer@frauddetect.com'::TEXT, 'Demo123!'::TEXT, 'viewer'::user_role, 'Dashboard access, read-only data'::TEXT);
END;
$$ LANGUAGE plpgsql;

-- Function to verify demo setup
CREATE OR REPLACE FUNCTION verify_demo_setup()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check if users table has data
    RETURN QUERY
    SELECT
        'Users Table'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'EMPTY' END::TEXT,
        'Found ' || COUNT(*) || ' users'::TEXT
    FROM users;

    -- Check if sample transactions exist
    RETURN QUERY
    SELECT
        'Transaction Data'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'MISSING' END::TEXT,
        'Found ' || COUNT(*) || ' transactions'::TEXT
    FROM billing_transactions;

    -- Check if alerts exist
    RETURN QUERY
    SELECT
        'Alert Data'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'MISSING' END::TEXT,
        'Found ' || COUNT(*) || ' alerts'::TEXT
    FROM alerts;

    -- Check RLS policies
    RETURN QUERY
    SELECT
        'RLS Policies'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'ENABLED' ELSE 'DISABLED' END::TEXT,
        'Found ' || COUNT(*) || ' policies'::TEXT
    FROM pg_policies
    WHERE schemaname = 'public';

    -- Check if triggers are active
    RETURN QUERY
    SELECT
        'Auth Triggers'::TEXT,
        CASE WHEN COUNT(*) >= 3 THEN 'ACTIVE' ELSE 'MISSING' END::TEXT,
        'Found ' || COUNT(*) || ' triggers'::TEXT
    FROM information_schema.triggers
    WHERE trigger_name LIKE 'on_auth_user%';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates user profile when new user signs up via Supabase Auth';
COMMENT ON FUNCTION handle_user_update() IS 'Synchronizes user profile updates between auth.users and custom users table';
COMMENT ON FUNCTION handle_user_delete() IS 'Deactivates user profile when deleted from Supabase Auth';
COMMENT ON FUNCTION sync_existing_auth_users() IS 'One-time migration function to sync existing auth users';
COMMENT ON FUNCTION update_user_role(UUID, user_role) IS 'Admin function to update user roles with audit logging';
COMMENT ON FUNCTION get_demo_credentials() IS 'Returns demo user credentials for testing and setup';
COMMENT ON FUNCTION verify_demo_setup() IS 'Comprehensive verification of database setup and demo data';

-- ============================================================================
-- SETUP VERIFICATION
-- ============================================================================

-- Display demo credentials after setup
DO $$
BEGIN
    RAISE NOTICE 'Auth synchronization setup complete!';
    RAISE NOTICE 'Demo user credentials:';
    RAISE NOTICE 'Admin: admin@frauddetect.com / Demo123!';
    RAISE NOTICE 'Analyst: analyst@frauddetect.com / Demo123!';
    RAISE NOTICE 'Investigator: investigator@frauddetect.com / Demo123!';
    RAISE NOTICE 'Viewer: viewer@frauddetect.com / Demo123!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create these users in Supabase Auth dashboard';
    RAISE NOTICE '2. Users will automatically sync to custom users table';
    RAISE NOTICE '3. Test login functionality';
END $$;