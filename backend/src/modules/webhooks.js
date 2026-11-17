/**
 * WhatsApp Webhook Router — KenganAuto
 * ──────────────────────────────────────────────────────────────
 * POST /api/webhooks/whatsapp/:tenant_id
 *
 * Handles:
 *   1. Hub verification (GET) — 360dialog challenge handshake
 *   2. HMAC-SHA256 signature validation on every POST
 *   3. Duplicate message detection (idempotency via in-memory Set)
 *   4. Message routing to Claude AI engine
 *   5. Response delivery back to customer via WhatsApp
 *   6. Read receipts on received messages
 *   7. Status update handling (delivered, read, failed)
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { AIEngine, INTENTS } = require('../services/ai_engine');
const { getFlowContext } = require('../services/chat_flows');
const whatsapp = require('../services/whatsapp_service');
const notificationSvc = require('../services/notification_service');
const Lead = require('../models/Lead');
const Conversation = require('../models/Conversation');

/* ── Processed message ID cache (prevents double-processing) ── */
const ProcessedIds = new Set();
const MAX_CACHE = 50_000;

/* ── Extract raw body for HMAC validation ── */
router.use(express.raw({ type: 'application/json' }));

/* ─────────────────────────────────────────────────────────────
   GET /api/webhooks/whatsapp/:tenant_id
   360dialog hub verification challenge
   ───────────────────────────────────────────────────────────── */
