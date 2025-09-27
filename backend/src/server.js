const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const net = require('net');
require('dotenv').config();

// Since we're using a simple JS version for immediate testing
const app = express();

// Function to check if port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
};

// Function to find available port
const findAvailablePort = async (startPort = 5000, maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
};

// Get preferred port from environment or default
const PREFERRED_PORT = parseInt(process.env.PORT) || 5000;

// Security middleware
app.use(helmet());

// CORS configuration for React frontend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Fraud Detection Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'Server is running successfully!',
    note: 'This is a simplified version for immediate testing. Full TypeScript version available.'
  });
});

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      message: 'Backend server is running and ready to accept requests'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    available_endpoints: [
      'GET /',
      'GET /api/health'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server with graceful port handling
const startServer = async () => {
  try {
    let PORT;

    // Check if preferred port is available
    if (await isPortAvailable(PREFERRED_PORT)) {
      PORT = PREFERRED_PORT;
      console.log(`✅ Preferred port ${PREFERRED_PORT} is available`);
    } else {
      console.log(`⚠️  Port ${PREFERRED_PORT} is already in use, finding alternative...`);
      PORT = await findAvailablePort(PREFERRED_PORT + 1);
      console.log(`✅ Found available port: ${PORT}`);
    }

    // Start the server
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('🚀 Fraud Detection Backend API Started');
      console.log('=====================================');
      console.log(`📍 Server running on: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔧 Preferred port: ${PREFERRED_PORT} ${PORT === PREFERRED_PORT ? '(in use)' : '(was occupied)'}`);
      console.log('');
      console.log('Available endpoints:');
      console.log(`  🏠 Home: http://localhost:${PORT}/`);
      console.log(`  🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log('');
      console.log('✅ Ready to accept requests from React frontend');
      console.log(`💡 Update your frontend to connect to: http://localhost:${PORT}`);
      console.log('=====================================');
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
      console.log(`\n📛 Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    return server;

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;