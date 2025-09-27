# Fraud Detection Database Setup Guide

This directory contains the complete PostgreSQL database schema for the healthcare fraud detection application. The schema is designed to work with Supabase and includes comprehensive fraud detection capabilities, real-time monitoring, and security features.

## Files Overview

- **01_schema.sql**: Complete database schema with tables, indexes, functions, and triggers
- **02_security.sql**: Row Level Security (RLS) policies and security functions
- **03_sample_data.sql**: Realistic test data that matches your mock data structure
- **README.md**: This setup guide

## Setup Instructions

### 1. Access Your Supabase Database

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to the SQL Editor

### 2. Run the Schema Files in Order

Execute the SQL files in the following order:

#### Step 1: Create Schema and Tables
```sql
-- Copy and paste the contents of 01_schema.sql into the SQL Editor
-- This creates all tables, indexes, functions, and triggers
```

#### Step 2: Setup Security
```sql
-- Copy and paste the contents of 02_security.sql into the SQL Editor
-- This enables RLS and creates security policies
```

#### Step 3: Insert Sample Data
```sql
-- Copy and paste the contents of 03_sample_data.sql into the SQL Editor
-- This populates the database with realistic test data
```

### 3. Verify Installation

After running all scripts, verify the setup by running these queries:

```sql
-- Check table creation
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;

-- Verify sample data
SELECT 'Users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Providers', COUNT(*) FROM providers
UNION ALL
SELECT 'Billing Transactions', COUNT(*) FROM billing_transactions
UNION ALL
SELECT 'Alerts', COUNT(*) FROM alerts;

-- Test fraud dashboard view
SELECT * FROM fraud_dashboard_summary;
```

## Schema Overview

### Core Tables

- **users**: Application users with role-based access control
- **providers**: Healthcare providers with risk assessments
- **patients**: Patient information with privacy protections
- **billing_transactions**: Core transaction data with fraud scoring
- **anomalies**: AI-detected fraud patterns
- **alerts**: Human-readable fraud alerts

### Supporting Tables

- **medical_codes**: Standardized medical procedure/diagnosis codes
- **transaction_items**: Line items for billing transactions
- **metrics_snapshots**: Daily fraud detection metrics
- **pricing_insights**: Cost variance analysis
- **investigation_cases**: Formal fraud investigations
- **audit_logs**: Complete audit trail
- **provider_risk_assessments**: Provider risk evaluations

### Key Features

1. **Automated Risk Scoring**: Transactions automatically receive risk scores based on amount, provider history, and procedure codes
2. **Real-time Anomaly Detection**: AI-powered fraud detection with confidence scoring
3. **Role-based Security**: Comprehensive RLS policies for data protection
4. **Audit Trail**: Complete logging of all system actions
5. **Performance Optimization**: Strategic indexes for fast queries
6. **Fraud Pattern Views**: Pre-built views for dashboard queries

## Security Model

The database implements a four-tier user role system:

- **Admin**: Full system access, user management
- **Analyst**: Data analysis, fraud investigation management
- **Investigator**: Case management, alert handling
- **Viewer**: Dashboard access, read-only data

### Row Level Security

All tables have RLS enabled with policies that:
- Protect sensitive patient data
- Ensure users only access appropriate data
- Log access to sensitive information
- Support the fraud detection workflow

## Integration with Your Application

### Environment Variables

Update your `.env` file:
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Sample Queries for Your Components

#### Dashboard Metrics (replaces mockRealTimeMetrics)
```sql
SELECT * FROM metrics_snapshots WHERE snapshot_date = CURRENT_DATE;
```

#### Critical Alerts (replaces mockCriticalAlerts)
```sql
SELECT * FROM active_critical_alerts LIMIT 10;
```

#### Pricing Insights (replaces mockPricingInsights)
```sql
SELECT * FROM pricing_insights WHERE analysis_date = CURRENT_DATE;
```

#### Transaction Data (replaces mockTransactions)
```sql
SELECT
    transaction_id as id,
    amount,
    currency,
    'Healthcare Provider' as merchant,
    transaction_date as timestamp,
    status,
    risk_score as riskScore
FROM billing_transactions
ORDER BY transaction_date DESC
LIMIT 20;
```

## Maintenance and Monitoring

### Regular Maintenance Tasks

1. **Daily Metrics Updates**: The system automatically calculates daily metrics
2. **Risk Score Recalculation**: Provider risk scores update based on new claims
3. **Alert Management**: Assign and resolve alerts through the investigation workflow
4. **Audit Log Cleanup**: Archive old audit logs (retain as per compliance requirements)

### Performance Monitoring

Monitor these key metrics:
- Query performance on high-traffic tables
- Index usage and effectiveness
- RLS policy performance
- Fraud detection accuracy rates

### Scaling Considerations

As your data grows, consider:
- Partitioning large tables by date
- Creating additional indexes for new query patterns
- Archiving old transaction data
- Implementing read replicas for analytics

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Ensure users are properly authenticated and have appropriate roles
2. **Permission Denied**: Check that the user role has the necessary permissions
3. **Missing Data**: Verify that foreign key relationships are maintained
4. **Performance Issues**: Check index usage with EXPLAIN ANALYZE

### Support

For issues with this schema:
1. Check the Supabase logs in your dashboard
2. Verify all three SQL files were executed successfully
3. Ensure your application is using the updated TypeScript types
4. Test the security policies with different user roles

## Data Privacy and Compliance

This schema is designed with healthcare data privacy in mind:
- Patient data is protected with enhanced RLS policies
- Sensitive information is masked for lower-privilege users
- Complete audit trails support compliance requirements
- Data access is logged for security monitoring

Remember to review and adjust the security policies based on your specific compliance requirements (HIPAA, GDPR, etc.).