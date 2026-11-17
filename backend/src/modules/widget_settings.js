/**
 * Widget Settings Router — KenganAuto
 * ──────────────────────────────────────────────────────────────
 * GET    /api/widget/config/:tenant_id      → public config (for widget.js to fetch)
 * GET    /api/widget/settings               → admin: full config
 * POST   /api/widget/settings               → admin: save config
 * POST   /api/widget/autotrader-webhook     → inbound Autotrader email-parsed lead
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');

/* ── In-memory store for widget configs (per tenant).
      Replace with a DB table in production. ── */
const widgetConfigs = new Map();

function defaultConfig(tenantId) {
    return {
        tenant_id: tenantId,
        bubble_color: '#1B2A4A',          // navy blue
        accent_color: '#C9A84C',          // championship gold
        greeting: "Hi! I'm the KenganAuto AI assistant. How can I help you today?",
        dealership_name: 'KenganAuto Motors',
        logo_url: null,
        position: 'bottom-right',         // 'bottom-right' | 'bottom-left'
        show_lead_form: true,             // collect name + phone before first message
        whatsapp_number: null,            // for "continue on WhatsApp" CTA
        widget_title: 'AI Assistant',
        offline_message: "We're offline right now, but leave a message and we'll respond shortly!",
        business_hours: 'Mon–Fri 08:00–17:30 | Sat 08:00–13:00',
        auto_open_delay: 0,               // 0 = don't auto-open. Seconds otherwise.
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
}

/* ─────────────────────────────────────────────────────────────
   GET /api/widget/config/:tenant_id
   Public — called by widget.js at load time (no auth required)
   ───────────────────────────────────────────────────────────── */
router.get('/config/:tenant_id', async (req, res) => {
    const tenantId = Number(req.params.tenant_id);
    let config = widgetConfigs.get(tenantId);
    if (!config) {
        // Unconfigured tenants get their own name/brand colour instead of KenganAuto defaults
        config = defaultConfig(tenantId);
        try {
            const t = await require('../config/db')('tenants').where({ id: tenantId }).first();
            if (t) {
                config.dealership_name = t.name;
                config.greeting = `Hi! I'm the ${t.name} virtual assistant. Ask me about any car in stock, finance, trade-ins or booking a service.`;
                if (t.primary_color) { config.accent_color = t.primary_color; config.bubble_color = '#0B0D10'; }
                if (t.whatsapp_number) config.whatsapp_number = t.whatsapp_number;
            }
        } catch { /* keep defaults */ }
    }
    // Return only the fields the public widget needs
    return res.json({
        tenant_id: config.tenant_id,
        bubble_color: config.bubble_color,
        accent_color: config.accent_color,
        greeting: config.greeting,
        dealership_name: config.dealership_name,
        logo_url: config.logo_url,
        position: config.position,
        show_lead_form: config.show_lead_form,
        whatsapp_number: config.whatsapp_number,
        widget_title: config.widget_title,
        offline_message: config.offline_message,
        business_hours: config.business_hours,
        auto_open_delay: config.auto_open_delay,
    });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/widget/settings
   Admin: full config for settings page
   ───────────────────────────────────────────────────────────── */
router.get('/settings', authenticate, requireRole('admin'), (req, res) => {
    const tenantId = req.user.tenant_id;
    const config = widgetConfigs.get(tenantId) || defaultConfig(tenantId);
    return res.json(config);
});

/* ─────────────────────────────────────────────────────────────
   POST /api/widget/settings
   Admin: save widget config
   ───────────────────────────────────────────────────────────── */
router.post('/settings', authenticate, requireRole('admin'), (req, res) => {
    const tenantId = req.user.tenant_id;
    const existing = widgetConfigs.get(tenantId) || defaultConfig(tenantId);

    const allowed = [
        'bubble_color', 'accent_color', 'greeting', 'dealership_name',
        'logo_url', 'position', 'show_lead_form', 'whatsapp_number',
        'widget_title', 'offline_message', 'business_hours', 'auto_open_delay',
    ];

    const updated = { ...existing };
    allowed.forEach(key => {
        if (req.body[key] !== undefined) updated[key] = req.body[key];
    });
    updated.updated_at = new Date().toISOString();

    widgetConfigs.set(tenantId, updated);
    return res.json({ message: 'Widget configuration saved.', config: updated });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/widget/autotrader-webhook
   Receives parsed email forwarder payloads from Autotrader / Cars.co.za
   Parses the lead and fires a WhatsApp AI response within 60 seconds.
   ───────────────────────────────────────────────────────────── */
const { AIEngine, INTENTS } = require('../services/ai_engine');
const whatsapp = require('../services/whatsapp_service');

router.post('/autotrader-webhook', async (req, res) => {
    /* ── Validate shared secret ── */
    const secret = req.headers['x-webhook-secret'];
    const expected = process.env.AUTOTRADER_WEBHOOK_SECRET || 'at-webhook-secret';
    if (secret !== expected) {
        return res.status(401).json({ error: 'Unauthorized webhook.' });
    }

    try {
        const {
            tenant_id,
            buyer_name,
            buyer_phone,
            buyer_email,
            vehicle_make,
            vehicle_model,
            vehicle_year,
            vehicle_price,
            listing_url,
            message: buyerMessage,
            source = 'autotrader',
        } = req.body;

        if (!tenant_id || !buyer_phone) {
            return res.status(400).json({ error: 'tenant_id and buyer_phone are required.' });
        }

        /* Acknowledge immediately */
        res.status(200).json({ received: true, message: 'Lead processing started.' });

        /* ── Async: build a warm intro message and send via WhatsApp ── */
        const tenantConfig = whatsapp.getTenantConfig(Number(tenant_id));
        const tenantName = tenantConfig?.tenantName || 'KenganAuto Motors';
        const vehicleStr = [vehicle_year, vehicle_make, vehicle_model].filter(Boolean).join(' ');

        /* Build conversational context for AI */
        const systemContext = `You are the AI sales assistant for ${tenantName}. 
A buyer named ${buyer_name || 'a customer'} just submitted an enquiry on ${source} for a ${vehicleStr || 'vehicle'}.
Their message was: "${buyerMessage || 'I am interested in this vehicle.'}"
${vehicle_price ? `The asking price is R ${Number(vehicle_price).toLocaleString('en-ZA')}.` : ''}
Send a warm, professional, personalised WhatsApp greeting. 
Mention their name, the specific vehicle they enquired about, and offer to answer questions or book a test drive.
Keep it under 3 sentences. Friendly and direct.`;

        const aiResult = await AIEngine.chat({
            tenant: { id: tenant_id, name: tenantName },
            messages: [{ role: 'user', content: buyerMessage || 'I am interested in this vehicle.' }],
            systemPrompt: systemContext,
            intentContext: '',
        });

        const greeting = AIEngine.stripExtracted(aiResult.text);

        /* ── Send WhatsApp message ── */
        const normalizedPhone = buyer_phone.replace(/[\s-()]/g, '').replace(/^0/, '27');
        await whatsapp.sendText(Number(tenant_id), normalizedPhone, greeting);

        console.log(`[autotrader-webhook] Lead processed for tenant ${tenant_id}: ${buyer_name} (${buyer_phone}) → ${vehicleStr}`);

    } catch (err) {
        console.error('[autotrader-webhook] Error:', err);
    }
});

module.exports = router;
