import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  color: string;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  department: string;
  lastLogin: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  avatar?: string;
  phone?: string;
  location?: string;
  permissions: string[];
}

interface Activity {
  id: string;
  action: string;
  timestamp: string;
  details: string;
  ipAddress: string;
  userAgent: string;
}

const mockRoles: UserRole[] = [
  {
    id: 'admin',
    name: 'System Administrator',
    permissions: ['manage_users', 'manage_settings', 'view_all_data', 'export_data', 'manage_integrations'],
    color: 'bg-red-100 text-red-800'
  },
  {
    id: 'analyst',
    name: 'Fraud Analyst',
    permissions: ['view_alerts', 'investigate_claims', 'manage_cases', 'export_reports'],
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    permissions: ['view_alerts', 'investigate_claims', 'manage_cases', 'approve_actions', 'view_team_data'],
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'auditor',
    name: 'Auditor',
    permissions: ['view_alerts', 'view_reports', 'export_reports'],
    color: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'viewer',
    name: 'Read-Only Viewer',
    permissions: ['view_dashboard', 'view_reports'],
    color: 'bg-gray-100 text-gray-800'
  }
];

const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@fraudguard.com',
    displayName: 'System Administrator',
    role: mockRoles[0],
    department: 'IT Operations',
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    createdAt: '2024-01-15',
    phone: '+1 (555) 123-4567',
    location: 'New York, NY',
    permissions: mockRoles[0].permissions
  },
  {
    id: '2',
    email: 'analyst1@fraudguard.com',
    displayName: 'Sarah Johnson',
    role: mockRoles[1],
    department: 'Fraud Detection',
    lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: 'active',
    createdAt: '2024-02-01',
    phone: '+1 (555) 234-5678',
    location: 'Chicago, IL',
    permissions: mockRoles[1].permissions
  },
  {
    id: '3',
    email: 'supervisor@fraudguard.com',
    displayName: 'Michael Chen',
    role: mockRoles[2],
    department: 'Fraud Detection',
    lastLogin: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    createdAt: '2024-01-20',
    phone: '+1 (555) 345-6789',
    location: 'San Francisco, CA',
    permissions: mockRoles[2].permissions
  }
];

const mockActivity: Activity[] = [
  {
    id: '1',
    action: 'Login',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    details: 'Successful login',
    ipAddress: '192.168.1.100',
    userAgent: 'Chrome 119.0.0.0'
  },
  {
    id: '2',
    action: 'View Alert',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    details: 'Viewed critical alert FA-001',
    ipAddress: '192.168.1.100',
    userAgent: 'Chrome 119.0.0.0'
  },
  {
    id: '3',
    action: 'Export Report',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    details: 'Exported fraud detection report',
    ipAddress: '192.168.1.100',
    userAgent: 'Chrome 119.0.0.0'
  },
  {
    id: '4',
    action: 'Settings Changed',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    details: 'Updated notification preferences',
    ipAddress: '192.168.1.100',
    userAgent: 'Chrome 119.0.0.0'
  }
];

