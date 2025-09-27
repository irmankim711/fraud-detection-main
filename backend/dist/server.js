"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
// Import routes
const transactions_1 = __importDefault(require("./routes/transactions"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const health_1 = __importDefault(require("./routes/health"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Security middleware
app.use((0, helmet_1.default)());
// CORS configuration for React frontend
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3000', // React development server
        'http://127.0.0.1:3000',
        'http://localhost:3001', // Alternative React port
        process.env.FRONTEND_URL // Production frontend URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
    next();
});
// API Routes
app.use('/api/health', health_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/alerts', alerts_1.default);
// Root endpoint
app.get('/', (req, res) => {
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
app.use('*', (req, res) => {
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
app.use((error, req, res, next) => {
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
exports.default = app;
//# sourceMappingURL=server.js.map