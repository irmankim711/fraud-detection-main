"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
// GET /api/alerts - Fetch all alerts with optional filtering
router.get('/', async (req, res) => {
    try {
        const { page = '1', limit = '50', severity, is_resolved, start_date, end_date } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        let query = supabase_1.supabase
            .from('alerts')
            .select(`
        *,
        anomalies (
          *,
          billing_transactions (*)
        )
      `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limitNum - 1);
        // Apply filters
        if (severity) {
            query = query.eq('severity', severity);
        }
        if (is_resolved !== undefined) {
            query = query.eq('is_resolved', is_resolved === 'true');
        }
        if (start_date) {
            query = query.gte('created_at', start_date);
        }
        if (end_date) {
            query = query.lte('created_at', end_date);
        }
        const { data: alerts, error } = await query;
        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch alerts',
                details: error.message
            });
        }
        // Get total count for pagination
        const { count: totalCount } = await supabase_1.supabase
            .from('alerts')
            .select('*', { count: 'exact', head: true });
        res.json({
            success: true,
            data: alerts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount || 0,
                pages: Math.ceil((totalCount || 0) / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// GET /api/alerts/:id - Fetch specific alert
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: alert, error } = await supabase_1.supabase
            .from('alerts')
            .select(`
        *,
        anomalies (
          *,
          billing_transactions (*)
        )
      `)
            .eq('id', id)
            .single();
        if (error || !alert) {
            return res.status(404).json({
                success: false,
                error: 'Alert not found'
            });
        }
        res.json({
            success: true,
            data: alert
        });
    }
    catch (error) {
        console.error('Error fetching alert:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// PUT /api/alerts/:id/resolve - Mark alert as resolved
router.put('/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution_notes } = req.body;
        const { data: alert, error } = await supabase_1.supabase
            .from('alerts')
            .update({
            is_resolved: true,
            resolved_at: new Date().toISOString(),
            resolution_notes
        })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Failed to resolve alert',
                details: error.message
            });
        }
        if (!alert) {
            return res.status(404).json({
                success: false,
                error: 'Alert not found'
            });
        }
        res.json({
            success: true,
            data: alert
        });
    }
    catch (error) {
        console.error('Error resolving alert:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// GET /api/alerts/stats - Get alert statistics
router.get('/stats', async (req, res) => {
    try {
        // Get counts by severity
        const { data: severityStats, error: severityError } = await supabase_1.supabase
            .from('alerts')
            .select('severity')
            .eq('is_resolved', false);
        if (severityError) {
            throw severityError;
        }
        const severityCounts = severityStats.reduce((acc, alert) => {
            acc[alert.severity] = (acc[alert.severity] || 0) + 1;
            return acc;
        }, {});
        // Get total counts
        const { count: totalAlerts } = await supabase_1.supabase
            .from('alerts')
            .select('*', { count: 'exact', head: true });
        const { count: unresolvedAlerts } = await supabase_1.supabase
            .from('alerts')
            .select('*', { count: 'exact', head: true })
            .eq('is_resolved', false);
        res.json({
            success: true,
            data: {
                total_alerts: totalAlerts || 0,
                unresolved_alerts: unresolvedAlerts || 0,
                severity_breakdown: {
                    critical: severityCounts.critical || 0,
                    high: severityCounts.high || 0,
                    medium: severityCounts.medium || 0,
                    low: severityCounts.low || 0
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching alert stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=alerts.js.map