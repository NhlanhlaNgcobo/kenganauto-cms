import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Layout
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import FinancePage from './pages/Finance';
import FinanceCalculatorPage from './pages/FinanceCalculatorPage';
import Chatbot from './pages/Chatbot';
import WhatsappSettings from './pages/WhatsappSettings';
import WidgetSettings from './pages/WidgetSettings';
import LeadsPage from './pages/Leads';
import TradeIns from './pages/TradeIns';
import Stock from './pages/Stock';
import Service from './pages/Service';
import Parts from './pages/Parts';
import Customers from './pages/Customers';
import Retention from './pages/Retention';
import Support from './pages/Support';
import AnalyticsDashboard from './pages/Analytics';
import NotificationSettings from './pages/NotificationSettings';
import Integrations from './pages/Integrations';
import ChatWidget from './components/ChatWidget';
import Billing from './pages/Billing';
import SuperAdmin from './pages/SuperAdmin';
import SuperAdminApiSettings from './pages/SuperAdminApiSettings';
import Onboarding from './pages/Onboarding';
import Help from './pages/Help';
import { useAuth } from './context/AuthContext';
import { Menu, X } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import CommandPalette from './components/CommandPalette';

/* ── App Layout Shell ── */
const AppLayout = ({ children }) => {
  const { user } = useAuth();
  const isDemo = user?.tenant_id === 9999 || window.location.host.includes('demo');
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0A0F1E' }}>
      {/* Mobile Hamburger Button */}
      {user && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden fixed z-[60] top-5 left-5 p-2 bg-[#111A30] border border-[#C9A84C]/20 rounded-lg text-[#C9A84C] shadow-lg shadow-black/50"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-[40] backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-[50] transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 max-w-full overflow-x-hidden overflow-y-auto relative flex flex-col md:pl-0">

        {/* Persistent Demo Banner */}
        {isDemo && (
          <div className="w-full bg-[#C9A84C]/10 border-b border-[#C9A84C]/20 px-8 py-3 flex items-center justify-between shrink-0 z-50">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C9A84C] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C9A84C]"></span>
              </span>
              <p className="font-outfit font-bold text-[#C9A84C] text-sm uppercase tracking-wider mb-0">
                Welcome to the Demo Environment
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a href="https://calendly.com/kenganauto/demo" target="_blank" rel="noreferrer"
                className="px-4 py-1.5 rounded-lg border border-[#C9A84C]/50 text-[#C9A84C] text-xs font-bold hover:bg-[#C9A84C]/10 transition-colors">
                Book a Demo Call
              </a>
              <button onClick={() => window.location.href = '/register'} className="px-4 py-1.5 rounded-lg bg-[#C9A84C] text-[#0A0F1E] text-xs font-black hover:opacity-90 transition-opacity">
                Start Your Free Trial
              </button>
            </div>
          </div>
        )}

        {children}
      </main>

      <CommandPalette />

      {/* Global chat widget FAB — visible only when logged in */}
      {user && <ChatWidget tenantId={user.tenant_id} tenantName="KenganAuto" position="bottom-right" />}
    </div>
  );
};

/* ── Role-aware placeholder ── */
const PagePlaceholder = ({ title, module }) => (
  <AppLayout>
    <ProtectedRoute module={module}>
      <div className="flex flex-col min-h-screen">
        <header className="px-8 py-5 flex-shrink-0 sticky top-0 z-40"
          style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-0.5" style={{ color: 'rgba(201,168,76,0.4)' }}>Module</p>
          <h1 className="font-outfit font-black text-xl text-white">{title}</h1>
        </header>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center anim-fade-up max-w-md">
            <div className="h-24 w-24 mx-auto mb-8 rounded-3xl flex items-center justify-center text-4xl"
              style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.04))', border: '1px solid rgba(201,168,76,0.2)', boxShadow: '0 0 40px rgba(201,168,76,0.08)' }}>
              🚧
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: 'rgba(201,168,76,0.5)' }}>Coming Soon</p>
            <h2 className="font-outfit font-black text-2xl text-white mb-3">{title}</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,237,232,0.35)', maxWidth: '30ch', margin: '0 auto' }}>
              This module is being optimised for AI-driven performance and will be available shortly.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  </AppLayout>
);

