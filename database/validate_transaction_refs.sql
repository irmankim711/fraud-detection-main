-- Validation script to check transaction_items foreign key references
-- Run this after 03_sample_data.sql to verify all references are valid

-- Check if all transaction_ids in transaction_items exist in billing_transactions
SELECT
    'transaction_items validation' as check_type,
    COUNT(*) as total_items,
    COUNT(DISTINCT t.transaction_id) as unique_transactions,
    COUNT(DISTINCT bt.id) as matching_billing_transactions
FROM transaction_items t
LEFT JOIN billing_transactions bt ON t.transaction_id = bt.id;

-- Show any missing references (should return 0 rows)
SELECT
    'Missing references' as issue_type,
    t.transaction_id,
    t.procedure_code
FROM transaction_items t
LEFT JOIN billing_transactions bt ON t.transaction_id = bt.id
WHERE bt.id IS NULL;

-- Verify UUID format consistency
SELECT
    'UUID format check' as check_type,
    transaction_id,
    LENGTH(transaction_id::text) as uuid_length,
    CASE
        WHEN transaction_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN 'Valid UUID format'
        ELSE 'Invalid UUID format'
    END as format_status
FROM transaction_items;