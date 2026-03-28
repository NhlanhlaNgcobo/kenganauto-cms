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

// We'll simulate requiring `auth` for settings, but webhooks remain unauthenticated or use tenant_id tokens.
const { authenticate } = require('../middleware/auth');
const notificationService = require('../services/notification_service');
const whatsappService = require('../services/whatsapp_service'); // to trigger chatbot explicitly

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
        let source = 'email_unknown';
        if (from.includes('autotrader.co.za') || subject.includes('Autotrader')) source = 'autotrader';
        else if (from.includes('cars.co.za') || subject.includes('Cars.co.za')) source = 'cars_coza';

        // Extract using basic Regex logic typical for these structured emails
        const nameMatch = text.match(/Name:\s*(.+)/i);
        const phoneMatch = text.match(/Phone:\s*([0-9\+\s]+)/i);
        const emailMatch = text.match(/Email:\s*([^\s]+@[^\s]+)/i);
        const vehicleMatch = text.match(/Vehicle:\s*(.+)/i) || text.match(/Enquiry regarding:\s*(.+)/i);

        const customerName = nameMatch ? nameMatch[1].trim() : 'External Lead';
        const customerPhone = phoneMatch ? phoneMatch[1].trim() : '';
        const customerEmail = emailMatch ? emailMatch[1].trim() : '';
        const vehicleInterest = vehicleMatch ? vehicleMatch[1].trim() : 'Unknown Vehicle';

        // B) Create Lead (Simulated DB Insert)
        const mockLead = {
            id: `LD-${Date.now()}`,
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
            vehicle: vehicleInterest,
            source: source,
            ai_score: Math.floor(Math.random() * 30) + 60, // 60-90 score
            summary: `Automated ${source} extraction.`
        };

        if (source === 'autotrader') mockIntegrations.autotrader.leads_this_month++;
        if (source === 'cars_coza') mockIntegrations.cars_coza.leads_this_month++;

        // C) Trigger Chatbot WhatsApp message immediately via WhatsApp Service
        if (customerPhone) {
            // Simulate 60s delay via setImmediate or just fire now
            setTimeout(async () => {
                await whatsappService.sendText(tenant_id, customerPhone, `Hi ${customerName.split(' ')[0]}, thanks for your enquiry regarding the ${vehicleInterest} via ${source === 'autotrader' ? 'Autotrader' : 'Cars.co.za'}. I'm the KenganAuto AI Assistant! Are you looking to finance this vehicle or trade-in your current one?`);
            }, 2000); // 2 seconds for demo speed
        }

        // D) Notify Salesperson
        await notificationService.triggerNewLeadAlert('sales@kenganauto.co.za', '0820000000', mockLead);

        res.json({ success: true, message: `Parsed lead via ${source}`, lead: mockLead });
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

        // Simulating FB structural parsing
        const mockLead = {
            id: `FB-${Date.now()}`,
            name: req.body.name || 'Facebook Lead',
            phone: req.body.phone || '+27821234567',
            vehicle: req.body.vehicle || 'Facebook Ad Vehicle',
            source: 'facebook',
            ai_score: 85,
            summary: 'Extracted from Facebook Lead Ads Webhook.'
        };

        mockIntegrations.facebook.leads_this_month++;

        if (mockLead.phone) {
            setTimeout(async () => {
                await whatsappService.sendText(tenant_id, mockLead.phone, `Hi ${mockLead.name.split(' ')[0]}, thanks for clicking our Facebook Ad regarding the ${mockLead.vehicle}. I'm the KenganAuto AI Assistant! Can I help you book a test drive?`);
            }, 2000);
        }

        await notificationService.triggerNewLeadAlert('sales@kenganauto.co.za', '0820000000', mockLead);

        res.json({ success: true, message: 'Facebook Lead processed.' });
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

        const mockLead = {
            id: `GEN-${Date.now()}`,
            name: customer_name,
            phone: customer_phone,
            email: customer_email || '',
            vehicle: vehicle_interest || 'Unknown',
            source: source || 'generic_webhook',
            ai_score: 75,
            summary: 'Ingested via Generic API Webhook.'
        };

        mockIntegrations.generic_webhook.leads_this_month++;

        setTimeout(async () => {
            await whatsappService.sendText(tenant_id, customer_phone, `Hi ${customer_name.split(' ')[0]}, thanks for your enquiry regarding the ${mockLead.vehicle}. I'm the KenganAuto AI Assistant. How can we assist you today?`);
        }, 2000);

        await notificationService.triggerNewLeadAlert('sales@kenganauto.co.za', '0820000000', mockLead);

        res.json({ success: true, message: 'Webook Lead successfully created and chatbot triggered.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = { router };
