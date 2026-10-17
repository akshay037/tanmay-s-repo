import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ForcePasswordChangeModal from './components/ForcePasswordChangeModal';
import RulesAndRegulationsModal, { RULES_SESSION_KEY } from './components/RulesAndRegulationsModal';

// Super Admin Pages
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import AdminManagement from './pages/superadmin/AdminManagement';
import AllUsersView from './pages/superadmin/AllUsersView';
import SuperAdminPointAllocation from './pages/superadmin/SuperAdminPointAllocation';
import PointRequestsApproval from './pages/superadmin/PointRequestsApproval';
import AuditLogs from './pages/superadmin/AuditLogs';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import DistributePoints from './pages/admin/DistributePoints';
import PointRequests from './pages/admin/PointRequests';

// Casino Pages
import CasinoLobby from './pages/casino/CasinoLobby';
import SlotsGame from './pages/casino/SlotsGame';
import RouletteGame from './pages/casino/RouletteGame';
import CrashGame from './pages/casino/CrashGame';
import BlackjackGame from './pages/casino/BlackjackGame';
import DiceGame from './pages/casino/DiceGame';
import LottoGame from './pages/casino/LottoGame';
import CasinoHistory from './pages/casino/CasinoHistory';

// Shared Pages
import TransactionHistory from './pages/TransactionHistory';
import SystemReports from './pages/SystemReports';
import Profile from './pages/Profile';

export default function App() {
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAdminForAllocation, setSelectedAdminForAllocation] = useState(null);
  const [selectedUserForDistribution, setSelectedUserForDistribution] = useState(null);
  const [rulesAccepted, setRulesAccepted] = useState(
    () => Boolean(token) && sessionStorage.getItem(RULES_SESSION_KEY) === token
  );

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setRulesAccepted(false);
      return;
    }
    setRulesAccepted(sessionStorage.getItem(RULES_SESSION_KEY) === token);
  }, [isAuthenticated, token]);

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  const role = user.role;

  // Helper for navigating with selected entity state
  const handleSelectAdminForAllocation = (admin) => {
    setSelectedAdminForAllocation(admin);
    setCurrentTab('point-allocation');
  };

  const handleSelectUserForDistribution = (usr) => {
    setSelectedUserForDistribution(usr);
    setCurrentTab('distribute-points');
  };

  const renderContent = () => {
    // SUPER ADMIN VIEWS
    if (role === 'SUPER_ADMIN') {
      switch (currentTab) {
        case 'dashboard':
          return <SuperAdminDashboard onNavigate={setCurrentTab} />;
        case 'admins':
          return <AdminManagement onSelectAdminForAllocation={handleSelectAdminForAllocation} />;
        case 'all-users':
          return <AllUsersView />;
        case 'point-allocation':
          return <SuperAdminPointAllocation selectedAdmin={selectedAdminForAllocation} />;
        case 'point-requests':
          return <PointRequestsApproval />;
        case 'transactions':
          return <TransactionHistory />;
        case 'reports':
          return <SystemReports />;
        case 'audit-logs':
          return <AuditLogs />;
        case 'profile':
          return <Profile />;
        default:
          return <SuperAdminDashboard onNavigate={setCurrentTab} />;
      }
    }

    // ADMIN VIEWS
    if (role === 'ADMIN') {
      switch (currentTab) {
        case 'dashboard':
          return <AdminDashboard onNavigate={setCurrentTab} />;
        case 'my-users':
          return <UserManagement onSelectUserForDistribution={handleSelectUserForDistribution} />;
        case 'distribute-points':
          return <DistributePoints selectedUser={selectedUserForDistribution} />;
        case 'point-requests':
          return <PointRequests />;
        case 'transactions':
          return <TransactionHistory />;
        case 'reports':
          return <SystemReports />;
        case 'profile':
          return <Profile />;
        default:
          return <AdminDashboard onNavigate={setCurrentTab} />;
      }
    }

    // USER VIEWS (CASINO GAMING HUB)
    if (role === 'USER') {
      switch (currentTab) {
        case 'casino':
        case 'dashboard':
          return <CasinoLobby onSelectGame={setCurrentTab} />;
        case 'slots':
          return <SlotsGame onNavigate={setCurrentTab} />;
        case 'roulette':
          return <RouletteGame onNavigate={setCurrentTab} />;
        case 'crash':
          return <CrashGame onNavigate={setCurrentTab} />;
        case 'blackjack':
          return <BlackjackGame onNavigate={setCurrentTab} />;
        case 'dice':
          return <DiceGame onNavigate={setCurrentTab} />;
        case 'lotto':
          return <LottoGame onNavigate={setCurrentTab} />;
        case 'casino-history':
          return <CasinoHistory onNavigate={setCurrentTab} />;
        case 'profile':
          return <Profile />;
        default:
          return <CasinoLobby onSelectGame={setCurrentTab} />;
      }
    }

    return <Profile />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50/40 via-white to-red-50/30 text-slate-800 flex flex-col font-sans">
      {/* Navbar Header */}
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 relative">
        {/* Navigation Sidebar Drawer */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content View Container */}
        <main className="flex-1 lg:pl-64 p-3 sm:p-4 lg:p-8 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
          {renderContent()}
        </main>
      </div>

      {/* Force Password Change Modal overlay if required */}
      <ForcePasswordChangeModal isOpen={Boolean(user.mustChangePassword)} />

      {/* Rules popup every login for USER accounts (cleared on logout) */}
      {role === 'USER' && !user.mustChangePassword && (
        <RulesAndRegulationsModal
          isOpen={!rulesAccepted}
          onAccept={() => {
            if (token) sessionStorage.setItem(RULES_SESSION_KEY, token);
            setRulesAccepted(true);
          }}
        />
      )}
    </div>
  );
}
