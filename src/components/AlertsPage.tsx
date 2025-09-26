import React, { useState } from 'react';

interface Alert {
  id: string;
  type: 'fraud' | 'velocity' | 'pattern' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: string;
  transactionId?: string;
  userId?: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
}

const mockAlerts: Alert[] = [
  {
    id: 'ALERT-001',
    type: 'fraud',
    severity: 'critical',
    title: 'Suspected Card Fraud',
    description: 'Multiple high-value transactions from different geographic locations within 30 minutes',
    timestamp: '2023-12-15 15:45:30',
    transactionId: 'TXN-001236',
    userId: 'USR-12345',
    status: 'open'
  },
  {
    id: 'ALERT-002',
    type: 'velocity',
    severity: 'high',
    title: 'Transaction Velocity Exceeded',
    description: 'User exceeded maximum transaction count per hour (15 transactions)',
    timestamp: '2023-12-15 14:22:15',
    transactionId: 'TXN-001228',
    userId: 'USR-67890',
    status: 'investigating'
  },
  {
    id: 'ALERT-003',
    type: 'pattern',
    severity: 'medium',
    title: 'Unusual Purchase Pattern',
    description: 'First-time purchase at high-risk merchant category',
    timestamp: '2023-12-15 13:10:45',
    transactionId: 'TXN-001220',
    userId: 'USR-54321',
    status: 'resolved'
  },
  {
    id: 'ALERT-004',
    type: 'system',
    severity: 'low',
    title: 'Model Performance Degradation',
    description: 'Fraud detection model accuracy dropped below threshold (92%)',
    timestamp: '2023-12-15 12:00:00',
    status: 'dismissed'
  }
];

export function AlertsPage() {
  const [alerts] = useState<Alert[]>(mockAlerts);
  const [filter, setFilter] = useState<'all' | Alert['severity']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Alert['status']>('all');

  const filteredAlerts = alerts.filter(alert => {
    const severityMatch = filter === 'all' || alert.severity === filter;
    const statusMatch = statusFilter === 'all' || alert.status === statusFilter;
    return severityMatch && statusMatch;
  });

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: Alert['status']) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'investigating':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: Alert['type']) => {
    switch (type) {
      case 'fraud':
        return '🚨';
      case 'velocity':
        return '⚡';
      case 'pattern':
        return '🔍';
      case 'system':
        return '⚙️';
      default:
        return '📋';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Fraud Alerts</h1>
        <p className="text-gray-600 mt-2">Monitor and manage fraud detection alerts</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | Alert['severity'])}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | Alert['status'])}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🚨</span>
            <div>
              <p className="text-red-800 font-semibold">Critical</p>
              <p className="text-red-600 text-2xl font-bold">
                {alerts.filter(a => a.severity === 'critical').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <p className="text-orange-800 font-semibold">High</p>
              <p className="text-orange-600 text-2xl font-bold">
                {alerts.filter(a => a.severity === 'high').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚡</span>
            <div>
              <p className="text-yellow-800 font-semibold">Medium</p>
              <p className="text-yellow-600 text-2xl font-bold">
                {alerts.filter(a => a.severity === 'medium').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">ℹ️</span>
            <div>
              <p className="text-blue-800 font-semibold">Low</p>
              <p className="text-blue-600 text-2xl font-bold">
                {alerts.filter(a => a.severity === 'low').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <div key={alert.id} className={`bg-white p-6 rounded-lg shadow border-l-4 ${getSeverityColor(alert.severity)}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <span className="text-2xl">{getTypeIcon(alert.type)}</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                      {alert.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{alert.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Alert ID: {alert.id}</span>
                    {alert.transactionId && <span>Transaction: {alert.transactionId}</span>}
                    {alert.userId && <span>User: {alert.userId}</span>}
                    <span>{alert.timestamp}</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200">
                  Investigate
                </button>
                <button className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200">
                  Resolve
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-500 text-lg">No alerts match the current filters</p>
        </div>
      )}
    </div>
  );
}