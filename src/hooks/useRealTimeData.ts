import { useState, useEffect } from 'react';
import { supabase, transformMetricsForDashboard, transformAlertsForDashboard, RealTimeMetrics, FraudAlert, PricingInsight } from '../lib/supabase';

export function useRealTimeMetrics() {
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('metrics_snapshots')
        .select('*')
        .eq('snapshot_date', new Date().toISOString().split('T')[0])
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setMetrics(transformMetricsForDashboard(data));
      } else {
        // If no metrics for today, create default metrics
        setMetrics({
          totalClaims: 0,
          fraudulentDetected: 0,
          accuracyRate: 98.7,
          alertsToday: 0,
          totalFinancialImpact: 0,
          preventedLosses: 0,
          avgProcessingTime: 1.2,
          systemHealth: 'good',
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Set up real-time subscription
    const subscription = supabase
      .channel('metrics_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'metrics_snapshots'
      }, () => {
        fetchMetrics();
      })
      .subscribe();

    // Update every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return { metrics, loading, error, refetch: fetchMetrics };
}

export function useCriticalAlerts() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('active_critical_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        setAlerts(transformAlertsForDashboard(data));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Set up real-time subscription
    const subscription = supabase
      .channel('alerts_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alerts'
      }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { alerts, loading, error, refetch: fetchAlerts };
}

export function usePricingInsights() {
  const [insights, setInsights] = useState<PricingInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_insights')
        .select('*')
        .eq('analysis_date', new Date().toISOString().split('T')[0])
        .order('potential_savings', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (data) {
        setInsights(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pricing insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();

    // Set up real-time subscription
    const subscription = supabase
      .channel('pricing_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pricing_insights'
      }, () => {
        fetchInsights();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { insights, loading, error, refetch: fetchInsights };
}