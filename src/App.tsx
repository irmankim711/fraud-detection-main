import React, { useState } from "react";

// Import all components
import { LoginPage } from "./components/LoginPage";
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/Dashboard";
import { TransactionTable } from "./components/TransactionTable";
import { AlertsPage } from "./components/AlertsPage";
import { DownloadPage } from "./components/DownloadPage";
import { SettingsPage } from "./components/SettingsPage";
import { UserPage } from "./components/UserPage";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import FraudMonitoringDashboard from "./components/FraudMonitoringDashboard";

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [showLogin, setShowLogin] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showLogin) {
      return <LoginPage />;
    }
    return <LandingPage onShowLogin={() => setShowLogin(true)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "transactions":
        return <TransactionTable />;
      case "alerts":
        return <AlertsPage />;
      case "fraud-monitoring":
        return <FraudMonitoringDashboard />;
      case "download":
        return <DownloadPage />;
      case "users":
        return <UserPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
