/**
 * Integrations & External Webhooks Module — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * Receives leads from Autotrader, Cars.co.za, Facebook via Email parsing or Direct Webhooks.
 */

'use strict';

const express = require('express');
const router = express.Router();
const pino = require('pino');
const logger = pino({ name: 'integrations' });

const { authenticate } = require('../middleware/auth');
const notificationService = require('../services/notification_service');
const whatsappService = require('../services/whatsapp_service');

// Load Lead model gracefully
let Lead;
try { Lead = require('../models/Lead'); } catch { /* DB not ready */ }

/** Try DB insert with mock fallback */
async function insertLead({ tenant_id, customer_name, customer_phone, customer_email, vehicle_interest, source }) {
    const baseData = {
        tenant_id: Number(tenant_id) || 1,
        customer_name: customer_name || 'External Lead',
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        vehicle_interest: vehicle_interest || null,
        source,
        status: 'new',
        ai_score: Math.floor(Math.random() * 25) + 65, // 65–90 for integration leads
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    if (Lead) {
        try {
            return await Lead.query().insertAndFetch(baseData);
        } catch (e) {
            logger.warn({ err: e.message }, 'DB insert failed — using mock lead');
        }
    }

    return { id: `INT-${Date.now()}`, ...baseData };
}


// MOCK Database for demonstration
let mockIntegrations = {
    autotrader: { active: true, leads_this_month: 42 },
    cars_coza: { active: true, leads_this_month: 28 },
    facebook: { active: false, leads_this_month: 0, page_name: null },
    generic_webhook: { active: true, leads_this_month: 15 },
    widget: { active: true, leads_this_month: 85 },
    whatsapp: { active: true, leads_this_month: 120 }
};

/* ─────────────────────────────────────────────────────────────
   SETTINGS API
   ───────────────────────────────────────────────────────────── */

router.get('/settings', authenticate, (req, res) => {
    try {
        const tenant_id = req.user.tenant_id || 1;
        // Generate the specific inbound emails / webhooks based on tenant ID
        const payload = {
            ...mockIntegrations,
            inbound_email: `leads-TENANT${tenant_id}@inbound.kenganauto.co.za`,
            webhook_url: `https://api.kenganauto.co.za/api/integrations/webhook/generic/${tenant_id}`,
        };
        res.json({ success: true, integrations: payload });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/facebook/oauth', authenticate, (req, res) => {
    // Mocking Facebook OAuth Connect Flow
    mockIntegrations.facebook.active = true;
    mockIntegrations.facebook.page_name = "KenganAuto Main Page";
    res.json({ success: true, message: 'Facebook Page successfully connected.' });
});

router.post('/facebook/disconnect', authenticate, (req, res) => {
    mockIntegrations.facebook.active = false;
    mockIntegrations.facebook.page_name = null;
    res.json({ success: true, message: 'Facebook disconnected.' });
});

/* ─────────────────────────────────────────────────────────────
   WEBHOOK RECEIVERS (No Auth Middleware - Called Externally)
   ───────────────────────────────────────────────────────────── */

/**
 * Handle Inbound Parse from SendGrid/AWS SES.
 * Parses Autotrader and Cars.co.za leads submitted via designated email routing.
 */
router.post('/webhook/inbound-email/:tenant_id', async (req, res) => {
    try {
        const tenant_id = req.params.tenant_id;
        // Email APIs usually send multiparts, we'll simulate a parsed JSON payload from SendGrid.
        const { text, from, subject } = req.body;

        if (!text) return res.status(400).json({ error: 'No email body found.' });

        logger.info(`[INBOUND EMAIL] Received for Tenant ${tenant_id} from ${from}.`);

        // A) Parse Logic
        let source = 'website'; // fallback source
        if (from && (from.includes('autotrader.co.za') || subject.includes('Autotrader'))) source = 'autotrader';
        else if (from && (from.includes('cars.co.za') || subject.includes('Cars.co.za'))) source = 'cars_coza';

        // Extract using basic Regex — typical for structured Autotrader/Cars.co.za emails
        const nameMatch = text.match(/Name:\s*(.+)/i);
        const phoneMatch = text.match(/Phone:\s*([0-9\+\s]+)/i);
        const emailMatch = text.match(/Email:\s*([^\s]+@[^\s]+)/i);
        const vehicleMatch = text.match(/Vehicle:\s*(.+)/i) || text.match(/Enquiry regarding:\s*(.+)/i);

        const customerName = nameMatch ? nameMatch[1].trim() : 'External Lead';
        const customerPhone = phoneMatch ? phoneMatch[1].trim() : '';
        const customerEmail = emailMatch ? emailMatch[1].trim() : '';
        const vehicleInterest = vehicleMatch ? vehicleMatch[1].trim() : 'Unknown Vehicle';

        // B) Persist lead to DB
        const lead = await insertLead({
            tenant_id,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail,
            vehicle_interest: vehicleInterest,
            source,
        });

        if (source === 'autotrader') mockIntegrations.autotrader.leads_this_month++;
        if (source === 'cars_coza') mockIntegrations.cars_coza.leads_this_month++;

        // C) Trigger WhatsApp chatbot immediately
        if (customerPhone) {
            setTimeout(async () => {
                await whatsappService.sendText(Number(tenant_id), customerPhone, `Hi ${customerName.split(' ')[0]}, thanks for your enquiry regarding the ${vehicleInterest} via ${source === 'autotrader' ? 'Autotrader' : 'Cars.co.za'}. I'm the KenganAuto AI Assistant! Are you looking to finance this vehicle or trade-in your current one?`);
            }, 2000);
        }

        // D) Notify team (TODO: fetch real team email from tenant settings)
        await notificationService.notifyLeadQualified({
            tenant: { id: Number(tenant_id), name: 'KenganAuto' },
            lead,
            conversationId: null,
            intent: 'VEHICLE_ENQUIRY',
            channel: source,
        });

        res.json({ success: true, message: `Parsed lead via ${source}`, lead_id: lead.id });
    } catch (e) {
        logger.error(`Inbound Email Parse Error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

/**
 * Handle Facebook Lead Ads Webhook
 */
router.post('/webhook/facebook/:tenant_id', async (req, res) => {
    try {
        const tenant_id = req.params.tenant_id;
        const { entry } = req.body; // FB format

        logger.info(`[FB WEBHOOK] Received lead ad event.`);

        const customerName = req.body.name || 'Facebook Lead';
        const customerPhone = req.body.phone || '';
        const vehicleInterest = req.body.vehicle || 'Facebook Ad Vehicle';

        // Persist lead to DB
        const lead = await insertLead({
            tenant_id,
            customer_name: customerName,
            customer_phone: customerPhone,
            vehicle_interest: vehicleInterest,
            source: 'facebook',
        });

        mockIntegrations.facebook.leads_this_month++;

        if (customerPhone) {
            setTimeout(async () => {
                await whatsappService.sendText(Number(tenant_id), customerPhone, `Hi ${customerName.split(' ')[0]}, thanks for clicking our Facebook Ad regarding the ${vehicleInterest}. I'm the KenganAuto AI Assistant! Can I help you book a test drive?`);
            }, 2000);
        }

        await notificationService.notifyLeadQualified({
            tenant: { id: Number(tenant_id), name: 'KenganAuto' },
            lead,
            conversationId: null,
            intent: 'VEHICLE_ENQUIRY',
            channel: 'facebook',
        });

        res.json({ success: true, message: 'Facebook Lead processed.', lead_id: lead.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * Handle Generic Platform Webhook (e.g. Website Contact Forms, Custom Endpoints)
 */
router.post('/webhook/generic/:tenant_id', async (req, res) => {
    try {
        const tenant_id = req.params.tenant_id;
        // Requires specific format documented in UI
        const { customer_name, customer_phone, customer_email, vehicle_interest, source } = req.body;

        if (!customer_name || !customer_phone) return res.status(400).json({ error: 'Missing mandatory fields: customer_name, customer_phone.' });

        logger.info(`[GENERIC WEBHOOK] Received lead from ${source || 'generic_api'}.`);

        // Persist lead to DB
        const lead = await insertLead({
            tenant_id,
            customer_name,
            customer_phone,
            customer_email: customer_email || null,
            vehicle_interest: vehicle_interest || null,
            source: source || 'website',
        });

        mockIntegrations.generic_webhook.leads_this_month++;

        setTimeout(async () => {
            await whatsappService.sendText(Number(tenant_id), customer_phone, `Hi ${customer_name.split(' ')[0]}, thanks for your enquiry regarding the ${lead.vehicle_interest || 'vehicle'}. I'm the KenganAuto AI Assistant. How can we assist you today?`);
        }, 2000);

        await notificationService.notifyLeadQualified({
            tenant: { id: Number(tenant_id), name: 'KenganAuto' },
            lead,
            conversationId: null,
            intent: 'VEHICLE_ENQUIRY',
            channel: source || 'website',
        });

        res.json({ success: true, message: 'Webhook lead successfully created and chatbot triggered.', lead_id: lead.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = { router };
