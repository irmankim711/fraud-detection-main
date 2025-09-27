"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const mlFraudService_1 = require("../services/mlFraudService");
const router = (0, express_1.Router)();
// GET /api/health - Basic health check
router.get('/', async (req, res) => {
    try {
        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            services: {
                database: 'unknown',
                ml_service: 'unknown'
            }
        };
        // Check Supabase connection
        try {
            const { data, error } = await supabase_1.supabase
                .from('billing_transactions')
                .select('id')
                .limit(1);
            healthData.services.database = error ? 'error' : 'healthy';
        }
        catch (error) {
            healthData.services.database = 'error';
        }
        // Check ML service connection
        try {
            const isMLServiceAvailable = await mlFraudService_1.mlFraudService.isServiceAvailable();
            healthData.services.ml_service = isMLServiceAvailable ? 'healthy' : 'unavailable';
        }
        catch (error) {
            healthData.services.ml_service = 'error';
        }
        // Determine overall status
        const hasErrors = Object.values(healthData.services).some(status => status === 'error');
        if (hasErrors) {
            healthData.status = 'degraded';
        }
        const statusCode = healthData.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json({
            success: true,
            data: healthData
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            success: false,
            data: {
                status: 'error',
                timestamp: new Date().toISOString(),
                error: 'Health check failed'
            }
        });
    }
});
// GET /api/health/detailed - Detailed health check with metrics
router.get('/detailed', async (req, res) => {
    try {
        const startTime = Date.now();
        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            services: {
                database: { status: 'unknown', response_time_ms: 0 },
                ml_service: { status: 'unknown', response_time_ms: 0 }
            },
            stats: {
                total_transactions: 0,
                total_anomalies: 0,
                unresolved_alerts: 0
            }
        };
        // Check Supabase connection with timing
        const dbStartTime = Date.now();
        try {
            const { data, error } = await supabase_1.supabase
                .from('billing_transactions')
                .select('id')
                .limit(1);
            healthData.services.database.response_time_ms = Date.now() - dbStartTime;
            healthData.services.database.status = error ? 'error' : 'healthy';
            // Get basic stats if database is healthy
            if (!error) {
                const [transactionCount, anomalyCount, alertCount] = await Promise.all([
                    supabase_1.supabase.from('billing_transactions').select('*', { count: 'exact', head: true }),
                    supabase_1.supabase.from('anomalies').select('*', { count: 'exact', head: true }),
                    supabase_1.supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('is_resolved', false)
                ]);
                healthData.stats.total_transactions = transactionCount.count || 0;
                healthData.stats.total_anomalies = anomalyCount.count || 0;
                healthData.stats.unresolved_alerts = alertCount.count || 0;
            }
        }
        catch (error) {
            healthData.services.database.response_time_ms = Date.now() - dbStartTime;
            healthData.services.database.status = 'error';
        }
        // Check ML service connection with timing
        const mlStartTime = Date.now();
        try {
            const isMLServiceAvailable = await mlFraudService_1.mlFraudService.isServiceAvailable();
            healthData.services.ml_service.response_time_ms = Date.now() - mlStartTime;
            healthData.services.ml_service.status = isMLServiceAvailable ? 'healthy' : 'unavailable';
        }
        catch (error) {
            healthData.services.ml_service.response_time_ms = Date.now() - mlStartTime;
            healthData.services.ml_service.status = 'error';
        }
        // Determine overall status
        const dbStatus = healthData.services.database.status;
        const mlStatus = healthData.services.ml_service.status;
        if (dbStatus === 'error') {
            healthData.status = 'critical'; // Database is critical
        }
        else if (mlStatus === 'error') {
            healthData.status = 'degraded'; // ML service error is degraded but not critical
        }
        else if (mlStatus === 'unavailable') {
            healthData.status = 'healthy'; // ML service unavailable is acceptable
        }
        const statusCode = healthData.status === 'healthy' ? 200 :
            healthData.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json({
            success: true,
            data: healthData
        });
    }
    catch (error) {
        console.error('Detailed health check error:', error);
        res.status(503).json({
            success: false,
            data: {
                status: 'error',
                timestamp: new Date().toISOString(),
                error: 'Detailed health check failed'
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=health.js.map