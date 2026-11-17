import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import {
  LayoutDashboard, Users, MessageSquare, Calculator,
  ArrowLeftRight, Package, Wrench, ShoppingBag,
  HeartHandshake, Headphones, HelpCircle, LogOut,
  MessageCircle, Globe, Bell, CreditCard, Shield, Key, AlarmClock,
  Target, HeartPulse, Sparkles, ShoppingCart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_NAV, ROLE_COLORS } from '../config/roles';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/* ── All possible nav items — filtered by role at render time ── */
const ALL_NAV_ITEMS = [
  { module: 'dashboard', name: 'Overview', icon: LayoutDashboard, path: '/dashboard', section: 'Workspace' },
  { module: 'dashboard', name: 'Analytics', icon: LayoutDashboard, path: '/analytics', section: 'Workspace' },
  { module: 'ai-impact', name: 'AI Impact', icon: Sparkles, path: '/ai-impact', section: 'Workspace' },
  { module: 'followups', name: 'Action Queue', icon: AlarmClock, path: '/action-queue', liveFollowups: true, section: 'Sales' },
  { module: 'leads', name: 'Leads', icon: Users, path: '/leads', liveOverdue: true, section: 'Sales' },
  { module: 'online-deals', name: 'Online Deals', icon: ShoppingCart, path: '/online-deals', section: 'Sales' },
  { module: 'customers', name: 'Customers', icon: Users, path: '/customers', section: 'Sales' },
  { module: 'chatbot', name: 'AI Chat', icon: MessageSquare, path: '/chatbot', badge: true, section: 'Sales' },
  { module: 'finance', name: 'Finance', icon: Calculator, path: '/finance', section: 'Sales' },
  { module: 'trade-in', name: 'Trade-Ins', icon: ArrowLeftRight, path: '/trade-ins', section: 'Sales' },
  { module: 'targets', name: 'Targets', icon: Target, path: '/targets', section: 'Sales' },
  { module: 'stock', name: 'Inventory', icon: Package, path: '/stock', section: 'Operations' },
  { module: 'service', name: 'Service', icon: Wrench, path: '/service', section: 'Operations' },
  { module: 'parts', name: 'Parts', icon: ShoppingBag, path: '/parts', section: 'Operations' },
  { module: 'retention', name: 'Retention', icon: HeartHandshake, path: '/retention', section: 'Operations' },
  { module: 'customer-care', name: 'Customer Care', icon: HeartPulse, path: '/customer-care', section: 'Operations' },
  { module: 'support', name: 'Support', icon: Headphones, path: '/support', section: 'Operations' },
  { module: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, path: '/settings/whatsapp', section: 'Settings' },
  { module: 'widget', name: 'Web Widget', icon: Globe, path: '/settings/chatbot', section: 'Settings' },
  { module: 'dashboard', name: 'Notifications', icon: Bell, path: '/settings/notifications', section: 'Settings' },
  { module: 'dashboard', name: 'Billing', icon: CreditCard, path: '/settings/billing', section: 'Settings' },
  { module: 'dashboard', name: 'SuperAdmin', icon: Shield, path: '/superadmin', adminOnly: true, section: 'Admin' },
  { module: 'dashboard', name: 'API Config', icon: Key, path: '/superadmin/api-settings', adminOnly: true, section: 'Admin' },
];

const Sidebar = ({ onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [overdueCount, setOverdueCount] = useState(0);

  /* ── Poll for overdue leads count every 30s to drive the sidebar alert badge ── */
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('ka_token') || localStorage.getItem('token');
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/leads/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setOverdueCount(data.overdue || 0);
        }
      } catch { /* non-fatal — backend may still be starting */ }
    };
    poll();
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  /* Filter nav items to this user's allowed modules */
  const allowedModules = user ? (ROLE_NAV[user.role] || []) : ['dashboard'];
  const navItems = ALL_NAV_ITEMS.filter(item => {
    if (!allowedModules.includes(item.module)) return false;
    if (item.adminOnly && user?.tenant_id !== 1) return false;
    return true;
  });

  /* Deduplicate by path */
  const seen = new Set();
  const uniqueNav = navItems.filter(item => {
    if (seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });

  const roleStyle = user ? (ROLE_COLORS[user.role] || ROLE_COLORS.salesperson) : ROLE_COLORS.salesperson;
  const groupedNav = uniqueNav.reduce((acc, item) => {
    const section = item.section || 'Workspace';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  return (
    <aside className="sidebar-luxury h-screen flex-shrink-0 select-none flex flex-col">
      <div className="px-5 pt-5 pb-4 border-b border-white/8">
        <button
          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:border-[#C9A84C]/30 hover:bg-white/[0.07]"
          onClick={() => navigate('/dashboard')}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/10">
            <span className="font-outfit text-base font-black text-[#C9A84C]">KA</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#C9A84C]">KenganAuto OS</p>
            <p className="truncate pt-1 text-sm font-semibold text-white/88">{user?.tenant_name || 'Dealership Workspace'}</p>
          </div>
        </button>

        {user && (
          <div className="mt-4 border-t border-white/8 px-1 pt-4">
            <p className="text-[11px] font-black uppercase tracking-[0.24em]" style={{ color: roleStyle.text }}>
              {user.role?.replace(/_/g, ' ')}
            </p>
            <p className="pt-1 text-sm font-semibold text-white/82">
              {user.first_name} {user.last_name}
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
        {Object.entries(groupedNav).map(([section, items]) => (
          <div key={section} className="mb-6">
            <p className="px-3 pb-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/58">
              {section}
            </p>

            <div className="space-y-1.5">
              {items.map((item) => (
                <NavLink
                  key={item.path + item.module}
                  to={item.path}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `sidebar-icon-btn w-full ${isActive ? 'active' : ''}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${isActive ? 'border-[#C9A84C]/25 bg-[#C9A84C]/12 text-[#C9A84C]' : 'border-transparent bg-white/[0.04] text-white/66'}`}>
                        <item.icon size={18} strokeWidth={isActive ? 2.25 : 1.9} />
                      </div>

                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className={`truncate text-sm font-semibold ${isActive ? 'text-white' : 'text-white/76'}`}>
                            {item.name}
                          </span>
                          {item.badge && !item.liveOverdue ? <span className="h-2 w-2 rounded-full bg-[#C9A84C]" /> : null}
                        </div>
                        {item.liveOverdue ? (
                          <p className={`pt-0.5 text-xs ${overdueCount > 0 ? 'text-red-300' : 'text-white/58'}`}>
                            {overdueCount > 0 ? `${overdueCount} overdue follow-ups` : 'No overdue follow-ups'}
                          </p>
                        ) : null}
                      </div>

                      {item.liveOverdue && overdueCount > 0 ? (
                        <div className="flex min-w-[26px] justify-center rounded-full bg-red-700 px-2 py-1 text-[12px] font-black text-white">
                          {overdueCount > 9 ? '9+' : overdueCount}
                        </div>
                      ) : null}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/8 px-4 py-4">
        <ThemeToggle />

        <button
          onClick={() => { navigate('/help'); onClose && onClose(); }}
          className="sidebar-icon-btn mt-2 w-full"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-white/66">
            <HelpCircle size={18} strokeWidth={1.9} />
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-white/76">Help</span>
        </button>

        <button
          onClick={logout}
          className="sidebar-icon-btn mt-2 w-full border-red-500/10 hover:border-red-500/20 hover:bg-red-500/8"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
            <LogOut size={18} strokeWidth={1.9} />
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-red-200">Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
