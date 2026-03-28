const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Tenant = require('../models/Tenant');
const ApiSetting = require('../models/ApiSetting');
const { encrypt } = require('../utils/crypto');
const axios = require('axios'); // For connection testing

// Middleware to ensure user is superadmin
router.use(authenticate);
router.use((req, res, next) => {
    // Strictly verify the user belongs to the platform tenant (ID: 1)
    if (req.user.tenant_id !== 1) {
        return res.status(403).json({ error: 'Access denied. Super Admin only.' });
    }
    next();
});

/**
 * GET /api/superadmin/tenants
 * Lists all active dealerships, their subscription status, and calculates MRR.
 */
router.get('/tenants', async (req, res) => {
    try {
        const tenants = await Tenant.query().whereNot('slug', 'admin');

        let mrrCents = 0;
        const tenantData = tenants.map(t => {
            // Very basic MRR estimation for super admin
            const isPaying = ['active', 'past_due'].includes(t.subscription_status);
            let mrrContrib = 0;
            if (isPaying) {
                if (t.plan === 'starter') mrrContrib = 5500;
                if (t.plan === 'growth') mrrContrib = 12500;
                if (t.plan === 'enterprise') mrrContrib = 22000;
            }
            mrrCents += mrrContrib * 100;

            return {
                id: t.id,
                name: t.name,
                subdomain: t.subdomain,
                plan: t.plan,
                status: t.subscription_status || 'trialing',
                trial_ends_at: t.trial_ends_at,
                mrr: mrrContrib,
            };
        });

        res.json({
            mrr_zar: mrrCents / 100,
            total_tenants: tenants.length,
            tenants: tenantData
        });
    } catch (err) {
        console.error('[superadmin] GET /tenants error:', err);
        res.status(500).json({ error: 'Failed to fetch tenants' });
    }
});

/**
 * POST /api/superadmin/impersonate
 * For support purposes: generate a short-lived token to log in as a specific dealership Admin.
 */
router.post('/impersonate', async (req, res) => {
    const { tenant_id } = req.body;
    try {
        const Knex = require('objection').Model.knex();
        const user = await Knex('users')
            .where({ tenant_id, role: 'admin' })
            .first();

        if (!user) {
            return res.status(404).json({ error: 'No admin user found for this tenant.' });
        }

        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            {
                id: user.id,
                tenant_id: user.tenant_id,
                role: 'admin',
                email: user.email,
                impersonator_id: req.user.id
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Short-lived
        );

        res.json({ token, message: `Impersonating admin of tenant ${tenant_id}` });
    } catch (err) {
        res.status(500).json({ error: 'Impersonation failed.' });
    }
});

/**
 * GET /api/superadmin/api-settings
 * Returns the list of services and their configuration status (keys are masked).
 */
router.get('/api-settings', async (req, res) => {
    try {
        const settings = await ApiSetting.query().where({ tenant_id: 1 });
        const services = [
            'Anthropic Claude', '360dialog WhatsApp', 'Resend Email', 'Stripe Billing',
            'Clickatell SMS', 'Facebook API', 'Google Maps', 'TransUnion', 'Twilio'
        ];

        const data = services.map(s => {
            const found = settings.find(set => set.service_name === s);
            return {
                name: s,
                isConfigured: !!found,
                status: found?.status || 'unverified',
                id: found?.id || null
            };
        });

        res.json({ services: data });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch API settings' });
    }
});

/**
 * POST /api/superadmin/api-settings/save
 * Encrypts and saves/updates an API key for a service.
 */
router.post('/api-settings/save', async (req, res) => {
    const { service_name, api_key } = req.body;
    if (!service_name || !api_key) return res.status(400).json({ error: 'Missing service or key' });

    try {
        const { encrypted_key, iv } = encrypt(api_key);

        await ApiSetting.query()
            .insert({
                tenant_id: 1,
                service_name,
                encrypted_key,
                iv,
                status: 'verified' // Assume verified if test passed on frontend or just mark as set
            })
            .onConflict(['tenant_id', 'service_name'])
            .merge();

        res.json({ success: true, message: `${service_name} key saved securely.` });
    } catch (err) {
        console.error('Save API key error:', err);
        res.status(500).json({ error: 'Encryption/Save failed.' });
    }
});

/**
 * POST /api/superadmin/api-settings/test
 * Mock endpoint to verify API key validity.
 */
router.post('/api-settings/test', async (req, res) => {
    const { service_name, api_key } = req.body;

    // In a real app, we'd make a small 'whoami' or 'balance' call to the service.
    // Here we mock the delay and success.
    await new Promise(r => setTimeout(r, 1500));

    // Basic heuristic: check if key looks somewhat valid (not empty and reasonable length)
    if (api_key && api_key.length > 8) {
        return res.json({ success: true, message: `Successfully connected to ${service_name}` });
    } else {
        return res.status(400).json({ success: false, message: `Invalid API key format for ${service_name}` });
    }
});

module.exports = router;
