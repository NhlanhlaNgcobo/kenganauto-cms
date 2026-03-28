/**
 * Chatbot Router — KenganAuto
 * ─────────────────────────────────────────────────────
 * POST /chat/message       Send a message, receive AI reply
 * GET  /chat/conversations  List all conversations for tenant
 * GET  /chat/conversation/:id  Get full conversation with messages
 * GET  /chat/notifications  Unread CRM alerts
 * POST /chat/settings       Update API key / chatbot settings
 *
 * All routes (except /message from WhatsApp webhook) require JWT auth.
 */

const express = require('express');
const router = express.Router();

const { AIEngine, INTENTS } = require('../services/ai_engine');
const { getFlowContext, buildFinanceBreakdown, estimateTradeIn } = require('../services/chat_flows');
const notificationSvc = require('../services/notification_service');
const { authenticate } = require('../middleware/auth');

/* ── In-memory conversation store (replace with DB queries when PG is live) ── */
const ConversationStore = new Map();

/* ── Helpers ── */
function getOrCreateConversation(id, tenantId, channel, externalUserId) {
    if (!ConversationStore.has(id)) {
        ConversationStore.set(id, {
            id,
            tenant_id: tenantId,
            channel,
            external_user_id: externalUserId,
            messages: [],          // { role, content, timestamp }
            intent: INTENTS.LEAD_CAPTURE,
            sentiment: 0,
            session_data: {},          // accumulated structured data from conversation
            lead: null,        // lead object once captured
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
    }
    return ConversationStore.get(id);
}

function buildTenantMock(tenantId) {
    // When DB is live, fetch from tenants table. For now return mock.
    return {
        id: tenantId || 1,
        name: process.env.DEMO_TENANT_NAME || 'KenganAuto Demo Motors',
        address: '15 Rivonia Road',
        city: 'Sandton',
        province: 'Gauteng',
        whatsapp_number: '+27 82 000 1234',
        opening_hours: 'Mon–Fri: 08:00–17:30 | Sat: 08:00–13:00 | Sun: Closed',
        plan: 'growth',
    };
}

/* ─────────────────────────────────────────────────────────────
   POST /chat/message
   Public endpoint — used by website widget + WhatsApp webhook
   ───────────────────────────────────────────────────────────── */
router.post('/message', async (req, res) => {
    const {
        message,
        conversation_id,
        channel = 'website',
        external_user_id = 'anon',
        tenant_id,
    } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required.' });
    }

    const convId = conversation_id || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tenant = buildTenantMock(tenant_id || req.tenant?.id);
    const conv = getOrCreateConversation(convId, tenant.id, channel, external_user_id);

    try {
        /* 1. Append user message */
        conv.messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

        /* 2. Detect intent + sentiment */
        const analysis = await AIEngine.detectIntentAndSentiment(message, conv.messages.slice(-6));
        conv.intent = analysis.intent;
        conv.sentiment = analysis.sentiment;

        // Merge extracted data into session_data
        if (analysis.extracted) {
            Object.entries(analysis.extracted).forEach(([k, v]) => {
                if (v !== null && v !== undefined) conv.session_data[k] = v;
            });
        }

        /* 3. Handle HUMAN_HANDOFF immediately */
        const isHandoff = conv.intent === INTENTS.HUMAN_HANDOFF || analysis.is_frustrated;

        /* 4. Build system prompt + flow context */
        const systemPrompt = AIEngine.buildSystemPrompt(tenant);
        const flowContext = await getFlowContext(conv.intent, conv.session_data);

        /* 5. Generate Claude response */
        const aiResult = await AIEngine.chat({
            tenant,
            messages: conv.messages,
            systemPrompt,
            intentContext: flowContext,
        });

        /* 6. Parse any extracted fields Claude embedded */
        const extracted = AIEngine.parseExtracted(aiResult.text);
        if (extracted) {
            Object.entries(extracted).forEach(([k, v]) => {
                if (v) conv.session_data[k] = v;
            });
        }

        /* 7. Clean the response text (remove hidden EXTRACTED comment) */
        const cleanText = AIEngine.stripExtracted(aiResult.text);

        /* 8. Append assistant response */
        conv.messages.push({ role: 'assistant', content: cleanText, timestamp: new Date().toISOString() });
        conv.updated_at = new Date().toISOString();

        /* 9. Update lead object from session data */
        if (!conv.lead) conv.lead = {};
        const sd = conv.session_data;
        if (sd.name) conv.lead.customer_name = sd.name;
        if (sd.phone) conv.lead.customer_phone = sd.phone;
        if (sd.email) conv.lead.customer_email = sd.email;
        if (sd.vehicle_interest) conv.lead.vehicle_interest = sd.vehicle_interest;

        /* 10. Trigger notifications for qualified intents */
        const qualifiedIntents = [INTENTS.TEST_DRIVE, INTENTS.FINANCE, INTENTS.SERVICE_BOOKING, INTENTS.TRADE_IN];
        const isQualified = qualifiedIntents.includes(conv.intent) && conv.lead?.customer_phone;

        if (isHandoff) {
            await notificationSvc.notifyHumanHandoff({ tenant, lead: conv.lead, conversationId: convId, channel });
        } else if (isQualified) {
            await notificationSvc.notifyLeadQualified({ tenant, lead: conv.lead, conversationId: convId, intent: conv.intent, channel });
        }

        /* 11. Build enriched response with intent-specific extras */
        const extras = buildExtras(conv.intent, conv.session_data);

        return res.json({
            conversation_id: convId,
            message: cleanText,
            intent: conv.intent,
            sentiment: conv.sentiment,
            is_handoff: isHandoff,
            degraded: aiResult.degraded || false,
            extras,     // e.g. finance breakdown, trade-in estimate
            session_data: conv.session_data,
        });

    } catch (err) {
        console.error('Chat engine error:', err);
        return res.status(500).json({
            error: 'Chat engine error.',
            message: `We're experiencing a technical issue. Please call us directly at ${tenant.whatsapp_number}.`,
            conversation_id: convId,
        });
    }
});

/* ─────────────────────────────────────────────────────────────
   GET /chat/conversations  (CRM — requires auth)
   ───────────────────────────────────────────────────────────── */
router.get('/conversations', authenticate, (req, res) => {
    const tenantId = req.user.tenant_id;
    const convs = Array.from(ConversationStore.values())
        .filter(c => c.tenant_id === tenantId)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 100)
        .map(c => ({
            id: c.id,
            channel: c.channel,
            intent: c.intent,
            sentiment: c.sentiment,
            lead: c.lead,
            message_count: c.messages.length,
            last_message: c.messages[c.messages.length - 1]?.content?.slice(0, 100),
            created_at: c.created_at,
            updated_at: c.updated_at,
        }));

    return res.json({ conversations: convs, total: convs.length });
});

