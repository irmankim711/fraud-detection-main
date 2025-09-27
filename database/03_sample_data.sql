-- ============================================================================
-- Sample Data for Fraud Detection Application
-- ============================================================================
-- This script provides realistic test data that replaces the mock data
-- in your React components and demonstrates the fraud detection capabilities.
-- ============================================================================

-- ============================================================================
-- REFERENCE DATA
-- ============================================================================

-- Insert medical codes (ICD-10, CPT, HCPCS)
INSERT INTO medical_codes (code_type, code, description, category, typical_cost_range, is_high_risk) VALUES
-- High-value procedures (potential fraud targets)
('CPT', '27447', 'Total knee arthroplasty', 'Orthopedic Surgery', '[25000,45000]', true),
('CPT', '27130', 'Total hip arthroplasty', 'Orthopedic Surgery', '[30000,50000]', true),
('CPT', '33533', 'Coronary artery bypass', 'Cardiac Surgery', '[40000,80000]', true),
('CPT', '63030', 'Laminectomy lumbar', 'Neurosurgery', '[15000,35000]', true),
('CPT', '70553', 'MRI brain with contrast', 'Diagnostic Imaging', '[1500,3000]', false),
('CPT', '73721', 'MRI knee without contrast', 'Diagnostic Imaging', '[800,1800]', false),
('CPT', '76700', 'Ultrasound abdomen', 'Diagnostic Imaging', '[200,500]', false),

-- Common diagnostic codes
('ICD-10', 'M25.561', 'Pain in right knee', 'Musculoskeletal', '[100,500]', false),
('ICD-10', 'M16.11', 'Unilateral primary osteoarthritis, right hip', 'Musculoskeletal', '[200,1000]', false),
('ICD-10', 'I25.10', 'Atherosclerotic heart disease', 'Cardiovascular', '[500,2000]', false),
('ICD-10', 'M48.06', 'Spinal stenosis, lumbar region', 'Neurological', '[300,1500]', false),
('ICD-10', 'R06.02', 'Shortness of breath', 'Respiratory', '[100,800]', false),

-- High-risk codes often associated with fraud
('CPT', '99213', 'Office visit, established patient', 'Evaluation & Management', '[150,300]', true),
('CPT', '99214', 'Office visit, established patient', 'Evaluation & Management', '[200,400]', true),
('CPT', '99215', 'Office visit, established patient', 'Evaluation & Management', '[300,500]', true),
('CPT', '80053', 'Comprehensive metabolic panel', 'Laboratory', '[50,150]', false),
('CPT', '85025', 'Complete blood count', 'Laboratory', '[25,75]', false);

-- ============================================================================
-- USERS AND PROVIDERS
-- ============================================================================

-- Insert sample users (these would typically be created through Supabase Auth)
INSERT INTO users (id, email, full_name, role, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@frauddetect.com', 'System Administrator', 'admin', true),
('550e8400-e29b-41d4-a716-446655440002', 'analyst@frauddetect.com', 'Senior Fraud Analyst', 'analyst', true),
('550e8400-e29b-41d4-a716-446655440003', 'investigator@frauddetect.com', 'Fraud Investigator', 'investigator', true),
('550e8400-e29b-41d4-a716-446655440004', 'viewer@frauddetect.com', 'Dashboard Viewer', 'viewer', true);

-- Insert sample healthcare providers
INSERT INTO providers (id, provider_id, name, specialty, license_number, address, contact_info, risk_score, is_flagged, registration_date) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'PROV-8834', 'Metropolitan Medical Center', 'Multi-Specialty', 'MD123456',
 '{"street": "123 Medical Plaza", "city": "New York", "state": "NY", "zip": "10001"}',
 '{"phone": "555-0123", "email": "billing@metromedical.com"}', 8.5, true, '2020-01-15'),

