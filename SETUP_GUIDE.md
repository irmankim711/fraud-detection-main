# Fraud Detection Application - Complete Setup Guide

## 🚀 Quick Start for MVP Demo

This guide will get your fraud detection application running with a fully populated database and working authentication in under 30 minutes.

## 📋 Prerequisites

- Node.js 16+ installed
- A Supabase account (free tier works)
- Basic familiarity with SQL and React

## 🔧 Step 1: Supabase Project Setup

### 1.1 Create Supabase Project
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project name: "fraud-detection"
5. Create a strong database password
6. Select region closest to you
7. Click "Create new project"

### 1.2 Get Your Credentials
1. Wait for project to finish setting up
2. Go to Settings → API
3. Copy your Project URL and anon public key

## 🗃️ Step 2: Database Setup

### 2.1 Execute SQL Scripts
In your Supabase dashboard, go to the SQL Editor and execute these scripts **in order**:

#### Script 1: Schema Setup
```sql
-- Copy and paste the entire contents of database/01_schema.sql
-- This creates all tables, indexes, functions, and triggers
```

#### Script 2: Security Setup
```sql
-- Copy and paste the entire contents of database/02_security.sql
-- This enables RLS and creates security policies
```

#### Script 3: Sample Data
```sql
-- Copy and paste the entire contents of database/03_sample_data.sql
-- This populates the database with realistic test data
```

#### Script 4: Authentication Integration
```sql
-- Copy and paste the entire contents of database/04_auth_sync.sql
-- This syncs Supabase Auth with your custom users table
```

#### Script 5: Verification (Optional)
```sql
-- Copy and paste the entire contents of database/99_verification.sql
-- This verifies your setup is complete
```

### 2.2 Verify Database Setup
After running the scripts, you should see:
- ✅ 13+ tables created
- ✅ 30+ RLS policies active
- ✅ Sample data populated
- ✅ Auth triggers installed

## 👤 Step 3: Create Demo Users

### 3.1 Create Users in Supabase Auth
Go to Authentication → Users in your Supabase dashboard and create these users:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| `admin@frauddetect.com` | `Demo123!` | Admin | Full system access, user management |
| `analyst@frauddetect.com` | `Demo123!` | Analyst | Data analysis, fraud investigation management |
| `investigator@frauddetect.com` | `Demo123!` | Investigator | Case management, alert handling |
| `viewer@frauddetect.com` | `Demo123!` | Viewer | Dashboard access, read-only data |

### 3.2 User Creation Process
1. Click "Add user" → "Create a new user"
2. Enter email and password
3. Leave "Auto Confirm User" checked
4. Click "Create user"
5. Repeat for all 4 users

**Note**: The users will automatically get the correct roles based on their email addresses thanks to the auth sync function.

## ⚙️ Step 4: Application Configuration

### 4.1 Update Environment Variables
1. Copy `.env.example` to `.env`
2. Update with your Supabase credentials:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4.2 Install Dependencies
```bash
npm install
```

### 4.3 Start the Application
```bash
npm start
```

## 🧪 Step 5: Test the Demo

### 5.1 Login Test
1. Navigate to `http://localhost:3000`
2. Try logging in with each demo user:
   - Admin: `admin@frauddetect.com` / `Demo123!`
   - Analyst: `analyst@frauddetect.com` / `Demo123!`
   - Investigator: `investigator@frauddetect.com` / `Demo123!`
   - Viewer: `viewer@frauddetect.com` / `Demo123!`

### 5.2 Feature Test Checklist
- [ ] Dashboard loads with real-time metrics
- [ ] Critical alerts are displayed
- [ ] Transaction history shows sample data
- [ ] User roles affect data visibility
- [ ] Fraud detection charts render properly
- [ ] Alert management works
- [ ] Provider risk analysis displays

## 📊 Demo Data Overview

Your application now includes:

### Users & Authentication
- 4 demo users with different role levels
- Automatic role assignment based on email
- Secure authentication with Supabase Auth

### Healthcare Providers
- 5 sample healthcare providers
- Risk scores from 1.8 to 8.5
- 2 flagged high-risk providers

### Billing Transactions
- 8 sample transactions
- Mix of approved, pending, and suspicious claims
- Amounts ranging from $45 to $125,000

### Fraud Detection Data
- 4 detected anomalies with AI analysis
- 4 active alerts requiring investigation
- Confidence scores from 87% to 98%

### Real-time Metrics
- Daily fraud detection statistics
- System performance metrics
- Cost variance analysis
- Investigation case tracking

## 🔐 Security Features

Your demo includes enterprise-grade security:

### Row Level Security (RLS)
- All tables protected with RLS policies
- Role-based data access control
- Automatic audit logging

### User Roles & Permissions
- **Admin**: Full system access, user management
- **Analyst**: Data analysis, investigation management
- **Investigator**: Case management, alert handling
- **Viewer**: Dashboard access, read-only data

### Data Protection
- Patient data masked for lower-privilege users
- Sensitive information access logged
- Comprehensive audit trails

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Missing Supabase environment variables"
- **Solution**: Ensure `.env` file exists with correct credentials
- **Check**: File should be in project root, not in `.env.example`

#### 2. "Row Level Security policy violation"
- **Solution**: Verify all SQL scripts were executed in order
- **Check**: Run verification script to confirm RLS policies

#### 3. "No data in dashboard"
- **Solution**: Confirm sample data script was executed
- **Check**: Verify users are created in Supabase Auth

#### 4. Login fails with valid credentials
- **Solution**: Check if auth sync triggers are installed
- **Check**: Users should appear in both Supabase Auth and custom users table

### Verification Commands

Run these in Supabase SQL Editor to diagnose issues:

```sql
-- Check if all tables exist
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Should return 13+

-- Check if sample data is loaded
SELECT COUNT(*) as user_count FROM users;
-- Should return 4

-- Check if RLS is enabled
SELECT COUNT(*) as rls_count
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
-- Should return 13+

-- Verify auth triggers
SELECT COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE trigger_name LIKE 'on_auth_user%';
-- Should return 3
```

## 🎯 Next Steps

After completing the setup:

1. **Customize the Data**: Modify sample data to match your use case
2. **Add Real Integrations**: Connect to actual healthcare data sources
3. **Enhance AI Models**: Integrate with real ML fraud detection services
4. **Scale the Database**: Implement partitioning for large datasets
5. **Deploy to Production**: Set up staging and production environments

## 📞 Support

If you encounter issues:

1. **Check the verification script output**: Run `database/99_verification.sql`
2. **Review Supabase logs**: Check the Logs section in your dashboard
3. **Validate your .env**: Ensure all required variables are set
4. **Test individual components**: Verify auth, database, and frontend separately

## 🎉 Success!

You now have a fully functional fraud detection application with:
- ✅ Enterprise-grade PostgreSQL database
- ✅ Secure authentication system
- ✅ Role-based access control
- ✅ Real-time fraud detection dashboard
- ✅ Comprehensive sample data
- ✅ Production-ready security features

Your application is ready for demonstrations, further development, or as a foundation for a production fraud detection system.

---

**Demo Credentials Quick Reference:**
- Admin: `admin@frauddetect.com` / `Demo123!`
- Analyst: `analyst@frauddetect.com` / `Demo123!`
- Investigator: `investigator@frauddetect.com` / `Demo123!`
- Viewer: `viewer@frauddetect.com` / `Demo123!`