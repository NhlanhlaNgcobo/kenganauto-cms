/**
 * AuthContext — global authentication state
 * - JWT stored in localStorage
 * - 8-hour inactivity timer (reset on any user event)
 * - Token refreshed on activity every 30 min
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'ka_token';
const USER_KEY = 'ka_user';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const IDLE_LIMIT = 8 * 60 * 60 * 1000;  // 8 hours
const REFRESH_EVERY = 30 * 60 * 1000;   // refresh token every 30 min of activity

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
    });
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [loading, setLoading] = useState(false);

    const idleTimer = useRef(null);
    const refreshTimer = useRef(null);

    /* ── Session helpers ── */
    const storeSession = useCallback((tok, usr) => {
        localStorage.setItem(TOKEN_KEY, tok);
        localStorage.setItem(USER_KEY, JSON.stringify(usr));
        setToken(tok);
        setUser(usr);
    }, []);

    const clearSession = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        clearTimeout(idleTimer.current);
        clearInterval(refreshTimer.current);
    }, []);

    /* ── Idle timer: log out after 8h of no activity ── */
    const resetIdleTimer = useCallback(() => {
        clearTimeout(idleTimer.current);
        if (!localStorage.getItem(TOKEN_KEY)) return;
        idleTimer.current = setTimeout(() => {
            clearSession();
            window.location.href = '/login?reason=idle';
        }, IDLE_LIMIT);
    }, [clearSession]);

    /* ── Token refresh every 30 min ── */
    const refreshToken = useCallback(async () => {
        const t = localStorage.getItem(TOKEN_KEY);
        if (!t) return;
        try {
            const res = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: t }),
            });
            if (res.ok) {
                const { token: newToken } = await res.json();
                localStorage.setItem(TOKEN_KEY, newToken);
                setToken(newToken);
            } else {
                clearSession();
                window.location.href = '/login?reason=expired';
            }
        } catch { /* network error — keep token, retry next interval */ }
    }, [clearSession]);

    /* ── Attach activity listeners ── */
    useEffect(() => {
        if (!token) return;
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        resetIdleTimer();
        events.forEach(e => window.addEventListener(e, resetIdleTimer));
        refreshTimer.current = setInterval(refreshToken, REFRESH_EVERY);

        return () => {
            events.forEach(e => window.removeEventListener(e, resetIdleTimer));
            clearTimeout(idleTimer.current);
            clearInterval(refreshTimer.current);
        };
    }, [token, resetIdleTimer, refreshToken]);

    /* ── API calls ── */
    const login = async (email, password, subdomain) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, subdomain }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed.');
            storeSession(data.token, data.user);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const register = async (payload) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed.');
            storeSession(data.token, data.user);
            return { success: true, subdomain: data.subdomain, portal_url: data.portal_url };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const forgotPassword = async (email) => {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await res.json();
        return data;
    };

    const resetPassword = async (token, new_password) => {
        const res = await fetch(`${API_BASE}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, new_password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    };

    const logout = () => {
        clearSession();
        window.location.href = '/login';
    };

    /* ── RBAC helper ── */
    const can = useCallback((action) => {
        if (!user) return false;
        const rolePermissions = {
            admin: ['*'],
            salesperson: ['leads', 'pipeline', 'vehicles', 'customers'],
            finance_manager: ['finance', 'deals'],
            service_advisor: ['service', 'customers', 'vehicles'],
            parts_manager: ['parts'],
        };
        const perms = rolePermissions[user.role] || [];
        return perms.includes('*') || perms.includes(action);
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, register, forgotPassword, resetPassword, can }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
};