('660e8400-e29b-41d4-a716-446655440002', 'PROV-2245', 'Sunshine Family Practice', 'Family Medicine', 'MD234567',
 '{"street": "456 Health Ave", "city": "Miami", "state": "FL", "zip": "33101"}',
 '{"phone": "555-0124", "email": "admin@sunshinefp.com"}', 7.2, true, '2019-03-20'),

('660e8400-e29b-41d4-a716-446655440003', 'PROV-5567', 'Northside Orthopedics', 'Orthopedics', 'MD345678',
 '{"street": "789 Bone Blvd", "city": "Chicago", "state": "IL", "zip": "60601"}',
 '{"phone": "555-0125", "email": "billing@northortho.com"}', 3.2, false, '2018-07-10'),

('660e8400-e29b-41d4-a716-446655440004', 'PROV-1123', 'Downtown Diagnostics', 'Radiology', 'MD456789',
 '{"street": "321 Scan Street", "city": "Los Angeles", "state": "CA", "zip": "90210"}',
 '{"phone": "555-0126", "email": "reports@downtowndiag.com"}', 2.1, false, '2021-02-28'),

('660e8400-e29b-41d4-a716-446655440005', 'PROV-9988', 'Cardiac Care Specialists', 'Cardiology', 'MD567890',
 '{"street": "654 Heart Lane", "city": "Houston", "state": "TX", "zip": "77001"}',
 '{"phone": "555-0127", "email": "billing@cardiaccare.com"}', 1.8, false, '2020-11-05');

-- Insert sample patients (with privacy considerations)
INSERT INTO patients (id, patient_id, date_of_birth, gender, insurance_info, risk_indicators) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'PAT-9876', '1955-08-15', 'M',
 '{"carrier": "Medicare", "policy_number": "***-**-1234", "group": "MEDICARE"}',
 '{"frequent_claims": true, "multiple_providers": false}'),

('770e8400-e29b-41d4-a716-446655440002', 'PAT-5432', '1962-03-22', 'F',
 '{"carrier": "Blue Cross", "policy_number": "***-**-5678", "group": "BC001"}',
 '{"frequent_claims": false, "multiple_providers": true}'),

('770e8400-e29b-41d4-a716-446655440003', 'PAT-1357', '1978-11-08', 'M',
 '{"carrier": "Aetna", "policy_number": "***-**-9012", "group": "AET100"}',
 '{"frequent_claims": false, "multiple_providers": false}'),

('770e8400-e29b-41d4-a716-446655440004', 'PAT-2468', '1945-06-12', 'F',
 '{"carrier": "Medicare", "policy_number": "***-**-3456", "group": "MEDICARE"}',
 '{"frequent_claims": true, "multiple_providers": true}'),

('770e8400-e29b-41d4-a716-446655440005', 'PAT-8642', '1985-09-30', 'M',
 '{"carrier": "United Healthcare", "policy_number": "***-**-7890", "group": "UHC200"}',
 '{"frequent_claims": false, "multiple_providers": false}');

-- ============================================================================
-- BILLING TRANSACTIONS
-- ============================================================================

-- Insert billing transactions with varying risk profiles
INSERT INTO billing_transactions (id, transaction_id, provider_id, patient_id, amount, transaction_date, service_date, procedure_code, diagnosis_code, claim_number, status, raw_data, metadata) VALUES
-- High-risk transaction (Metropolitan Medical Center - flagged provider)
('880e8400-e29b-41d4-a716-446655440001', 'CLM-2024-001567',
 '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001',
 125000.00, NOW() - INTERVAL '15 minutes', CURRENT_DATE - INTERVAL '2 days',
 '27447', 'M25.561', 'CLM-2024-001567', 'pending',
 '{"original_amount": 125000, "submitted_date": "2024-01-15", "urgency": "routine"}',
 '{"billing_anomaly_flags": ["amount_outlier", "provider_risk"], "auto_flagged": true}'),

