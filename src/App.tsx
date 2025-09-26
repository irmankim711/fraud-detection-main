import React, { useState } from 'react';

// Import all components
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { TransactionTable } from './components/TransactionTable';
import { AlertsPage } from './components/AlertsPage';
import { DownloadPage } from './components/DownloadPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        return <TransactionTable />;
      case 'alerts':
        return <AlertsPage />;
      case 'download':
        return <DownloadPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}