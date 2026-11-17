import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// Auth
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TermsAndConditions from './pages/legal/TermsAndConditions';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import POPIACompliance from './pages/legal/POPIACompliance';

// Layout
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import FinancePage from './pages/Finance';
import FinanceCalculatorPage from './pages/FinanceCalculatorPage';
import Chatbot from './pages/Chatbot';
import WhatsappSettings from './pages/WhatsappSettings';
import WidgetSettings from './pages/WidgetSettings';
import LeadsPage from './pages/Leads';
import ActionQueue from './pages/ActionQueue';
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
import CustomerCare from './pages/CustomerCare';
import Targets from './pages/Targets';
import AIImpact from './pages/AIImpact';
import OnlineDeals from './pages/OnlineDeals';
import PublicVehicle from './pages/PublicVehicle';
import { useAuth } from './context/AuthContext';
import { Menu, X } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import CommandPalette from './components/CommandPalette';
import LiveLeadToast from './components/LiveLeadToast';

/* ── Per-route content transition (keeps sidebar static) ── */
const RouteTransition = ({ children }) => {
  const location = useLocation();
  const reduce = useReducedMotion();
  if (reduce) return <div className="flex-1 min-h-0">{children}</div>;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className="flex-1 min-h-0"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.32, ease: [0.2, 0.7, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/* ── App Layout Shell ── */
const AppLayout = ({ children }) => {
  const { user } = useAuth();
  const isDemo = user?.tenant_id === 9999 || window.location.host.includes('demo');
  const [sidebarOpen, setSidebarOpen] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem('ka_sidebar_open');
    return saved === null ? true : saved === 'true';
  });

  React.useEffect(() => {
    window.localStorage.setItem('ka_sidebar_open', String(sidebarOpen));
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0F1E]">
      {user && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`fixed z-[60] top-5 p-2.5 bg-[#111A30]/92 backdrop-blur-md border border-[#C9A84C]/30 rounded-xl text-[#C9A84C] shadow-[0_10px_40px_rgba(0,0,0,0.8)] hover:bg-[#C9A84C]/10 transition-all ${sidebarOpen ? 'left-5 md:left-[240px]' : 'left-5'}`}
          aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-[#0A0F1E]/80 z-[40] backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-[50] transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[4px_0_24px_rgba(0,0,0,0.5)] md:relative md:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:min-w-0 md:overflow-hidden'}`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className={`flex-1 max-w-full overflow-x-hidden overflow-y-auto relative flex flex-col bg-[#0F172A] transition-[padding] duration-300 ${user && !sidebarOpen ? 'pl-16 md:pl-20' : ''}`}>

        {/* Persistent Demo Banner */}
        {isDemo && (
          <div className="w-full border-b border-white/8 bg-[#111A30] px-8 py-3 flex items-center justify-between shrink-0 z-50">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#C9A84C]"></span>
              <p className="font-outfit font-black text-[#C9A84C] text-sm uppercase tracking-widest mb-0">
                Sandbox Environment
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://calendly.com/kenganauto/demo" target="_blank" rel="noreferrer"
                className="px-4 py-1.5 rounded-lg border border-white/12 text-white/80 text-xs font-bold hover:bg-white/5 hover:text-white transition-all">
                Book a Demo Call
              </a>
              <button onClick={() => window.location.href = '/register'} className="px-5 py-1.5 rounded-lg bg-[#C9A84C] text-[#0A0F1E] text-xs font-black hover:opacity-90 transition-all">
                Start Free Trial
              </button>
            </div>
          </div>
        )}

        <RouteTransition>{children}</RouteTransition>
      </main>

      <CommandPalette />
      {user && <LiveLeadToast />}

      {/* Global chat widget FAB — visible only when logged in */}
      {user && <ChatWidget tenantId={user.tenant_id} tenantName="KenganAuto" position="bottom-right" />}
    </div>
  );
};

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
            <Route path="/legal/terms" element={<TermsAndConditions />} />
            <Route path="/legal/privacy" element={<PrivacyPolicy />} />
            <Route path="/legal/popia" element={<POPIACompliance />} />
            {/* Public Silent Salesman vehicle page (QR on showroom cars) */}
            <Route path="/v/:token" element={<PublicVehicle />} />

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
            {/* ── Protected: Action Queue (follow-ups) ── */}
            <Route path="/action-queue" element={
              <AppLayout>
                <ProtectedRoute module="followups">
                  <ActionQueue />
                </ProtectedRoute>
              </AppLayout>
            } />
            {/* ── Protected: Lead Pipeline ── */}
            <Route path="/leads" element={
              <AppLayout>
                <ProtectedRoute module="leads">
                  <LeadsPage />
                </ProtectedRoute>
              </AppLayout>
            } />
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
            <Route path="/customer-care" element={
              <AppLayout>
                <ProtectedRoute module="customer-care">
                  <CustomerCare />
                </ProtectedRoute>
              </AppLayout>
            } />
            <Route path="/targets" element={
              <AppLayout>
                <ProtectedRoute module="targets">
                  <Targets />
                </ProtectedRoute>
              </AppLayout>
            } />
            <Route path="/ai-impact" element={
              <AppLayout>
                <ProtectedRoute module="ai-impact">
                  <AIImpact />
                </ProtectedRoute>
              </AppLayout>
            } />
            <Route path="/online-deals" element={
              <AppLayout>
                <ProtectedRoute module="online-deals">
                  <OnlineDeals />
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