/* ─────────────────────────────────────────────────────────────
   GET /chat/conversation/:id  (CRM — requires auth)
   ───────────────────────────────────────────────────────────── */
router.get('/conversation/:id', authenticate, (req, res) => {
    const conv = ConversationStore.get(req.params.id);
    if (!conv || conv.tenant_id !== req.user.tenant_id) {
        return res.status(404).json({ error: 'Conversation not found.' });
    }
    return res.json(conv);
});

/* ─────────────────────────────────────────────────────────────
   GET /chat/notifications  (CRM — requires auth)
   ───────────────────────────────────────────────────────────── */
router.get('/notifications', authenticate, (req, res) => {
    const notifications = notificationSvc.getUnread(req.user.tenant_id);
    return res.json({ notifications });
});

router.post('/notifications/:id/read', authenticate, (req, res) => {
    notificationSvc.markRead(Number(req.params.id));
    return res.json({ ok: true });
});

/* ─────────────────────────────────────────────────────────────
   POST /chat/settings  — Update API key / settings (admin only)
   ───────────────────────────────────────────────────────────── */
router.post('/settings', authenticate, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can update chatbot settings.' });
    }
    const { anthropic_api_key, demo_tenant_name } = req.body;

    if (anthropic_api_key) {
        process.env.ANTHROPIC_API_KEY = anthropic_api_key;
        AIEngine._client = null; // force re-init with new key
    }
    if (demo_tenant_name) {
        process.env.DEMO_TENANT_NAME = demo_tenant_name;
    }

    return res.json({ message: 'Settings updated successfully.' });
});

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */
function buildExtras(intent, sessionData) {
    if (intent === INTENTS.FINANCE && sessionData.vehicle_price && sessionData.deposit) {
        return {
            type: 'finance_breakdown',
            data: buildFinanceBreakdown(
                Number(sessionData.vehicle_price),
                Number(sessionData.deposit),
            ),
        };
    }
    if (intent === INTENTS.TRADE_IN && sessionData.year && sessionData.make) {
        return {
            type: 'trade_in_estimate',
            data: estimateTradeIn(sessionData),
        };
    }
    return null;
}

module.exports = router;