-- Phantom billing case (Sunshine Family Practice)
('880e8400-e29b-41d4-a716-446655440002', 'CLM-2024-001589',
 '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002',
 85000.00, NOW() - INTERVAL '32 minutes', CURRENT_DATE - INTERVAL '5 days',
 '33533', 'I25.10', 'CLM-2024-001589', 'suspended',
 '{"original_amount": 85000, "submitted_date": "2024-01-12", "urgency": "urgent"}',
 '{"phantom_billing_flags": ["no_patient_visit_record", "suspicious_timing"], "investigation_required": true}'),

-- Duplicate claims (Northside Orthopedics)
('880e8400-e29b-41d4-a716-446655440003', 'CLM-2024-001432',
 '660e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003',
 12500.00, NOW() - INTERVAL '45 minutes', CURRENT_DATE - INTERVAL '3 days',
 '99214', 'M16.11', 'CLM-2024-001432', 'pending',
 '{"original_amount": 12500, "submitted_date": "2024-01-13", "urgency": "routine"}',
 '{"duplicate_flags": ["similar_claim_exists", "same_date_service"], "confidence": 87}'),

-- Normal transactions (legitimate)
('880e8400-e29b-41d4-a716-446655440004', 'TXN-001234',
 '660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440004',
 1250.00, NOW() - INTERVAL '2 hours', CURRENT_DATE - INTERVAL '1 day',
 '70553', 'R06.02', 'CLM-2024-001600', 'approved',
 '{"original_amount": 1250, "submitted_date": "2024-01-16", "urgency": "routine"}',
 '{"clean_transaction": true, "auto_approved": true}'),

('880e8400-e29b-41d4-a716-446655440005', 'TXN-001235',
 '660e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440005',
 89.99, NOW() - INTERVAL '3 hours', CURRENT_DATE - INTERVAL '1 day',
 '80053', 'M48.06', 'CLM-2024-001601', 'approved',
 '{"original_amount": 89.99, "submitted_date": "2024-01-16", "urgency": "routine"}',
 '{"clean_transaction": true, "auto_approved": true}'),

-- Additional transactions for variety
('880e8400-e29b-41d4-a716-446655440006', 'TXN-001236',
 '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440003',
 5000.00, NOW() - INTERVAL '4 hours', CURRENT_DATE - INTERVAL '2 days',
 '99215', 'M25.561', 'CLM-2024-001602', 'declined',
 '{"original_amount": 5000, "submitted_date": "2024-01-14", "urgency": "routine"}',
 '{"high_risk_flags": ["amount_unusual", "provider_history"], "auto_declined": true}'),

('880e8400-e29b-41d4-a716-446655440007', 'TXN-001237',
 '660e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440001',
 45.50, NOW() - INTERVAL '5 hours', CURRENT_DATE - INTERVAL '1 day',
 '85025', 'M25.561', 'CLM-2024-001603', 'approved',
 '{"original_amount": 45.50, "submitted_date": "2024-01-16", "urgency": "routine"}',
 '{"clean_transaction": true, "auto_approved": true}'),

('880e8400-e29b-41d4-a716-446655440008', 'TXN-001238',
 '660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002',
 299.99, NOW() - INTERVAL '6 hours', CURRENT_DATE - INTERVAL '2 days',
 '73721', 'M16.11', 'CLM-2024-001604', 'pending',
 '{"original_amount": 299.99, "submitted_date": "2024-01-14", "urgency": "routine"}',
 '{"moderate_risk": true, "manual_review_required": true}');

-- ============================================================================
-- TRANSACTION ITEMS
-- ============================================================================

