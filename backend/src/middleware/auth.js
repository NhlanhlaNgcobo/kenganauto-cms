const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'kengan_auto_dev_secret_change_in_prod';
const SESSION_MAX_IDLE_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Verifies the Bearer JWT and attaches req.user.
 * Also enforces the 8-hour inactivity window via the `iat` claim.
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);

        // Enforce 8-hour inactivity — the frontend must re-issue the token on activity
        const idleMs = Date.now() - payload.last_active;
        if (idleMs > SESSION_MAX_IDLE_MS) {
            return res.status(401).json({ error: 'Session expired due to inactivity. Please log in again.' });
        }

        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

/**
 * Role gate — use after authenticate.
 * requireRole('admin', 'finance_manager')
 */
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied: insufficient role.' });
    }
    next();
};

module.exports = { authenticate, requireRole };
