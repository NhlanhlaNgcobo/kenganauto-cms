const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

const JWT_SECRET = process.env.JWT_SECRET || 'kengan_auto_dev_secret_change_in_prod';

/** Issue a signed JWT embedding last_active for idle-session tracking */
function signToken(user, tenantId) {
    return jwt.sign(
        {
            id: user.id,
            tenant_id: tenantId,
            role: user.role,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            last_active: Date.now(),
        },
        JWT_SECRET,
        { expiresIn: '9h' }  // hard cap — inactivity check at 8h is done in middleware
    );
}

/* ─────────────────────────────────────────────────────────────
   POST /auth/login
   ───────────────────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
    const { email, password, subdomain } = req.body;
    if (!email || !password || !subdomain) {
        return res.status(400).json({ error: 'Email, password and subdomain are required.' });
    }

    try {
        const tenant = await Tenant.query().where('subdomain', subdomain).first();
        if (!tenant) {
            return res.status(401).json({ error: 'Invalid dealership or subdomain.' });
        }

        const user = await User.query()
            .where('email', email.toLowerCase().trim())
            .where('tenant_id', tenant.id)
            .where('active', true)
            .first();

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials for this dealership.' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // Update last_login timestamp
        await User.query().patchAndFetchById(user.id, { last_login: new Date().toISOString() });

        const token = signToken(user, user.tenant_id);
        return res.json({
            token,
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role,
                tenant_id: user.tenant_id,
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

/* ─────────────────────────────────────────────────────────────
   POST /auth/register  — 5-step onboarding wizard submission
   ───────────────────────────────────────────────────────────── */
router.post('/register', async (req, res) => {
    const {
        // Step 1
        dealership_name, address, province,
        // Step 2
        admin_first_name, admin_last_name, admin_email, admin_password,
        // Step 3
        whatsapp_number,
        // Step 4
        plan,
    } = req.body;

    // Basic validation
    if (!dealership_name || !admin_email || !admin_password || !plan) {
        return res.status(400).json({ error: 'Missing required registration fields.' });
    }
    if (admin_password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Generate subdomain from dealership name
    const subdomain = dealership_name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .substring(0, 63);

    const SALT_ROUNDS = 12;

    try {
        // Check subdomain uniqueness
        const existingTenant = await Tenant.query().findOne({ subdomain });
        if (existingTenant) {
            return res.status(409).json({ error: `Subdomain "${subdomain}" is already taken. Please use a different dealership name.` });
        }

        // Check email uniqueness
        const existingUser = await User.query().findOne({ email: admin_email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(409).json({ error: 'An account with this email address already exists.' });
        }

        const password_hash = await bcrypt.hash(admin_password, SALT_ROUNDS);

        // Create tenant + admin user in a transaction
        const result = await Tenant.transaction(async (trx) => {
            const tenant = await Tenant.query(trx).insertAndFetch({
                name: dealership_name,
                subdomain,
                plan: plan || 'starter',
                whatsapp_number: whatsapp_number || null,
                address: address || null,
                province: province || null,
                active: true,
            });

            const user = await User.query(trx).insertAndFetch({
                tenant_id: tenant.id,
                first_name: admin_first_name,
                last_name: admin_last_name,
                email: admin_email.toLowerCase().trim(),
                password_hash,
                role: 'admin',
                active: true,
            });

            return { tenant, user };
        });

        const token = signToken(result.user, result.tenant.id);
        return res.status(201).json({
            message: 'Dealership registered successfully.',
            subdomain,
            portal_url: `https://${subdomain}.kenganauto.co.za`,
            token,
            user: {
                id: result.user.id,
                first_name: result.user.first_name,
                last_name: result.user.last_name,
                email: result.user.email,
                role: result.user.role,
                tenant_id: result.tenant.id,
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

/* ─────────────────────────────────────────────────────────────
   POST /auth/forgot-password
   ───────────────────────────────────────────────────────────── */
/** In-memory store for dev. In production use your DB + Redis. */
const resetTokenStore = new Map();

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    try {
        const user = await User.query().findOne({ email: email.toLowerCase().trim() });

        // Always respond the same way to prevent user enumeration
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            resetTokenStore.set(token, { userId: user.id, expires: Date.now() + 15 * 60 * 1000 }); // 15 min

            // TODO: Replace console.log with actual email service (SendGrid / Nodemailer)
            console.log(`[PASSWORD RESET] Token for ${email}: ${token}`);
            console.log(`[PASSWORD RESET] Link: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`);
        }

        return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

/* ─────────────────────────────────────────────────────────────
   POST /auth/reset-password
   ───────────────────────────────────────────────────────────── */
router.post('/reset-password', async (req, res) => {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
        return res.status(400).json({ error: 'Token and new password are required.' });
    }
    if (new_password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const record = resetTokenStore.get(token);
    if (!record || Date.now() > record.expires) {
        return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    try {
        const password_hash = await bcrypt.hash(new_password, 12);
        await User.query().patchAndFetchById(record.userId, { password_hash });
        resetTokenStore.delete(token);
        return res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

/* ─────────────────────────────────────────────────────────────
   POST /auth/refresh — extend session (re-issue token on activity)
   ───────────────────────────────────────────────────────────── */
router.post('/refresh', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required.' });

    try {
        const payload = jwt.verify(token, JWT_SECRET, { ignoreExpiration: false });
        const EIGHT_HOURS = 8 * 60 * 60 * 1000;
        if (Date.now() - payload.last_active > EIGHT_HOURS) {
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }

        const freshToken = jwt.sign({ ...payload, last_active: Date.now() }, JWT_SECRET, { expiresIn: '9h' });
        return res.json({ token: freshToken });
    } catch {
        return res.status(401).json({ error: 'Invalid token.' });
    }
});

module.exports = router;