-- Add line items for some transactions
INSERT INTO transaction_items (transaction_id, procedure_code, diagnosis_code, quantity, unit_cost, total_cost, modifier_codes) VALUES
('880e8400-e29b-41d4-a716-446655440001', '27447', 'M25.561', 1, 125000.00, 125000.00, 'RT'),
('880e8400-e29b-41d4-a716-446655440002', '33533', 'I25.10', 1, 85000.00, 85000.00, NULL),
('880e8400-e29b-41d4-a716-446655440003', '99214', 'M16.11', 1, 12500.00, 12500.00, NULL),
('880e8400-e29b-41d4-a716-446655440004', '70553', 'R06.02', 1, 1250.00, 1250.00, '26'),
('880e8400-e29b-41d4-a716-446655440005', '80053', 'M48.06', 1, 89.99, 89.99, NULL);

-- ============================================================================
-- ANOMALIES
-- ============================================================================

-- Create anomalies for high-risk transactions
INSERT INTO anomalies (id, transaction_id, anomaly_type, risk_score, confidence, ai_model_version, model_features, gemini_summary, status, detected_at) VALUES
('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001',
 'billing_anomaly', 9.4, 94.0, 'fraud-detect-v2.1',
 '{"amount_zscore": 4.2, "provider_risk": 8.5, "historical_variance": 340, "procedure_frequency": "unusual"}',
 'Healthcare provider submitting 300% more claims than average with identical diagnostic codes. Pattern indicates potential upcoding fraud scheme.',
 'pending', NOW() - INTERVAL '15 minutes'),

('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440002',
 'phantom_billing', 9.1, 91.0, 'fraud-detect-v2.1',
 '{"patient_visit_correlation": 0.0, "service_location_mismatch": true, "provider_risk": 7.2, "timing_anomaly": true}',
 'Services billed for patients with no record of visit or treatment. Cross-reference shows patient was not physically present at claimed service dates.',
 'investigating', NOW() - INTERVAL '32 minutes'),

('990e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440003',
 'duplicate_claims', 8.7, 87.0, 'fraud-detect-v2.1',
 '{"duplicate_probability": 0.87, "time_window_overlap": true, "identical_codes": true, "amount_match": true}',
 'Multiple identical claims submitted across different time periods for the same patient and procedure codes.',
 'pending', NOW() - INTERVAL '45 minutes'),

('990e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440006',
 'amount_anomaly', 9.8, 98.0, 'fraud-detect-v2.1',
 '{"amount_zscore": 5.1, "procedure_code_mismatch": true, "provider_history": "high_risk", "geographical_variance": 450}',
 'Claim amount significantly exceeds typical range for procedure code and geographical area. Provider has history of similar anomalies.',
 'pending', NOW() - INTERVAL '4 hours');

-- ============================================================================
-- ALERTS
-- ============================================================================

-- Create alerts based on anomalies (matching mock data structure)
INSERT INTO alerts (id, anomaly_id, alert_type, severity, title, description, estimated_loss, urgency_level, ai_recommendation, assigned_to, is_resolved) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001',
 'billing_anomaly', 'critical', 'Unusual Billing Pattern Detected',
 'Healthcare provider submitting 300% more claims than average with identical diagnostic codes',
 125000.00, 5,
 'Immediate investigation required. Pattern matches known fraud scheme. Recommend claim suspension.',
 '550e8400-e29b-41d4-a716-446655440003', false),

('aa0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440002',
 'phantom_billing', 'high', 'Phantom Billing Scheme',
 'Services billed for patients with no record of visit or treatment',
 85000.00, 4,
 'Cross-reference patient records. High probability of fraudulent billing.',
 '550e8400-e29b-41d4-a716-446655440003', false),

('aa0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440003',
 'duplicate_claims', 'medium', 'Duplicate Claim Submission',
 'Multiple identical claims submitted across different time periods',
 12500.00, 2,
 'Automatic rejection recommended. Clear duplicate pattern identified.',
 NULL, false),

('aa0e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440004',
 'billing_anomaly', 'critical', 'Excessive Billing Amount',
 'Claim amount exceeds normal range by 450% for this procedure type',
 5000.00, 5,
 'Immediate review required. Potential upcoding fraud detected.',
 '550e8400-e29b-41d4-a716-446655440002', false);

