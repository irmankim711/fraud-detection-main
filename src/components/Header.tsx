import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: number;
  message: string;
  time: string;
  type: 'critical' | 'alert' | 'info' | 'warning';
  severity?: 'high' | 'medium' | 'low';
  actionRequired?: boolean;
}

export function Header() {
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, message: 'Critical fraud alert: $125K suspicious billing detected', time: '2m ago', type: 'critical', severity: 'high', actionRequired: true },
    { id: 2, message: 'Phantom billing scheme identified - immediate review required', time: '5m ago', type: 'alert', severity: 'high', actionRequired: true },
    { id: 3, message: 'AI model accuracy improved to 98.7%', time: '15m ago', type: 'info' },
    { id: 4, message: 'Provider PROV-8834 flagged for unusual patterns', time: '32m ago', type: 'warning', severity: 'medium', actionRequired: true },
    { id: 5, message: 'Daily fraud prevention report generated', time: '1h ago', type: 'info' }
  ]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemHealth, setSystemHealth] = useState<'excellent' | 'good' | 'warning' | 'critical'>('good');

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Simulate system health updates
  useEffect(() => {
    const healthCheck = setInterval(() => {
      const healthStates: Array<'excellent' | 'good' | 'warning' | 'critical'> = ['excellent', 'good', 'warning'];
      setSystemHealth(healthStates[Math.floor(Math.random() * healthStates.length)]);
    }, 30000);
    return () => clearInterval(healthCheck);
  }, []);

  const criticalCount = notifications.filter(n => n.type === 'critical' || (n.type === 'alert' && n.severity === 'high')).length;
  const actionRequiredCount = notifications.filter(n => n.actionRequired).length;

  const getHealthColor = (health: typeof systemHealth) => {
    switch (health) {
      case 'excellent': return 'bg-green-400';
      case 'good': return 'bg-blue-400';
      case 'warning': return 'bg-yellow-400 animate-pulse';
      case 'critical': return 'bg-red-400 animate-pulse';
      default: return 'bg-gray-400';
    }
  };

  const getHealthText = (health: typeof systemHealth) => {
    switch (health) {
      case 'excellent': return 'System Excellent';
      case 'good': return 'System Healthy';
      case 'warning': return 'System Warning';
      case 'critical': return 'System Critical';
      default: return 'System Unknown';
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'critical': return '🚨';
      case 'alert': return '⚠️';
      case 'warning': return '⚡';
      case 'info': return 'ℹ️';
      default: return '📋';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-l-4 border-red-500';
      case 'alert': return 'bg-orange-50 border-l-4 border-orange-500';
      case 'warning': return 'bg-yellow-50 border-l-4 border-yellow-500';
      case 'info': return 'bg-blue-50 border-l-4 border-blue-500';
      default: return 'bg-gray-50';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Enhanced Search Bar */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Search claims, providers, patients, or alert IDs..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <kbd className="hidden sm:inline-block px-2 py-1 text-xs text-gray-500 bg-gray-100 border border-gray-300 rounded">
                Ctrl K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right Side - Enhanced Status and Controls */}
        <div className="flex items-center space-x-4">
          {/* Fraud Detection Status */}
          <div className="hidden xl:flex items-center space-x-4 px-3 py-1 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-600">Live Detection</span>
            </div>
            <div className="text-xs text-gray-500">|</div>
            <div className="text-xs text-gray-600">
              {actionRequiredCount} pending
            </div>
          </div>

          {/* System Health Indicator */}
          <div className="hidden md:flex items-center space-x-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${getHealthColor(systemHealth)}`}></div>
            <span className="text-gray-600">{getHealthText(systemHealth)}</span>
          </div>

          {/* Real-time Clock */}
          <div className="hidden lg:block text-sm text-gray-600">
            {currentTime.toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>

          {/* Enhanced Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
            >
              <span className="text-xl">🔔</span>
              {criticalCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {criticalCount}
                </span>
              )}
              {actionRequiredCount > 0 && criticalCount === 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {actionRequiredCount}
                </span>
              )}
            </button>

            {/* Enhanced Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Fraud Alerts</h3>
                    <div className="flex space-x-2">
                      {criticalCount > 0 && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                          {criticalCount} Critical
                        </span>
                      )}
                      {actionRequiredCount > 0 && (
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                          {actionRequiredCount} Action Required
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${getNotificationColor(notification.type)}`}>
                      <div className="flex items-start space-x-3">
                        <span className="text-lg">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">{notification.message}</p>
                            {notification.actionRequired && (
                              <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                                Action Required
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500">{notification.time}</p>
                            {notification.severity && (
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                notification.severity === 'high' ? 'bg-red-100 text-red-800' :
                                notification.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {notification.severity.toUpperCase()}
                              </span>
                            )}
                          </div>
                          {notification.actionRequired && (
                            <div className="mt-2 flex space-x-2">
                              <button className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors">
                                Investigate
                              </button>
                              <button className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                  <div className="flex justify-between items-center">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View All Alerts ({notifications.length})
                    </button>
                    <button className="text-sm text-gray-600 hover:text-gray-800">
                      Mark All Read
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {user?.email?.split('@')[0] || 'User'}
              </span>
              <span className="text-gray-400">▼</span>
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{user?.email?.split('@')[0] || 'User'}</p>
                  <p className="text-xs text-gray-500">{user?.email || 'user@example.com'}</p>
                </div>

                <div className="py-1">
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    👤 Profile Settings
                  </button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    ⚙️ Preferences
                  </button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    📊 Activity Log
                  </button>
                  <div className="border-t border-gray-200">
                    <button
                      onClick={signOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Close dropdowns when clicking outside */}
      {(showNotifications || showUserMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </header>
  );
}