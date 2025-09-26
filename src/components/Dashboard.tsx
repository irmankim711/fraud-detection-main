import React from 'react';

export function Dashboard() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Fraud Detection Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor transactions and fraud alerts in real-time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Total Transactions</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">24,567</p>
          <p className="text-green-600 text-sm mt-1">↗ +12% from last month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Fraud Alerts</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">89</p>
          <p className="text-red-600 text-sm mt-1">↗ +5% from last week</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Risk Score</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">7.2</p>
          <p className="text-yellow-600 text-sm mt-1">Medium risk level</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Success Rate</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">94.3%</p>
          <p className="text-green-600 text-sm mt-1">↗ Detection accuracy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded">
              <div>
                <p className="font-medium text-red-900">High-risk transaction</p>
                <p className="text-sm text-red-600">Transaction ID: TXN-001234</p>
              </div>
              <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-sm">Critical</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
              <div>
                <p className="font-medium text-yellow-900">Suspicious pattern</p>
                <p className="text-sm text-yellow-600">User ID: USR-5678</p>
              </div>
              <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-sm">Medium</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded">
              <div>
                <p className="font-medium text-orange-900">Velocity check failed</p>
                <p className="text-sm text-orange-600">Card: ****1234</p>
              </div>
              <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-sm">Low</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Volume</h3>
          <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
            <p className="text-gray-500">Chart placeholder - Transaction volume over time</p>
          </div>
        </div>
      </div>
    </div>
  );
}