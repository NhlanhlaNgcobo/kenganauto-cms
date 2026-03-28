/**
 * WhatsApp Settings Router — KenganAuto
 * ──────────────────────────────────────────────────────────────
 * Endpoints (all admin-only via JWT):
 *
 *  GET  /whatsapp/settings              → current (masked) config
 *  POST /whatsapp/settings              → save/update API key + number
 *  POST /whatsapp/settings/test         → test 360dialog connection
 *  POST /whatsapp/settings/register-webhook  → register webhook URL with 360dialog
 *  GET  /whatsapp/queue                 → message queue status
 *
 * The API key is AES-256-GCM encrypted before storage
 * and is NEVER returned to the frontend in plaintext.
 */

const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middleware/auth');
const { encrypt, decrypt, mask } = require('../services/encryption_service');
const whatsapp = require('../services/whatsapp_service');
const { queue } = require('../services/message_queue');
const WhatsappSetting = require('../models/WhatsappSetting');

/* ── Middleware: all routes require JWT + admin role ── */
router.use(authenticate);
router.use(requireRole('admin'));

/* ─────────────────────────────────────────────────────────────
   GET /whatsapp/settings
   Returns current configuration with masked API key.
   ───────────────────────────────────────────────────────────── */
router.get('/settings', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const stored = await WhatsappSetting.query().findOne({ tenant_id: tenantId });

        if (!stored) {
            return res.json({
                configured: false,
                whatsapp_number: null,
                api_key_masked: null,
                webhook_url: null,
                webhook_registered: false,
            });
        }

        // Decrypt to show masked version — NEVER send plaintext key
        let maskedKey = null;
        if (stored.encrypted_api_key) {
            try {
                const plain = decrypt(stored.encrypted_api_key);
                maskedKey = mask(plain);
            } catch { maskedKey = '••••••••(decryption error)'; }
        }

        return res.json({
            configured: true,
            whatsapp_number: stored.whatsapp_number || null,
            api_key_masked: maskedKey,
            webhook_url: stored.registered_webhook_url || null,
            webhook_registered: stored.webhook_registered || false,
        });
    } catch (err) {
        console.error('[settings] GET error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/* ─────────────────────────────────────────────────────────────
   POST /whatsapp/settings
   Save the API key + WhatsApp number.
   ───────────────────────────────────────────────────────────── */
router.post('/settings', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { api_key, whatsapp_number, webhook_secret } = req.body;

        if (!api_key || !whatsapp_number) {
            return res.status(400).json({ error: 'api_key and whatsapp_number are required.' });
        }

        const normalizedNumber = whatsapp_number.replace(/\s+/g, '').replace(/^0/, '27'); // normalize SA numbers

        // Encrypt the key before storage
        const encrypted_api_key = encrypt(api_key.trim());
        const encrypted_webhook_secret = webhook_secret ? encrypt(webhook_secret.trim()) : null;

        const existing = await WhatsappSetting.query().findOne({ tenant_id: tenantId });

        if (existing) {
            await existing.$query().patch({
                encrypted_api_key,
                whatsapp_number: normalizedNumber,
                encrypted_webhook_secret: encrypted_webhook_secret || existing.encrypted_webhook_secret,
            });
        } else {
            await WhatsappSetting.query().insert({
                tenant_id: tenantId,
                encrypted_api_key,
                whatsapp_number: normalizedNumber,
                encrypted_webhook_secret: encrypted_webhook_secret,
            });
        }

        // Load into memory for outbound sends
        whatsapp.setTenantConfig(tenantId, {
            apiKey: api_key.trim(),
            whatsappNumber: normalizedNumber,
            webhookSecret: webhook_secret?.trim() || null,
            tenantName: req.user.dealership_name || 'KenganAuto Motors',
        });

        return res.json({
            message: 'WhatsApp integration configured successfully.',
            whatsapp_number: normalizedNumber,
            api_key_masked: mask(api_key.trim()),
        });
    } catch (err) {
        console.error('[settings] POST error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/* ─────────────────────────────────────────────────────────────
   POST /whatsapp/settings/test
   Tests the 360dialog connection — never reveals the API key.
   ───────────────────────────────────────────────────────────── */
router.post('/settings/test', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const stored = await WhatsappSetting.query().findOne({ tenant_id: tenantId });

        if (!stored?.encrypted_api_key) {
            return res.status(400).json({ error: 'No API key configured. Please save your settings first.' });
        }

        let apiKey;
        try {
            apiKey = decrypt(stored.encrypted_api_key);
        } catch {
            return res.status(500).json({ error: 'Failed to read stored API key. Please re-enter it.' });
        }

        const result = await whatsapp.testConnection(apiKey);

        if (result.ok) {
            return res.json({
                ok: true,
                message: '✓ Connection to 360dialog API is working correctly.',
                config: result.config,
            });
        } else {
            return res.status(502).json({
                ok: false,
                error: `360dialog returned: ${result.error}`,
                hint: result.status === 401
                    ? 'Your API key appears to be invalid. Please check it on 360dialog Hub.'
                    : 'Check your network or 360dialog service status.',
            });
        }
    } catch (err) {
        console.error('[settings] test error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/* ─────────────────────────────────────────────────────────────
   POST /whatsapp/settings/register-webhook
   Registers the KenganAuto webhook URL with 360dialog automatically.
   ───────────────────────────────────────────────────────────── */
router.post('/settings/register-webhook', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const stored = await WhatsappSetting.query().findOne({ tenant_id: tenantId });

        if (!stored?.encrypted_api_key) {
            return res.status(400).json({ error: 'Save your API key first before registering the webhook.' });
        }

        // Build the public webhook URL
        const baseUrl = req.body.base_url
            || process.env.API_PUBLIC_URL
            || `https://api.kenganauto.co.za`;
        const webhookUrl = `${baseUrl}/api/webhooks/whatsapp/${tenantId}`;

        // Decrypt key
        let apiKey;
        try { apiKey = decrypt(stored.encrypted_api_key); }
        catch { return res.status(500).json({ error: 'Could not read API key. Please re-enter it.' }); }

        // Temporarily load into memory so registerWebhook() can use it
        whatsapp.setTenantConfig(tenantId, {
            apiKey,
            whatsappNumber: stored.whatsapp_number,
            webhookSecret: stored.encrypted_webhook_secret ? decrypt(stored.encrypted_webhook_secret) : null,
        });

        try {
            const result = await whatsapp.registerWebhook(tenantId, webhookUrl);
            await stored.$query().patch({
                webhook_registered: true,
                registered_webhook_url: webhookUrl,
            });

            return res.json({
                ok: true,
                message: '✓ Webhook registered successfully with 360dialog.',
                webhook_url: webhookUrl,
                response: result,
            });
        } catch (err) {
            return res.status(502).json({
                ok: false,
                error: `Failed to register webhook: ${err.message}`,
                hint: 'Ensure your API key is correct and your server is publicly accessible.',
            });
        }
    } catch (err) {
        console.error('[settings] webhook reg error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/* ─────────────────────────────────────────────────────────────
   GET /whatsapp/queue
   Returns message queue stats + recent jobs for this tenant.
   ───────────────────────────────────────────────────────────── */
router.get('/queue', (req, res) => {
    const tenantId = req.user.tenant_id;
    return res.json({
        stats: queue.stats(tenantId),
        jobs: queue.listJobs(tenantId, 30),
    });
});

/* ─────────────────────────────────────────────────────────────
   POST /whatsapp/send-test
   Sends a test WhatsApp message from the settings page.
   ───────────────────────────────────────────────────────────── */
router.post('/send-test', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { to } = req.body;

        if (!to) return res.status(400).json({ error: 'Phone number (to) is required.' });

        const stored = await WhatsappSetting.query().findOne({ tenant_id: tenantId });
        if (!stored?.encrypted_api_key) {
            return res.status(400).json({ error: 'Configure your WhatsApp settings first.' });
        }

        try {
            const apiKey = decrypt(stored.encrypted_api_key);
            whatsapp.setTenantConfig(tenantId, { apiKey, whatsappNumber: stored.whatsapp_number });
        } catch {
            return res.status(500).json({ error: 'Failed to load API key.' });
        }

        const jobId = whatsapp.sendText(
            tenantId, to,
            `👋 This is a test message from KenganAuto AI. Your WhatsApp Business integration is working correctly! 🎉`,
        );

        return res.json({ ok: true, message: 'Test message queued.', job_id: jobId });
    } catch (err) {
        console.error('[settings] test-send error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