router.get('/:tenant_id', (req, res) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;

    const config = whatsapp.getTenantConfig(Number(req.params.tenant_id));
    const expectedToken = config?.webhookSecret || process.env.WEBHOOK_VERIFY_TOKEN || 'kenganauto-verify';

    if (mode === 'subscribe' && token === expectedToken) {
        console.log(`[webhook] Hub verification successful for tenant ${req.params.tenant_id}`);
        return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification failed' });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/webhooks/whatsapp/:tenant_id
   Receives all inbound WhatsApp events from 360dialog
   ───────────────────────────────────────────────────────────── */
router.post('/:tenant_id', async (req, res) => {
    const tenantId = Number(req.params.tenant_id);

    /* ── 1. Parse raw body ── */
    let body;
    try {
        const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
        body = JSON.parse(rawBody.toString('utf8'));
    } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    /* ── 2. HMAC-SHA256 Signature Validation ── */
    const config = whatsapp.getTenantConfig(tenantId);
    const signature = req.headers['x-hub-signature-256'] || req.headers['x-360dialog-hmac'];

    if (config?.webhookSecret && signature) {
        const expected = 'sha256=' + crypto
            .createHmac('sha256', config.webhookSecret)
            .update(req.body instanceof Buffer ? req.body : JSON.stringify(body))
            .digest('hex');

        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
            console.warn(`[webhook] Invalid HMAC from tenant ${tenantId}`);
            return res.status(401).json({ error: 'Invalid signature' });
        }
    }

    /* ── 3. Acknowledge immediately (360dialog expects 200 within 15s) ── */
    res.status(200).json({ received: true });

    /* ── 4. Process each message entry asynchronously ── */
    try {
        const entry = body?.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (!value) return;

        /* Handle status updates (delivered / read / failed) — log only */
        if (value.statuses) {
            value.statuses.forEach(status => {
                console.log(`[webhook] Message ${status.id} status: ${status.status}`);
            });
            return;
        }

        const messages = value.messages;
        if (!messages?.length) return;

        for (const msg of messages) {
            await _handleInboundMessage({ tenantId, msg, value });
        }
    } catch (err) {
        console.error('[webhook] Processing error:', err);
    }
});

/* ─────────────────────────────────────────────────────────────
   Core message handler
   ───────────────────────────────────────────────────────────── */
async function _handleInboundMessage({ tenantId, msg, value }) {
    const msgId = msg.id;
    const phone = msg.from;

    /* ── Deduplication ── */
    if (ProcessedIds.has(msgId)) {
        console.log(`[webhook] Duplicate message ${msgId} — skipping`);
        return;
    }
    ProcessedIds.add(msgId);
    if (ProcessedIds.size > MAX_CACHE) {
        ProcessedIds.delete(ProcessedIds.values().next().value);
    }

    /* ── Extract text from message ── */
    const customerText = _extractText(msg);
    if (!customerText) {
        whatsapp.sendText(tenantId, phone, "Hi! I received your message but couldn't read it. Please send text or try again 😊");
        return;
    }

    /* ── Mark as read (non-fatal) ── */
    try { await whatsapp.markAsRead(tenantId, msgId); } catch { /* non-fatal */ }

    /* ── CSI survey reply ("9 great service") → record + AI triage; skip the chatbot ── */
    if (await require('./customer_care').handleCsiReply(tenantId, phone, customerText)) return;

    /* ── Build tenant context from config store ── */
    const tenantConfig = whatsapp.getTenantConfig(tenantId);
    const tenant = {
        id: tenantId,
        name: tenantConfig?.tenantName || 'KenganAuto Motors',
        whatsapp_number: tenantConfig?.whatsappNumber || '',
        opening_hours: 'Mon–Fri: 08:00–17:30 | Sat: 08:00–13:00 | Sun: Closed',
    };

    /* ── 1. Get or Create Lead (with DB fallback) ── */
    let lead = null;
    let sessionMessages = [];
    let conversation = null;
    const contactName = value.contacts?.[0]?.profile?.name || 'WhatsApp Customer';

    try {
        lead = await Lead.query().findOne({ tenant_id: tenantId, customer_phone: phone });
        if (!lead) {
            lead = await Lead.query().insert({
                tenant_id: tenantId,
                customer_name: contactName,
                customer_phone: phone,
                source: 'whatsapp',
                status: 'new',
            });
            console.log(`[webhook] Created new lead ${lead.id} for ${phone}`);
        }

        /* ── 2. Get or Create Conversation ── */
        conversation = await Conversation.query().findOne({
            tenant_id: tenantId,
            lead_id: lead.id,
            channel: 'whatsapp'
        });
        if (!conversation) {
            conversation = await Conversation.query().insert({
                tenant_id: tenantId,
                lead_id: lead.id,
                channel: 'whatsapp',
                messages: JSON.stringify([]),
            });
        }

        /* ── 3. Deserialize stored messages ── */
        const rawMessages = conversation.messages;
        sessionMessages = Array.isArray(rawMessages)
            ? rawMessages
            : (typeof rawMessages === 'string' ? JSON.parse(rawMessages || '[]') : []);

    } catch (dbErr) {
        console.error(`[webhook] DB error for tenant ${tenantId}, falling back to stateless mode:`, dbErr.message);
        // Stateless fallback — still reply to customer but don't persist
        lead = { id: null, customer_name: contactName, customer_phone: phone };
        sessionMessages = [];
    }

    /* ── Append User Message ── */
    sessionMessages.push({ role: 'user', content: customerText, timestamp: new Date().toISOString() });

    /* ── Intent detection ── */
    const analysis = await AIEngine.detectIntentAndSentiment(customerText, sessionMessages.slice(-6));

    /* ── Claude response ── */
    const systemPrompt = AIEngine.buildSystemPrompt(tenant);
    const flowContext = await getFlowContext(analysis.intent, {});
    const aiResult = await AIEngine.chat({
        tenant,
        messages: sessionMessages,
        systemPrompt,
        intentContext: flowContext,
    });

    const cleanText = AIEngine.stripExtracted(aiResult.text);

    /* ── Append AI response ── */
    sessionMessages.push({ role: 'assistant', content: cleanText, timestamp: new Date().toISOString() });

    /* ── 4. Persist to DB (non-fatal) ── */
    if (conversation?.id) {
        try {
            await conversation.$query().patch({
                messages: JSON.stringify(sessionMessages),
                intent_detected: analysis.intent,
                sentiment_score: analysis.sentiment,
                updated_at: new Date().toISOString(),
            });

            // Update lead name if extracted and still default
            if (analysis.extracted?.name && lead.customer_name === 'WhatsApp Customer') {
                await lead.$query().patch({ customer_name: analysis.extracted.name });
            }
        } catch (persistErr) {
            console.error('[webhook] Failed to persist conversation:', persistErr.message);
        }
    }

    /* ── 5. Send response back via WhatsApp ── */
    whatsapp.sendText(tenantId, phone, cleanText);

    /* ── Send interactive buttons for certain intents ── */
    await _maybeAddQuickReplies(tenantId, phone, analysis.intent, analysis.extracted || {});

    /* ── Notifications for qualified leads ── */
    const isHandoff = analysis.intent === INTENTS.HUMAN_HANDOFF || analysis.is_frustrated;
    if (isHandoff) {
        await notificationSvc.notifyHumanHandoff({
            tenant, lead, conversationId: conversation?.id, channel: 'whatsapp',
        });
    } else if (['TEST_DRIVE', 'FINANCE', 'SERVICE_BOOKING', 'TRADE_IN'].includes(analysis.intent)) {
        await notificationSvc.notifyLeadQualified({
            tenant, lead, conversationId: conversation?.id, intent: analysis.intent, channel: 'whatsapp',
        });
    }
}

/* ── Extract text from different message types ── */
function _extractText(msg) {
    switch (msg.type) {
        case 'text': return msg.text?.body || null;
        case 'button': return msg.button?.text || null;
        case 'interactive': {
            const r = msg.interactive;
            return r?.button_reply?.title || r?.list_reply?.title || null;
        }
        default: return null;
    }
}

/* ── Optional quick-reply buttons after certain intent triggers ── */
async function _maybeAddQuickReplies(tenantId, phone, intent, data) {
    if (intent === INTENTS.FINANCE && !data.vehicle_price) {
        whatsapp.sendInteractiveButtons(
            tenantId, phone,
            'What deposit amount would you like to put down?',
            [
                { id: 'deposit_0', title: 'No deposit' },
                { id: 'deposit_10', title: '10% deposit' },
                { id: 'deposit_20', title: '20% deposit' },
            ],
            'Finance Calculator',
        );
    } else if (intent === INTENTS.TEST_DRIVE && !data.test_drive_date) {
        whatsapp.sendInteractiveButtons(
            tenantId, phone,
            'When would you prefer your test drive?',
            [
                { id: 'td_this_week', title: 'This week' },
                { id: 'td_weekend', title: 'This weekend' },
                { id: 'td_next_week', title: 'Next week' },
            ],
            'Test Drive Booking',
        );
    }
}

module.exports = { router };
