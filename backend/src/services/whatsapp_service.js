/**
 * WhatsApp Service — KenganAuto (360dialog)
 * ──────────────────────────────────────────────────────────────
 * Outbound messaging via 360dialog's WhatsApp Business API.
 *
 * Supports:
 *   sendText()         — plain text message
 *   sendImage()        — image with optional caption
 *   sendDocument()     — PDF/file with caption
 *   sendTemplate()     — pre-approved WhatsApp template message
 *   sendInteractive()  — interactive buttons or list messages
 *   sendTyping()       — typing indicator (read receipt)
 *
 * All sends go through the MessageQueue for retry logic.
 *
 * 360dialog API docs: https://docs.360dialog.com/whatsapp-api/
 *
 * Per-tenant config is stored encrypted. Retrieve with:
 *   const config = TenantConfigStore.get(tenantId);
 */

const https = require('https');
const http = require('http');
const { queue } = require('./message_queue');
const pino = require('pino');
const logger = pino({ name: 'whatsapp-service' });

/* ── In-memory tenant config store (keyed by tenantId) ── */
/* In production swap with DB read from a tenant_whatsapp_config table          */
const TenantConfigStore = new Map();

/* Base URL for 360dialog Cloud API */
const DIALOG360_BASE = 'https://waba.360dialog.io';

/* ── Low-level HTTP helper (no axios dep needed) ── */
function httpRequest({ method = 'POST', url, headers = {}, body }) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const options = {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...headers,
            },
        };

        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) {
                        reject(Object.assign(new Error(`HTTP ${res.statusCode}`), { status: res.statusCode, body: parsed }));
                    } else {
                        resolve(parsed);
                    }
                } catch {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

/* ── Primary send to 360dialog ── */
async function _sendToDialog360(tenantId, payload) {
    const config = TenantConfigStore.get(tenantId);
    if (!config?.apiKey) throw new Error(`No 360dialog API key configured for tenant ${tenantId}`);

    const url = `${DIALOG360_BASE}/v1/messages`;
    const result = await httpRequest({
        url,
        headers: { 'D360-API-KEY': config.apiKey },
        body: payload,
    });

    logger.info({ tenantId, wamid: result?.messages?.[0]?.id }, 'Message sent via 360dialog');
    return result;
}

/* ═══════════════════════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════════════════════ */

/**
 * Send a plain text message.
 * Returns the queue job ID.
 */
function sendText(tenantId, to, text, { priority = false } = {}) {
    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text },
    };
    return _enqueue(tenantId, to, 'text', payload, priority);
}

/**
 * Send an image with optional caption.
 * @param {string} mediaUrl - public HTTPS URL of the image
 */
function sendImage(tenantId, to, mediaUrl, caption = '') {
    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: { link: mediaUrl, caption },
    };
    return _enqueue(tenantId, to, 'image', payload);
}

/**
 * Send a document/PDF.
 * @param {string} documentUrl - public HTTPS URL
 * @param {string} filename    - display name e.g. "Finance Quote.pdf"
 */
function sendDocument(tenantId, to, documentUrl, filename, caption = '') {
    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'document',
        document: { link: documentUrl, filename, caption },
    };
    return _enqueue(tenantId, to, 'document', payload);
}

/**
 * Send a pre-approved WhatsApp template message.
 * @param {string} templateName     - exact template name from Meta/360dialog
 * @param {string} languageCode     - e.g. 'en_US' or 'af'
 * @param {Array}  components       - template parameter components
 *
 * Example components for a service reminder:
 * [{ type: 'body', parameters: [{ type: 'text', text: 'David' }, { type: 'text', text: '2026-03-25' }] }]
 */
function sendTemplate(tenantId, to, templateName, languageCode, components = []) {
    const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
            name: templateName,
            language: { code: languageCode },
            components,
        },
    };
    return _enqueue(tenantId, to, 'template', payload);
}

/**
 * Send interactive button message.
 * @param {string} bodyText  - message body
 * @param {Array}  buttons   - array of { id, title } (max 3)
 * @param {string} headerText- optional header text
 */
function sendInteractiveButtons(tenantId, to, bodyText, buttons, headerText = '') {
    if (buttons.length > 3) throw new Error('WhatsApp interactive messages support maximum 3 buttons');

    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
            type: 'button',
            ...(headerText && { header: { type: 'text', text: headerText } }),
            body: { text: bodyText },
            action: {
                buttons: buttons.map(b => ({
                    type: 'reply',
                    reply: { id: b.id, title: b.title.slice(0, 20) }, // WhatsApp 20-char limit
                })),
            },
        },
    };
    return _enqueue(tenantId, to, 'interactive_buttons', payload);
}

/**
 * Send interactive list message.
 * @param {string} bodyText      - message body
 * @param {string} buttonLabel   - label for the list button (max 20 chars)
 * @param {Array}  sections      - [{ title, rows: [{ id, title, description }] }]
 */
