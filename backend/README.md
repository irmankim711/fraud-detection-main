# Fraud Detection Backend API

A minimal but functional Express.js backend API for the fraud detection system. This backend integrates with your existing React frontend and ML service running on port 8001.

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Environment
Copy the `.env.example` to `.env` and configure your Supabase credentials:
```bash
cp .env.example .env
```

The `.env` file should contain:
```
SUPABASE_URL=https://lyqyonyiyknbnljynwkn.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=5000
NODE_ENV=development
ML_SERVICE_URL=http://localhost:8001
```

### 3. Start the Server

**Option A: Simple JavaScript version (immediate testing)**
```bash
npm start
# or
node src/server.js
```

**Option B: Full TypeScript version (with fraud detection)**
```bash
npm run dev:ts
# or
npx ts-node src/server.ts
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
- `GET /` - Basic server info
- `GET /api/health` - Simple health check
- `GET /api/health/detailed` - Detailed health check with service status

### Transactions
- `GET /api/transactions` - Fetch all transactions (with pagination)
- `POST /api/transactions` - Create new transaction with fraud analysis
- `GET /api/transactions/:id` - Get specific transaction
- `POST /api/transactions/:id/analyze` - Re-run fraud detection
- `GET /api/transactions/:id/anomalies` - Get anomalies for transaction

### Alerts
- `GET /api/alerts` - Fetch all alerts (with filtering)
- `GET /api/alerts/:id` - Get specific alert
- `PUT /api/alerts/:id/resolve` - Mark alert as resolved
- `GET /api/alerts/stats` - Get alert statistics

## Integration with Frontend

The backend is configured with CORS to work with your React frontend on port 3000. Update your frontend API calls to point to:
```
http://localhost:5000/api/
```

## Integration with ML Service

The backend connects to your existing ML service on port 8001. Make sure your ML service is running before starting the backend for full fraud detection functionality.

## Architecture

```
backend/
├── src/
│   ├── lib/
│   │   └── supabase.ts          # Supabase client configuration
│   ├── services/
│   │   ├── fraudDetectionService.ts  # Main fraud detection logic
│   │   └── mlFraudService.ts          # ML service integration
│   ├── routes/
│   │   ├── transactions.ts      # Transaction endpoints
│   │   ├── alerts.ts           # Alert endpoints
│   │   └── health.ts           # Health check endpoints
│   ├── server.ts               # Main TypeScript server
│   └── server.js               # Simple JavaScript server
├── package.json
├── tsconfig.json
└── .env
```

## Features

✅ **Essential Features Implemented:**
- Express.js API server on port 5000
- CORS configured for React frontend
- Supabase integration for database operations
- ML service integration (port 8001)
- Transaction CRUD operations
- Fraud detection analysis
- Alert management
- Health monitoring
- Request logging
- Error handling

## Next Steps

1. **Test Integration**: Verify the React frontend can connect to this backend
2. **Add Authentication**: Implement JWT or session-based auth as needed
3. **Add Validation**: Enhance input validation for API endpoints
4. **Add Tests**: Create unit and integration tests
5. **Production Setup**: Configure for production deployment

## Development Notes

- The simplified `server.js` version is for immediate testing
- The full `server.ts` version includes complete fraud detection functionality
- All fraud detection logic from the frontend has been migrated to the backend
- The ML service integration maintains the same timeout and fallback behavior