-- PostgreSQL Syntax Test Script
-- This script tests the transaction_items INSERT statement in isolation
-- Run this before executing the full 03_sample_data.sql file

-- Test 1: Validate UUID format and casting
SELECT
    '880e8400-e29b-41d4-a716-446655440001'::UUID as test_uuid_1,
    '880e8400-e29b-41d4-a716-446655440002'::UUID as test_uuid_2,
    '880e8400-e29b-41d4-a716-446655440003'::UUID as test_uuid_3,
    '880e8400-e29b-41d4-a716-446655440004'::UUID as test_uuid_4,
    '880e8400-e29b-41d4-a716-446655440005'::UUID as test_uuid_5;

-- Test 2: Test the exact INSERT statement structure (commented out for safety)
/*
-- Create a temporary table to test the INSERT syntax
CREATE TEMP TABLE test_transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL,
    procedure_code VARCHAR(20),
    diagnosis_code VARCHAR(20),
    quantity INTEGER DEFAULT 1,
    unit_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    modifier_codes VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test the INSERT statement syntax
INSERT INTO test_transaction_items (transaction_id, procedure_code, diagnosis_code, quantity, unit_cost, total_cost, modifier_codes) VALUES
('880e8400-e29b-41d4-a716-446655440001'::UUID, '27447', 'M25.561', 1, 125000.00, 125000.00, 'RT'),
('880e8400-e29b-41d4-a716-446655440002'::UUID, '33533', 'I25.10', 1, 85000.00, 85000.00, NULL),
('880e8400-e29b-41d4-a716-446655440003'::UUID, '99214', 'M16.11', 1, 12500.00, 12500.00, NULL),
('880e8400-e29b-41d4-a716-446655440004'::UUID, '70553', 'R06.02', 1, 1250.00, 1250.00, '26'),
('880e8400-e29b-41d4-a716-446655440005'::UUID, '80053', 'M48.06', 1, 89.99, 89.99, NULL);

-- Verify the insert worked
SELECT COUNT(*) as inserted_rows FROM test_transaction_items;

-- Clean up
DROP TABLE test_transaction_items;
*/