function sendInteractiveList(tenantId, to, bodyText, buttonLabel, sections) {
    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
            type: 'list',
            body: { text: bodyText },
            action: { button: buttonLabel, sections },
        },
    };
    return _enqueue(tenantId, to, 'interactive_list', payload);
}

/**
 * Mark a received message as read (shows double blue tick to customer)
 */
async function markAsRead(tenantId, messageId) {
    const config = TenantConfigStore.get(tenantId);
    if (!config?.apiKey) return;
    try {
        await httpRequest({
            url: `${DIALOG360_BASE}/v1/messages`,
            headers: { 'D360-API-KEY': config.apiKey },
            body: { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
        });
    } catch (err) {
        logger.warn({ messageId, err: err.message }, 'Failed to mark message as read');
    }
}

/* ── Enqueue helper ── */
function _enqueue(tenantId, to, type, payload, priority = false) {
    const jobId = queue.addJob({
        tenantId,
        type: `whatsapp:${type}`,
        payload: { tenantId, to, payload },
        handler: async ({ tenantId: tid, payload: p }) => {
            await _sendToDialog360(tid, p);
        },
    });
    return jobId;
}

/* ═══════════════════════════════════════════════════════════
   TENANT CONFIG MANAGEMENT
   ═══════════════════════════════════════════════════════════ */

/**
 * Save (or update) the decrypted API key for a tenant.
 * Call this after decrypting from DB.
 */
function setTenantConfig(tenantId, { apiKey, whatsappNumber, webhookSecret }) {
    TenantConfigStore.set(tenantId, { apiKey, whatsappNumber, webhookSecret });
    logger.info({ tenantId }, 'WhatsApp config loaded');
}

function getTenantConfig(tenantId) {
    return TenantConfigStore.get(tenantId) || null;
}

function removeTenantConfig(tenantId) {
    TenantConfigStore.delete(tenantId);
}

/* ═══════════════════════════════════════════════════════════
   WEBHOOK REGISTRATION
   ═══════════════════════════════════════════════════════════ */

/**
 * Register the KenganAuto webhook URL with 360dialog.
 * Must be called once per tenant after their API key is set.
 *
 * @param {number} tenantId
 * @param {string} webhookUrl - public HTTPS URL e.g. https://api.kenganauto.co.za/api/webhooks/whatsapp/1
 */
async function registerWebhook(tenantId, webhookUrl) {
    const config = TenantConfigStore.get(tenantId);
    if (!config?.apiKey) throw new Error('No API key configured for this tenant');

    const result = await httpRequest({
        method: 'POST',
        url: `${DIALOG360_BASE}/v1/configs/webhook`,
        headers: { 'D360-API-KEY': config.apiKey },
        body: { url: webhookUrl },
    });

    logger.info({ tenantId, webhookUrl, result }, 'Webhook registered with 360dialog');
    return result;
}

/**
 * Test the connection — fetches the API account info from 360dialog.
 * Returns { ok: true, number: '+27...' } on success.
 */
async function testConnection(apiKey) {
    try {
        const result = await httpRequest({
            method: 'GET',
            url: `${DIALOG360_BASE}/v1/configs/webhook`,
            headers: { 'D360-API-KEY': apiKey },
            body: null,
        });
        return { ok: true, config: result };
    } catch (err) {
        logger.warn({ status: err.status }, 'Connection test failed');
        return { ok: false, error: err.message, status: err.status };
    }
}

/* ═══════════════════════════════════════════════════════════
   BUILT-IN TEMPLATE HELPERS
   (These assume pre-approved templates on the Meta Business Manager)
   ═══════════════════════════════════════════════════════════ */

/** Service booking reminder (48h or 2h) */
const TEMPLATES = {
    serviceReminder: (customerName, date, time, dealershipName) => ({
        name: 'service_reminder',
        language: 'en_US',
        components: [{
            type: 'body',
            parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: date },
                { type: 'text', text: time },
                { type: 'text', text: dealershipName },
            ],
        }],
    }),

    testDriveConfirmation: (customerName, vehicle, date, time) => ({
        name: 'test_drive_confirmation',
        language: 'en_US',
        components: [{
            type: 'body',
            parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: vehicle },
                { type: 'text', text: date },
                { type: 'text', text: time },
            ],
        }],
    }),

    financeUpdate: (customerName, status) => ({
        name: 'finance_application_update',
        language: 'en_US',
        components: [{
            type: 'body',
            parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: status },
            ],
        }],
    }),
};

module.exports = {
    sendText,
    sendImage,
    sendDocument,
    sendTemplate,
    sendInteractiveButtons,
    sendInteractiveList,
    markAsRead,
    setTenantConfig,
    getTenantConfig,
    removeTenantConfig,
    registerWebhook,
    testConnection,
    TEMPLATES,
    TenantConfigStore,
};
