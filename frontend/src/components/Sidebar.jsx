import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare, Calculator,
  ArrowLeftRight, Package, Wrench, ShoppingBag,
  HeartHandshake, Headphones, Settings, HelpCircle, LogOut,
  MessageCircle, Globe, Bell, CreditCard, Shield, Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_NAV, ROLE_COLORS } from '../config/roles';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/* ── All possible nav items — filtered by role at render time ── */
const ALL_NAV_ITEMS = [
  { module: 'dashboard', name: 'Analytics', icon: LayoutDashboard, path: '/analytics' },
  { module: 'leads', name: 'Leads', icon: Users, path: '/leads', liveOverdue: true },
  { module: 'chatbot', name: 'AI Chat', icon: MessageSquare, path: '/chatbot', badge: true },
  { module: 'finance', name: 'Finance', icon: Calculator, path: '/finance' },
  { module: 'trade-in', name: 'Trade-In', icon: ArrowLeftRight, path: '/trade-ins' },

  { module: 'stock', name: 'Inventory', icon: Package, path: '/stock' },
  { module: 'service', name: 'Service', icon: Wrench, path: '/service' },
  { module: 'parts', name: 'Parts', icon: ShoppingBag, path: '/parts' },
  { module: 'retention', name: 'Retention', icon: HeartHandshake, path: '/retention' },
  { module: 'support', name: 'Support', icon: Headphones, path: '/support' },
  { module: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, path: '/settings/whatsapp' },
  { module: 'widget', name: 'Web Widget', icon: Globe, path: '/settings/widget' },
  { module: 'dashboard', name: 'Notifications', icon: Bell, path: '/settings/notifications' },
  { module: 'dashboard', name: 'Integrations', icon: Settings, path: '/settings/integrations' },
  { module: 'dashboard', name: 'Billing', icon: CreditCard, path: '/settings/billing' },
  { module: 'dashboard', name: 'SuperAdmin', icon: Shield, path: '/superadmin', adminOnly: true },
  { module: 'dashboard', name: 'API Config', icon: Key, path: '/superadmin/api-settings', adminOnly: true },
  { module: 'customers', name: 'Customers', icon: Users, path: '/leads' },
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

  /* Deduplicate by path (customers + leads can both point to /leads) */
  const seen = new Set();
  const uniqueNav = navItems.filter(item => {
    if (seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });

  const roleStyle = user ? (ROLE_COLORS[user.role] || ROLE_COLORS.salesperson) : ROLE_COLORS.salesperson;

  const tooltipStyle = {
    background: 'rgba(10,15,30,0.95)',
    border: '1px solid rgba(201,168,76,0.2)',
    color: '#C9A84C',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    backdropFilter: 'blur(12px)',
  };

  return (
    <aside className="sidebar-luxury h-screen flex-shrink-0 select-none flex flex-col">

      {/* KA Monogram */}
      <div
        className="w-12 h-12 mx-auto mt-1 mb-8 flex items-center justify-center rounded-2xl cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))',
          border: '1px solid rgba(201,168,76,0.3)',
          boxShadow: '0 0 20px rgba(201,168,76,0.12)',
        }}
        onClick={() => navigate('/dashboard')}
      >
        <span className="font-outfit font-black text-lg leading-none text-[#C9A84C]">K</span>
        <span className="font-outfit font-black text-lg leading-none text-white/30">A</span>
      </div>

      {/* Role Indicator */}
      {user && (
        <div
          className="mx-3 mb-6 px-2 py-2 rounded-xl text-center"
          style={{ background: roleStyle.bg, border: `1px solid ${roleStyle.text}25` }}
        >
          <p className="text-[8px] font-black uppercase tracking-widest leading-none" style={{ color: roleStyle.text }}>
            {user.role?.replace(/_/g, ' ')}
          </p>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col items-center gap-1 w-full px-3 overflow-y-auto">
        {uniqueNav.map(item => (
          <NavLink
            key={item.path + item.module}
            to={item.path}
            title={item.name}
            onClick={() => onClose && onClose()}
            className={({ isActive }) => `sidebar-icon-btn group w-full ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />

                {/* Live overdue alert badge — Leads icon */}
                {item.liveOverdue && overdueCount > 0 && (
                  <div
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[8px] font-black z-10"
                    style={{
                      background: '#EF4444',
                      color: '#fff',
                      border: '1.5px solid #080D1A',
                      boxShadow: '0 0 8px rgba(239,68,68,0.7)',
                    }}
                  >
                    {overdueCount > 9 ? '9+' : overdueCount}
                  </div>
                )}

                {/* Static notification dot (e.g. AI Chat) */}
                {item.badge && !item.liveOverdue && <div className="badge-dot" />}

                {/* Hover tooltip */}
                <div
                  className="absolute left-full ml-4 px-3 py-2 rounded-xl text-[11px] font-bold tracking-widest uppercase whitespace-nowrap pointer-events-none z-50 opacity-0 invisible translate-x-1 group-hover:opacity-100 group-hover:visible group-hover:translate-x-0 transition-all duration-200"
                  style={tooltipStyle}
                >
                  {item.name}
                  {item.liveOverdue && overdueCount > 0 && (
                    <span
                      className="ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-black"
                      style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171' }}
                    >
                      {overdueCount} overdue
                    </span>
                  )}
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="flex flex-col items-center gap-1 px-3 pt-4 pb-6 w-full"
        style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }}
      >
        {/* User avatar */}
        {user && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-outfit font-black text-sm mb-3"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}
          >
            {(user.first_name?.[0] || '') + (user.last_name?.[0] || '')}
          </div>
        )}

        <button className="sidebar-icon-btn w-full group" title="Settings">
          <Settings size={18} strokeWidth={1.75} />
          <div className="absolute left-full ml-4 px-3 py-2 rounded-xl text-[11px] font-bold tracking-widest uppercase whitespace-nowrap pointer-events-none z-50 opacity-0 invisible translate-x-1 group-hover:opacity-100 group-hover:visible group-hover:translate-x-0 transition-all duration-200" style={tooltipStyle}>
            Settings
          </div>
        </button>

        <button onClick={() => { navigate('/help'); onClose && onClose(); }} className="sidebar-icon-btn w-full group" title="Help">
          <HelpCircle size={18} strokeWidth={1.75} />
          <div className="absolute left-full ml-4 px-3 py-2 rounded-xl text-[11px] font-bold tracking-widest uppercase whitespace-nowrap pointer-events-none z-50 opacity-0 invisible translate-x-1 group-hover:opacity-100 group-hover:visible group-hover:translate-x-0 transition-all duration-200" style={tooltipStyle}>
            Help
          </div>
        </button>

        <button
          onClick={logout}
          className="sidebar-icon-btn w-full group mt-1"
          title="Log Out"
          style={{ color: 'rgba(248,113,113,0.4)' }}
        >
          <LogOut size={18} strokeWidth={1.75} />
          <div
            className="absolute left-full ml-4 px-3 py-2 rounded-xl text-[11px] font-bold tracking-widest uppercase whitespace-nowrap pointer-events-none z-50 opacity-0 invisible translate-x-1 group-hover:opacity-100 group-hover:visible group-hover:translate-x-0 transition-all duration-200"
            style={{ ...tooltipStyle, border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}
          >
            Log Out
          </div>
        </button>

        {/* Version Indicator */}
        <div className="mt-4 mb-2 text-[9px] font-mono font-bold tracking-widest text-white/20 select-text">
          v1.0.0-rc
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