-- ============================================================================
-- METRICS SNAPSHOTS
-- ============================================================================

-- Insert current metrics snapshot (matching mock data)
INSERT INTO metrics_snapshots (snapshot_date, total_claims, fraudulent_detected, accuracy_rate, alerts_today, total_financial_impact, prevented_losses, avg_processing_time, system_health) VALUES
(CURRENT_DATE, 67284, 189, 98.7, 23, 2847500.00, 1250000.00, 1.2, 'good'),
(CURRENT_DATE - INTERVAL '1 day', 66891, 185, 98.4, 28, 2756000.00, 1180000.00, 1.3, 'good'),
(CURRENT_DATE - INTERVAL '2 days', 66523, 182, 98.6, 19, 2689000.00, 1210000.00, 1.1, 'excellent'),
(CURRENT_DATE - INTERVAL '3 days', 66102, 178, 98.2, 32, 2598000.00, 1150000.00, 1.4, 'good');

-- ============================================================================
-- PRICING INSIGHTS
-- ============================================================================

-- Insert pricing analysis data (matching mock data)
INSERT INTO pricing_insights (category, procedure_codes, average_claim_amount, suspicious_claim_amount, variance_percentage, flagged_claims_count, potential_savings, analysis_date) VALUES
('Orthopedic Procedures', ARRAY['27447', '27130', '63030'], 15420.00, 42800.00, 177.5, 34, 234500.00, CURRENT_DATE),
('Diagnostic Imaging', ARRAY['70553', '73721', '76700'], 2800.00, 8900.00, 218.0, 67, 189000.00, CURRENT_DATE),
('Laboratory Tests', ARRAY['80053', '85025'], 450.00, 1200.00, 166.7, 123, 92250.00, CURRENT_DATE),
('Evaluation & Management', ARRAY['99213', '99214', '99215'], 250.00, 750.00, 200.0, 89, 156000.00, CURRENT_DATE);

-- ============================================================================
-- PROVIDER RISK ASSESSMENTS
-- ============================================================================

-- Insert provider risk assessments
INSERT INTO provider_risk_assessments (provider_id, assessment_date, risk_score, risk_factors, claims_volume_30d, claims_volume_variance, average_claim_amount, flags, reviewer_id) VALUES
('660e8400-e29b-41d4-a716-446655440001', CURRENT_DATE, 8.5,
 '{"billing_pattern_anomaly": true, "volume_spike": 340, "high_value_claims": true, "patient_correlation_issues": true}',
 456, 340.0, 15250.00,
 '{"immediate_attention": true, "audit_recommended": true, "claim_suspension": true}',
 '550e8400-e29b-41d4-a716-446655440002'),

('660e8400-e29b-41d4-a716-446655440002', CURRENT_DATE, 7.2,
 '{"phantom_billing_indicators": true, "patient_visit_mismatches": true, "geographical_anomalies": false}',
 234, 180.0, 8900.00,
 '{"investigation_required": true, "patient_verification_needed": true}',
 '550e8400-e29b-41d4-a716-446655440002'),

('660e8400-e29b-41d4-a716-446655440003', CURRENT_DATE, 3.2,
 '{"duplicate_submissions": true, "timing_issues": false, "amount_consistency": true}',
 189, 45.0, 3250.00,
 '{"minor_issues": true, "routine_monitoring": true}',
 '550e8400-e29b-41d4-a716-446655440003');

-- ============================================================================
-- SYSTEM METRICS
-- ============================================================================

-- Insert system performance metrics
INSERT INTO system_metrics (metric_name, metric_value, metric_unit, recorded_at) VALUES
('ai_model_accuracy', 98.7, 'percentage', NOW()),
('average_processing_time', 1.2, 'seconds', NOW()),
('daily_claims_processed', 2847, 'count', NOW()),
('fraud_detection_rate', 2.8, 'percentage', NOW()),
('false_positive_rate', 1.3, 'percentage', NOW()),
('system_uptime', 99.9, 'percentage', NOW()),
('alert_resolution_time', 2.4, 'hours', NOW()),
('database_query_performance', 0.045, 'seconds', NOW());