export function UserPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [activity, setActivity] = useState<Activity[]>(mockActivity);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Get current user data (in a real app, this would come from the auth context)
  const currentUser = users.find(u => u.email === user?.email) || users[0];

  const tabs = [
    { id: 'profile', name: 'My Profile', icon: '👤', description: 'Personal information and preferences' },
    { id: 'security', name: 'Security', icon: '🔒', description: 'Password and security settings' },
    { id: 'activity', name: 'Activity Log', icon: '📋', description: 'Account activity and login history' },
    { id: 'users', name: 'User Management', icon: '👥', description: 'Manage team members and permissions' },
  ];

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaveMessage('Profile updated successfully!');
    setIsLoading(false);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">
              {currentUser?.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{currentUser?.displayName}</h2>
            <p className="text-gray-600">{currentUser?.email}</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentUser?.role.color}`}>
                {currentUser?.role.name}
              </span>
              <span className="text-sm text-gray-500">{currentUser?.department}</span>
              <span className="text-sm text-gray-500">
                Last login: {formatTimestamp(currentUser?.lastLogin || '')}
              </span>
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Change Photo
          </button>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              defaultValue={currentUser?.displayName}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              defaultValue={currentUser?.email}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              defaultValue={currentUser?.phone}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              defaultValue={currentUser?.location}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              defaultValue={currentUser?.department}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option>Fraud Detection</option>
              <option>IT Operations</option>
              <option>Compliance</option>
              <option>Risk Management</option>
              <option>Data Analytics</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Zone
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>UTC-5 (Eastern Standard Time)</option>
              <option>UTC-6 (Central Standard Time)</option>
              <option>UTC-7 (Mountain Standard Time)</option>
              <option>UTC-8 (Pacific Standard Time)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Role and Permissions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Role and Permissions</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Current Role</h4>
              <p className="text-sm text-gray-500">Your assigned role and access level</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentUser?.role.color}`}>
              {currentUser?.role.name}
            </span>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Current Permissions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentUser?.permissions.map((permission) => (
                <div key={permission} className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span className="text-sm text-gray-700 capitalize">
                    {permission.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      {/* Password Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Password Security</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Update Password
          </button>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Authenticator App</h4>
              <p className="text-sm text-gray-500">Use an authenticator app to generate verification codes</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-red-600">Not Configured</span>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                Setup
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">SMS Verification</h4>
              <p className="text-sm text-gray-500">Receive verification codes via SMS</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-green-600">Configured</span>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">
                Manage
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h3>
        <div className="space-y-4">
          {[
            { device: 'Chrome on Windows', location: 'New York, NY', lastActive: '2 minutes ago', current: true },
            { device: 'Safari on iPhone', location: 'New York, NY', lastActive: '2 hours ago', current: false },
            { device: 'Chrome on macOS', location: 'Chicago, IL', lastActive: '1 day ago', current: false },
          ].map((session, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${session.current ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {session.device} {session.current && <span className="text-green-600">(Current)</span>}
                  </h4>
                  <p className="text-sm text-gray-500">{session.location} • Last active {session.lastActive}</p>
                </div>
              </div>
              {!session.current && (
                <button className="text-sm text-red-600 hover:text-red-800">
                  End Session
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderActivityTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <p className="text-gray-600 mt-1">Your account activity and login history</p>
        </div>
        <div className="divide-y divide-gray-200">
          {activity.map((item) => (
            <div key={item.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">
                      {item.action === 'Login' ? '🔑' :
                       item.action === 'View Alert' ? '👁️' :
                       item.action === 'Export Report' ? '📊' : '⚙️'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{item.action}</h4>
                    <p className="text-sm text-gray-500">{item.details}</p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                      <span>IP: {item.ipAddress}</span>
                      <span>{item.userAgent}</span>
                    </div>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{formatTimestamp(item.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View Full Activity Log
          </button>
        </div>
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-6">
      {/* Users Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>
        <button
          onClick={() => setShowCreateUser(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user.displayName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role.color}`}>
                    {user.role.name}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTimestamp(user.lastLogin)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.status === 'active' ? 'bg-green-100 text-green-800' :
                    user.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button className="text-red-600 hover:text-red-900">
                    Suspend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Roles Legend */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Available Roles</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockRoles.map((role) => (
            <div key={role.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${role.color}`}>
                  {role.name}
                </span>
              </div>
              <div className="space-y-1">
                {role.permissions.slice(0, 3).map((permission) => (
                  <div key={permission} className="text-xs text-gray-600">
                    • {permission.replace('_', ' ')}
                  </div>
                ))}
                {role.permissions.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{role.permissions.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'security':
        return renderSecurityTab();
      case 'activity':
        return renderActivityTab();
      case 'users':
        return renderUsersTab();
      default:
        return renderProfileTab();
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-2">Manage your profile, security settings, and team members</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-80 bg-white rounded-lg shadow-sm border border-gray-200 h-fit">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Settings</h3>
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition duration-200 ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className="text-xl mr-3">{tab.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{tab.name}</div>
                    <div className="text-xs text-gray-500">{tab.description}</div>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {renderTabContent()}

          {/* Save Button - Only show for profile and security tabs */}
          {(activeTab === 'profile' || activeTab === 'security') && (
            <div className="mt-8 flex items-center justify-between bg-white p-6 rounded-lg border border-gray-200">
              <div>
                {saveMessage && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <span>✅</span>
                    <span className="text-sm font-medium">{saveMessage}</span>
                  </div>
                )}
              </div>
              <div className="flex space-x-3">
                <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Edit Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            {/* User edit form would go here */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedUser.displayName}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue={selectedUser.email}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    defaultValue={selectedUser.role.id}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {mockRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <select
                    defaultValue={selectedUser.department}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option>Fraud Detection</option>
                    <option>IT Operations</option>
                    <option>Compliance</option>
                    <option>Risk Management</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}