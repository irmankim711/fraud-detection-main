import React, { useState, useEffect } from 'react';

interface RealTimeEvent {
  id: string;
  type: 'fraud_detected' | 'anomaly_alert' | 'system_notification' | 'high_risk_claim';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  metadata?: Record<string, any>;
}

interface SystemStats {
  activeMonitors: number;
  claimsProcessing: number;
  alertsGenerated: number;
  systemLoad: number;
  detectionRate: number;
}

export function RealTimeMonitor() {
  const [events, setEvents] = useState<RealTimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [stats, setStats] = useState<SystemStats>({
    activeMonitors: 12,
    claimsProcessing: 847,
    alertsGenerated: 23,
    systemLoad: 68,
    detectionRate: 98.7
  });

  // Simulate real-time events
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected && Math.random() > 0.7) {
        const newEvent: RealTimeEvent = {
          id: `evt-${Date.now()}`,
          type: ['fraud_detected', 'anomaly_alert', 'system_notification', 'high_risk_claim'][Math.floor(Math.random() * 4)] as any,
          severity: ['critical', 'high', 'medium', 'low'][Math.floor(Math.random() * 4)] as any,
          title: 'New Fraud Alert',
          message: 'Suspicious billing pattern detected in provider network',
          timestamp: new Date().toISOString(),
          source: `PROV-${Math.floor(Math.random() * 9999)}`,
        };

        setEvents(prev => [newEvent, ...prev.slice(0, 19)]); // Keep last 20 events
      }

      // Update stats
      setStats(prev => ({
        ...prev,
        claimsProcessing: prev.claimsProcessing + Math.floor(Math.random() * 10 - 5),
        alertsGenerated: prev.alertsGenerated + Math.floor(Math.random() * 2),
        systemLoad: Math.max(10, Math.min(95, prev.systemLoad + Math.floor(Math.random() * 10 - 5))),
        detectionRate: Math.max(90, Math.min(100, prev.detectionRate + (Math.random() - 0.5) * 0.5))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const getEventIcon = (type: RealTimeEvent['type']) => {
    switch (type) {
      case 'fraud_detected': return '🚨';
      case 'anomaly_alert': return '⚠️';
      case 'system_notification': return '📋';
      case 'high_risk_claim': return '🔴';
      default: return '📌';
    }
  };

  const getSeverityColor = (severity: RealTimeEvent['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Real-Time Monitoring</h3>
            <p className="text-gray-600 mt-1">Live fraud detection events and system status</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}></div>
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <button
              onClick={() => setIsConnected(!isConnected)}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
            >
              {isConnected ? 'Pause' : 'Resume'}
            </button>
          </div>
        </div>
      </div>

      {/* System Stats */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.activeMonitors}</p>
            <p className="text-xs text-gray-600">Active Monitors</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.claimsProcessing}</p>
            <p className="text-xs text-gray-600">Claims Processing</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{stats.alertsGenerated}</p>
            <p className="text-xs text-gray-600">Alerts Generated</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.systemLoad}%</p>
            <p className="text-xs text-gray-600">System Load</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">{stats.detectionRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-600">Detection Rate</p>
          </div>
        </div>
      </div>

      {/* Real-time Events Feed */}
      <div className="p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Live Event Feed</h4>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">👁️</div>
              <p>Monitoring for fraud events...</p>
              <p className="text-sm mt-1">Events will appear here in real-time</p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border ${getSeverityColor(event.severity)}`}
              >
                <span className="text-lg">{getEventIcon(event.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-900 truncate">{event.title}</h5>
                    <span className="text-xs text-gray-500 ml-2">{formatTime(event.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{event.message}</p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>Source: {event.source}</span>
                    <span className={`px-2 py-1 rounded-full font-medium ${getSeverityColor(event.severity)}`}>
                      {event.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Last update: {new Date().toLocaleTimeString()}
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200 transition-colors">
              Export Events
            </button>
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors">
              Configure Alerts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}