-- ============================================================================
-- INVESTIGATION CASES
-- ============================================================================

-- Create investigation cases for critical alerts
INSERT INTO investigation_cases (id, case_number, title, description, severity, status, assigned_investigator, estimated_loss, related_alerts, evidence, findings) VALUES
('bb0e8400-e29b-41d4-a716-446655440001', 'INV-2024-001', 'Metropolitan Medical Center Billing Anomaly',
 'Investigation into unusual billing patterns showing 340% increase in claim volume with identical diagnostic codes',
 'critical', 'investigating', '550e8400-e29b-41d4-a716-446655440003', 125000.00,
 ARRAY['aa0e8400-e29b-41d4-a716-446655440001']::UUID[],
 '{"patient_interviews": 0, "medical_records_reviewed": 15, "billing_documents": 45, "provider_response": "pending"}',
 'Initial analysis shows significant discrepancies between claimed services and available medical documentation. Patient interviews pending.'),

('bb0e8400-e29b-41d4-a716-446655440002', 'INV-2024-002', 'Sunshine Family Practice Phantom Billing',
 'Investigation into services billed for patients with no corresponding visit records',
 'high', 'open', '550e8400-e29b-41d4-a716-446655440003', 85000.00,
 ARRAY['aa0e8400-e29b-41d4-a716-446655440002']::UUID[],
 '{"patient_interviews": 3, "medical_records_reviewed": 8, "location_verification": "in_progress"}',
 'Three patients contacted confirm no services received on billed dates. Location verification in progress.');

-- ============================================================================
-- AUDIT LOG SAMPLES
-- ============================================================================

-- Insert some audit log entries to show system activity
INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'UPDATE', 'alerts', 'aa0e8400-e29b-41d4-a716-446655440001',
 '{"assigned_to": "550e8400-e29b-41d4-a716-446655440003", "status": "investigating"}',
 '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),

('550e8400-e29b-41d4-a716-446655440003', 'INSERT', 'investigation_cases', 'bb0e8400-e29b-41d4-a716-446655440001',
 '{"case_number": "INV-2024-001", "title": "Metropolitan Medical Center Billing Anomaly", "severity": "critical"}',
 '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),

('550e8400-e29b-41d4-a716-446655440001', 'UPDATE', 'providers', '660e8400-e29b-41d4-a716-446655440001',
 '{"is_flagged": true, "risk_score": 8.5}',
 '192.168.1.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- These queries can be used to verify the data was inserted correctly
-- and to test the fraud detection functionality

/*
-- Verify data insertion:
SELECT 'Users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Providers', COUNT(*) FROM providers
UNION ALL
SELECT 'Patients', COUNT(*) FROM patients
UNION ALL
SELECT 'Billing Transactions', COUNT(*) FROM billing_transactions
UNION ALL
SELECT 'Anomalies', COUNT(*) FROM anomalies
UNION ALL
SELECT 'Alerts', COUNT(*) FROM alerts
UNION ALL
SELECT 'Medical Codes', COUNT(*) FROM medical_codes;

-- Test fraud dashboard summary view:
SELECT * FROM fraud_dashboard_summary;

-- Test provider risk analysis view:
SELECT * FROM provider_risk_analysis ORDER BY risk_score DESC;

-- Test active critical alerts view:
SELECT * FROM active_critical_alerts;

-- Sample queries for dashboard data:
SELECT
    severity,
    COUNT(*) as alert_count,
    SUM(estimated_loss) as total_estimated_loss
FROM alerts
WHERE is_resolved = false
GROUP BY severity
ORDER BY
    CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END;
*/