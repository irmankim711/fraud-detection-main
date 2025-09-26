import React from 'react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navigationItems = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: '📊',
    description: 'Overview and analytics'
  },
  {
    id: 'transactions',
    name: 'Transactions',
    icon: '💳',
    description: 'Transaction monitoring'
  },
  {
    id: 'alerts',
    name: 'Alerts',
    icon: '🚨',
    description: 'Fraud alerts and notifications'
  },
  {
    id: 'download',
    name: 'Reports',
    icon: '📥',
    description: 'Download data and reports'
  }
];

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-6">
      {/* Logo/Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">FraudGuard</h1>
        <p className="text-gray-400 text-sm">Fraud Detection System</p>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition duration-200 ${
              currentPage === item.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="text-xl mr-3">{item.icon}</span>
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-xs text-gray-400">{item.description}</div>
            </div>
          </button>
        ))}
      </nav>

      {/* System Status */}
      <div className="mt-8 p-4 bg-gray-700 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">System Status</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Detection Model</span>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
              <span className="text-green-400">Online</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Data Pipeline</span>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
              <span className="text-green-400">Active</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Last Update</span>
            <span className="text-gray-400">2m ago</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 p-4 bg-gray-700 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Today's Summary</h3>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Transactions</span>
            <span className="text-white font-medium">1,234</span>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Alerts</span>
            <span className="text-red-400 font-medium">12</span>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Blocked</span>
            <span className="text-yellow-400 font-medium">8</span>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Accuracy</span>
            <span className="text-green-400 font-medium">94.2%</span>
          </div>
        </div>
      </div>
    </div>
  );
}