/* ══════════════════════════════════════════ */
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* ── Public Auth Routes ── */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ── Protected: Onboarding Wizard (Full Screen) ── */}
            <Route path="/onboarding" element={
              <ProtectedRoute module="dashboard">
                <Onboarding />
              </ProtectedRoute>
            } />

            {/* ── Protected: Dashboard (all roles) ── */}
            <Route path="/dashboard" element={
              <AppLayout>
                <ProtectedRoute module="dashboard">
                  <Dashboard />
                </ProtectedRoute>
              </AppLayout>
            } />

            {/* ── Protected: Analytics (all roles) ── */}
            <Route path="/analytics/:reportType?" element={
              <AppLayout>
                <ProtectedRoute module="dashboard">
                  <AnalyticsDashboard />
                </ProtectedRoute>
              </AppLayout>
            } />

            {/* ── Protected: Finance (admin, finance_manager) ── */}
            <Route path="/finance" element={
              <AppLayout>
                <ProtectedRoute module="finance">
                  <FinancePage />
                </ProtectedRoute>
              </AppLayout>
            } />

            {/* ── Protected: Finance Calculator (all roles) ── */}
            <Route path="/finance/calculator" element={
              <AppLayout>
                <ProtectedRoute module="finance">
                  <FinanceCalculatorPage />
                </ProtectedRoute>
              </AppLayout>
            } />

            <Route path="/chatbot" element={
              <AppLayout>
                <ProtectedRoute module="chatbot">
                  <Chatbot />
                </ProtectedRoute>
              </AppLayout>
            } />

            {/* ── Other Protected Modules ── */}
            {/* ── Protected: Lead Pipeline ── */}
            <Route path="/leads" element={
              <AppLayout>
                <ProtectedRoute module="leads">
                  <LeadsPage />
                </ProtectedRoute>
              </AppLayout>
            } />
            <Route path="/chatbot" element={<PagePlaceholder title="AI Conversations Hub" module="chatbot" />} />

            {/* ── Protected: Customers ── */}
            <Route path="/customers" element={
              <AppLayout>
                <ProtectedRoute module="customers">
                  <Customers />
                </ProtectedRoute>
              </AppLayout>
            } />
            <Route path="/trade-ins" element={
              <AppLayout>
                <ProtectedRoute module="trade-in">
                  <TradeIns />
                </ProtectedRoute>
              </AppLayout>
            } />
            <Route path="/stock" element={
              <AppLayout>
                <ProtectedRoute module="stock">
                  <Stock />
                </ProtectedRoute>
              </AppLayout>
            } />
            <Route path="/service" element={
              <AppLayout>
                <ProtectedRoute module="service">
                  <Service />
                </ProtectedRoute>
              </AppLayout>
            } />
            <Route path="/parts" element={
              <AppLayout>
                <ProtectedRoute module="parts">
                  <Parts />
                </ProtectedRoute>
              </AppLayout>
            } />
            <Route path="/retention" element={
              <AppLayout>
                <ProtectedRoute module="retention">
                  <Retention />
                </ProtectedRoute>
              </AppLayout>
            } />
            <Route path="/support" element={
              <AppLayout>
                <ProtectedRoute module="support">
                  <Support />
                </ProtectedRoute>
              </AppLayout>
            } />

            <Route path="/settings/whatsapp" element={
              <AppLayout>
                <ProtectedRoute module="whatsapp">
                  <WhatsappSettings />
                </ProtectedRoute>
              </AppLayout>
            } />

            <Route path="/settings/notifications" element={
              <AppLayout>
                <ProtectedRoute module="dashboard">
                  <NotificationSettings />
                </ProtectedRoute>
              </AppLayout>
            } />

            <Route path="/settings/integrations" element={
              <AppLayout>
                <ProtectedRoute module="dashboard">
                  <Integrations />
                </ProtectedRoute>
              </AppLayout>
            } />

            <Route path="/settings/billing" element={
              <AppLayout>
                <ProtectedRoute module="dashboard">
                  <Billing />
                </ProtectedRoute>
              </AppLayout>
            } />

            <Route path="/settings/chatbot" element={
              <AppLayout>
                <ProtectedRoute module="widget">
                  <WidgetSettings />
                </ProtectedRoute>
              </AppLayout>
            } />

            <Route path="/superadmin" element={
              <AppLayout>
                <ProtectedRoute module="dashboard" adminOnly={true}>
                  <SuperAdmin />
                </ProtectedRoute>
              </AppLayout>
            } />
            <Route path="/superadmin/api-settings" element={
              <AppLayout>
                <ProtectedRoute module="dashboard" adminOnly={true}>
                  <SuperAdminApiSettings />
                </ProtectedRoute>
              </AppLayout>
            } />

            <Route path="/help" element={
              <AppLayout>
                <ProtectedRoute module="dashboard">
                  <Help />
                </ProtectedRoute>
              </AppLayout>
            } />

            {/* ── Root redirect ── */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
