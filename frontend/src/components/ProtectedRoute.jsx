import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_NAV } from '../config/roles';

/**
 * ProtectedRoute
 * - Redirects to /login if not authenticated
 * - Redirects to /dashboard if role lacks access to this module
 *
 * @param {string} module - key from ROLE_NAV (e.g. 'finance')
 */
const ProtectedRoute = ({ children, module, adminOnly }) => {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (adminOnly && user.tenant_id !== 1) {
        return <Navigate to="/dashboard" replace />;
    }

    if (module) {
        const allowed = ROLE_NAV[user.role] || [];
        if (!allowed.includes(module)) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
