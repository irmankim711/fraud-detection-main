import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Import routes
import transactionRoutes from './routes/transactions';
import alertRoutes from './routes/alerts';
import healthRoutes from './routes/health';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration for React frontend
app.use(cors({
  origin: [
    'http://localhost:3000',  // React development server
    'http://127.0.0.1:3000',
    'http://localhost:3001',  // Alternative React port
    process.env.FRONTEND_URL  // Production frontend URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/alerts', alertRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Fraud Detection Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      transactions: '/api/transactions',
      alerts: '/api/alerts'
    }
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    available_endpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/health/detailed',
      'GET /api/transactions',
      'POST /api/transactions',
      'GET /api/transactions/:id',
      'POST /api/transactions/:id/analyze',
      'GET /api/transactions/:id/anomalies',
      'GET /api/alerts',
      'GET /api/alerts/:id',
      'PUT /api/alerts/:id/resolve',
      'GET /api/alerts/stats'
    ]
  });
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Fraud Detection Backend API Started');
  console.log('=====================================');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`  💳 Transactions: http://localhost:${PORT}/api/transactions`);
  console.log(`  🚨 Alerts: http://localhost:${PORT}/api/alerts`);
  console.log('');
  console.log('Ready to accept requests from React frontend on port 3000');
  console.log('=====================================');
});

export default app;