/**
 * KenganAuto AI Engine
 * ─────────────────────────────────────────────────
 * Core service that:
 *   1. Builds a dynamic, per-tenant system prompt
 *   2. Detects the customer's intent (9 types)
 *   3. Detects message sentiment (-1 → 1)
 *   4. Sends messages to Claude claude-sonnet-4-5 and returns text
 *
 * The API key is read from ANTHROPIC_API_KEY env var.
 * A settings panel can update it at runtime via process.env.
 */

const Anthropic = require('@anthropic-ai/sdk');

/* ── Intent labels ── */
const INTENTS = {
    VEHICLE_ENQUIRY: 'VEHICLE_ENQUIRY',
    TEST_DRIVE: 'TEST_DRIVE',
    FINANCE: 'FINANCE',
    TRADE_IN: 'TRADE_IN',
    SERVICE_BOOKING: 'SERVICE_BOOKING',
    PARTS: 'PARTS',
    GENERAL_SUPPORT: 'GENERAL_SUPPORT',
    LEAD_CAPTURE: 'LEAD_CAPTURE',
    HUMAN_HANDOFF: 'HUMAN_HANDOFF',
};

/* ── Keyword intent classifier (fast pre-filter before Claude) ── */
const INTENT_KEYWORDS = {
    [INTENTS.HUMAN_HANDOFF]: /\b(speak to|talk to|human|agent|person|manager|frustrated|angry|useless|not helping|call me)\b/i,
    [INTENTS.TEST_DRIVE]: /\b(test drive|test-drive|drive the car|try the car|book a drive|arrange a drive)\b/i,
    [INTENTS.SERVICE_BOOKING]: /\b(service|service booking|workshop|oil change|tyres|brakes|100k service|minor service|major service|book a service)\b/i,
    [INTENTS.FINANCE]: /\b(finance|monthly payment|installment|repayment|deposit|interest rate|loan|afford|bond|bank|wesbank|absa|fnb|nedbank|mfc)\b/i,
    [INTENTS.TRADE_IN]: /\b(trade.?in|swap|trade my car|sell my car|exchange|part exchange|what is my car worth|value my car)\b/i,
    [INTENTS.PARTS]: /\b(part|parts|spare|spanner|filter|battery|tyre|wiper|brake pad|shock absorber|bumper|headlight|tail light)\b/i,
    [INTENTS.VEHICLE_ENQUIRY]: /\b(looking for|interested in|stock|available|price|buy a car|new car|used car|second.?hand|pre.?owned|what cars|which cars|show me)\b/i,
    [INTENTS.GENERAL_SUPPORT]: /\b(manual|how to|how do i|warning light|dashboard|noise|problem with my car|my car is|won't start|overheating)\b/i,
};

/* ── South African provinces / cities for context awareness ── */
const SA_CONTEXT = `
You operate in South Africa. Prices are always in ZAR (South African Rand, R).
Key automotive context:
- South Africans drive on the LEFT side of the road
- Petrol price is government-regulated, with weekly updates
- Popular banks for vehicle finance: ABSA, Nedbank, FNB, Standard Bank, WesBank, MFC
- Service intervals are in kilometres (e.g. 15 000 km / 12 months)
- Number plates are issued by province (e.g. GP for Gauteng, WP for Western Cape)
- Address customers informally as "you" - South Africans prefer friendly warmth over stiffness
- Use "R" prefix for prices, never "$"
`;

class AIEngine {
    constructor() {
        // Lazily initialise the client so the API key can be set via settings panel later
        this._client = null;
        this.MODEL = 'claude-sonnet-4-5';
    }

    get client() {
        if (!this._client || this._lastKey !== process.env.ANTHROPIC_API_KEY) {
            this._lastKey = process.env.ANTHROPIC_API_KEY;
            this._client = new Anthropic({ apiKey: this._lastKey || 'placeholder' });
        }
        return this._client;
    }

    /* ────────────────────────────────────────────────
       Build the per-tenant system prompt
       ──────────────────────────────────────────────── */
    buildSystemPrompt(tenant, stockSummary = '', context = {}) {
        const hours = tenant.opening_hours || 'Monday–Friday: 08:00–17:30 | Saturday: 08:00–13:00 | Sunday: Closed';
        const location = [tenant.address, tenant.city, tenant.province].filter(Boolean).join(', ');

        return `
You are the AI sales and service assistant for ${tenant.name}, a South African motor dealership.
Your name is Kengan (keep this name unless the user prefers something else).
You MUST NEVER reveal you are an AI unless the customer explicitly asks "Are you a bot/AI/robot?".
If asked, respond: "I'm Kengan, ${tenant.name}'s virtual assistant — but I'm backed by a real team if you ever need us!"

${SA_CONTEXT}

DEALERSHIP DETAILS:
- Name: ${tenant.name}
- Location: ${location || 'South Africa'}
- Opening Hours: ${hours}
- WhatsApp: ${tenant.whatsapp_number || 'Available in chat'}
- Plan: ${tenant.plan || 'Professional'}

PERSONALITY:
- Warm, professional, helpful South African English
- Use customer's first name after they introduce themselves
- Never hard-sell — guide, inform, and assist
- Keep responses concise (2–4 short paragraphs max)
- Use bullet points for lists of vehicles, options, or steps
- End every response with a clear next-step question or prompt

CURRENT STOCK SUMMARY (use this to answer vehicle enquiries):
${stockSummary || 'Please ask about specific vehicles and I will check our live inventory.'}

FINANCE REFERENCE:
- Prime rate: 11.75% (check with finance manager for current rate)
- Typical term: 72 months
- Balloon payments: up to 30% available
- Calculator formula: monthly = P × r / (1 - (1+r)^(-n)) where P = principal, r = monthly rate, n = term

IMPORTANT RULES:
1. Always collect: name, phone number, email for any serious enquiry
2. For TEST DRIVE: confirm vehicle, collect preferred date + time
3. For SERVICE: confirm registration plate, service type, preferred date
4. For TRADE-IN: collect year, make, model, mileage, condition, colour
5. For HUMAN HANDOFF: always say "I'm connecting you with one of our team members right now"
6. For FINANCE: always add "subject to bank approval and credit assessment"
7. Log every major customer detail in your response as JSON in this format at the END of your message (hidden from display):
   <!-- EXTRACTED: {"intent":"INTENT_HERE","name":"","phone":"","email":"","vehicle_interest":"","notes":""} -->
`.trim();
    }

    /* ────────────────────────────────────────────────
       Fast keyword-based intent pre-classifier
       Falls back to Claude if ambiguous
       ──────────────────────────────────────────────── */
    detectIntentKeyword(message) {
        for (const [intent, regex] of Object.entries(INTENT_KEYWORDS)) {
            if (regex.test(message)) return intent;
        }
        return null;
    }

    /* ────────────────────────────────────────────────
       Claude-based intent + sentiment detection
       Used when keywords are unclear
       ──────────────────────────────────────────────── */
    async detectIntentAndSentiment(message, history = []) {
        // Fast path — keyword detection
        const keywordIntent = this.detectIntentKeyword(message);

        const classifyPrompt = `
Analyse this customer message for a South African car dealership chatbot.

Customer message: "${message}"

Respond with ONLY valid JSON (no markdown):
{
  "intent": "one of: VEHICLE_ENQUIRY | TEST_DRIVE | FINANCE | TRADE_IN | SERVICE_BOOKING | PARTS | GENERAL_SUPPORT | LEAD_CAPTURE | HUMAN_HANDOFF",
  "sentiment": <float between -1.0 (very negative) and 1.0 (very positive)>,
  "is_frustrated": <boolean>,
  "extracted": {
    "name": "<first name if mentioned, else null>",
    "phone": "<SA phone number if mentioned, else null>",
    "email": "<email if mentioned, else null>",
    "vehicle_interest": "<vehicle make/model if mentioned, else null>",
    "year": <year as integer if mentioned, else null>,
    "mileage": <mileage as integer if mentioned, else null>
  }
}
`.trim();

        try {
            const response = await this.client.messages.create({
                model: this.MODEL,
                max_tokens: 300,
                messages: [{ role: 'user', content: classifyPrompt }],
            });

            const raw = response.content[0].text.trim();
            const json = JSON.parse(raw);
            return {
                intent: keywordIntent || json.intent || INTENTS.LEAD_CAPTURE,
                sentiment: json.sentiment ?? 0,
                is_frustrated: json.is_frustrated ?? false,
                extracted: json.extracted || {},
            };
        } catch {
            // Fallback if Claude unavailable or parse error
            return {
                intent: keywordIntent || INTENTS.LEAD_CAPTURE,
                sentiment: 0,
                is_frustrated: false,
                extracted: {},
            };
        }
    }

    /* ────────────────────────────────────────────────
       Main chat method — send messages to Claude and return response
       ──────────────────────────────────────────────── */
    async chat({ tenant, messages, systemPrompt, intentContext = '' }) {
        const SYSTEM = systemPrompt + (intentContext ? `\n\nCURRENT CONVERSATION STAGE:\n${intentContext}` : '');

        // Convert stored messages to Anthropic format
        const anthropicMessages = messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
        }));

        try {
            const response = await this.client.messages.create({
                model: this.MODEL,
                max_tokens: 1024,
                system: SYSTEM,
                messages: anthropicMessages,
            });

            return { text: response.content[0].text, usage: response.usage };
        } catch (err) {
            // Graceful degradation — if API key not yet set, return a holding message
            if (err.status === 401 || (err.message && err.message.includes('API key'))) {
                return {
                    text: `Hi there! Welcome to ${tenant?.name || 'our dealership'}. I'm Kengan, your virtual assistant. Our AI is being configured — in the meantime, please leave your name and number and one of our team will call you back shortly! 😊`,
                    usage: null,
                    degraded: true,
                };
            }
            throw err;
        }
    }

    /* ────────────────────────────────────────────────
       Parse EXTRACTED data embedded in Claude's response
       ──────────────────────────────────────────────── */
    parseExtracted(responseText) {
        const match = responseText.match(/<!-- EXTRACTED: ({.*?}) -->/s);
        if (!match) return null;
        try { return JSON.parse(match[1]); } catch { return null; }
    }

    /* Strip the hidden extracted comment before sending to customer */
    stripExtracted(responseText) {
        return responseText.replace(/<!-- EXTRACTED: {.*?} -->/s, '').trim();
    }
}

module.exports = { AIEngine: new AIEngine(), INTENTS };
