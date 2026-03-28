/**
 * Lead Scorer — KenganAuto AI Engine
 * ══════════════════════════════════════════════════════════════
 *
 * Computes a 0–100 score for every lead based on:
 *   1. Behavioural signals  (positive)
 *   2. Negative signals     (subtract)
 *   3. Source base bonus
 *
 * Also runs a deep Claude analysis after each conversation:
 *   - Buyer seriousness (1–10)
 *   - Purchase timeline
 *   - Best-match vehicle recommendation
 *   - Recommended next action for the salesperson
 *
 * Auto-assignment: hot/burning leads (70+) are assigned to the
 * most available salesperson and a WhatsApp alert is fired.
 *
 * Public API:
 *   scorer.computeScore(lead, signals?)  → { score, breakdown, tier }
 *   scorer.analyseConversation(lead, messages, tenant) → AI insights object
 *   scorer.rescoreLead(leadId, tenantId) → { score, insights, assigned_to }
 *   scorer.TIERS                         → tier definitions
 */

'use strict';

const pino = require('pino');
const logger = pino({ name: 'lead-scorer' });

/* ── Lazy-loaded deps (allow scorer to load even before DB) ── */
let AIEngine, whatsappSvc, Lead, User;
try { ({ AIEngine } = require('./ai_engine')); } catch { AIEngine = null; }
try { whatsappSvc = require('./whatsapp_service'); } catch { whatsappSvc = null; }
try { Lead = require('../models/Lead'); } catch { Lead = null; }
try { User = require('../models/User'); } catch { User = null; }

/* ══════════════════════════════════════════════════════════════
   TIER DEFINITIONS
   ══════════════════════════════════════════════════════════════ */
const TIERS = {
    BURNING: { min: 90, max: 100, label: 'Burning 🔥', color: '#DC2626', bg: 'rgba(220,38,38,0.15)', glow: 'rgba(220,38,38,0.4)', emoji: '🔥', action: 'Drop everything and call NOW' },
    HOT: { min: 71, max: 89, label: 'Hot', color: '#EA580C', bg: 'rgba(234,88,12,0.15)', glow: 'rgba(234,88,12,0.35)', emoji: '🌶️', action: 'Contact immediately' },
    WARM: { min: 41, max: 70, label: 'Warm', color: '#D97706', bg: 'rgba(217,119,6,0.15)', glow: 'rgba(217,119,6,0.25)', emoji: '☀️', action: 'Follow up within 24 hours' },
    COLD: { min: 0, max: 40, label: 'Cold', color: '#3B7FF5', bg: 'rgba(59,127,245,0.12)', glow: 'rgba(59,127,245,0.2)', emoji: '❄️', action: 'Add to nurture sequence' },
};

function getTier(score) {
    if (score >= 90) return TIERS.BURNING;
    if (score >= 71) return TIERS.HOT;
    if (score >= 41) return TIERS.WARM;
    return TIERS.COLD;
}

/* ══════════════════════════════════════════════════════════════
   SCORING RULES REGISTRY
   ══════════════════════════════════════════════════════════════ */
const SCORING_RULES = {

    /* ── Source base bonuses ── */
    source: {
        trade_in_enquiry: { points: 15, label: 'Trade-in enquiry lead' },
        finance_enquiry: { points: 12, label: 'Finance enquiry lead' },
        test_drive_request: { points: 20, label: 'Test drive request lead' },
        website: { points: 5, label: 'Generic web form' },
        autotrader: { points: 8, label: 'Autotrader listing' },
        cars_coza: { points: 8, label: 'Cars.co.za listing' },
        facebook: { points: 4, label: 'Facebook lead' },
        whatsapp: { points: 6, label: 'WhatsApp inbound' },
        walk_in: { points: 10, label: 'Walk-in' },
        phone: { points: 8, label: 'Phone call' },
    },

    /* ── Positive behavioural signals ── */
    positive: {
        responded_to_chatbot: { points: 5, label: 'Engaged with chatbot' },
        provided_phone: { points: 8, label: 'Provided phone number' },
        provided_email: { points: 5, label: 'Provided email address' },
        mentioned_specific_vehicle: { points: 10, label: 'Mentioned specific vehicle' },
        mentioned_budget: { points: 8, label: 'Mentioned budget' },
        mentioned_trade_in: { points: 10, label: 'Mentioned trade-in (serious intent)' },
        booked_test_drive: { points: 20, label: 'Booked a test drive' },
        completed_finance_prequal: { points: 25, label: 'Completed finance pre-qualification' },
        asked_about_finance: { points: 15, label: 'Asked about finance options' },
        repeat_website_visits: { points: 8, label: 'Visited website 3+ times' },
        fast_response: { points: 10, label: 'Responded within 5 min to salesperson' },
        asked_specific_stock: { points: 12, label: 'Asked about specific stock availability' },
    },

    /* ── Negative signals ── */
    negative: {
        no_response_24h: { points: -5, label: 'No response in 24 hours' },
        price_only: { points: -5, label: 'Only asked for price (no other engagement)' },
        just_browsing: { points: -10, label: 'Mentioned "just browsing"' },
        declined_phone: { points: -8, label: 'Declined to provide phone number' },
        very_negative_sentiment: { points: -10, label: 'Very negative conversation sentiment' },
    },
};

/* ══════════════════════════════════════════════════════════════
   AUTO-DETECT SIGNALS FROM LEAD DATA + MESSAGES
   ══════════════════════════════════════════════════════════════ */

/**
 * Derive scoring signals automatically from a lead record
 * and its conversation message array.
 *
 * @param {Object} lead         - Lead DB record
 * @param {Array}  messages     - [{role,content}] conversation messages
 * @returns {Object}            - Signal flags { positive: Set, negative: Set }
 */
function detectSignals(lead, messages = []) {
    const positive = new Set();
    const negative = new Set();

    const fullText = messages.map(m => m.content || '').join(' ').toLowerCase();

    /* ── Provided contact info ── */
    if (lead.customer_phone) positive.add('provided_phone');
    if (lead.customer_email) positive.add('provided_email');

    /* ── Has engaged with chatbot ── */
    if (messages.some(m => m.role === 'user')) positive.add('responded_to_chatbot');

    /* ── Vehicle specificity ── */
    if (lead.vehicle_interest && lead.vehicle_interest.trim().length > 3) {
        positive.add('mentioned_specific_vehicle');
    }

    /* ── Budget mention ── */
    if (lead.budget_min || lead.budget_max) positive.add('mentioned_budget');
    if (/\b(budget|afford|monthly|deposit|down payment|installment|repayment|r\s?\d+|rands?\s?\d+|\d+\s?k)\b/i.test(fullText)) {
        positive.add('mentioned_budget');
    }

    /* ── Trade-in ── */
    if (/\b(trade.?in|swap|sell my car|part exchange|value my|current car|my vehicle)\b/i.test(fullText)) {
        positive.add('mentioned_trade_in');
    }

    /* ── Finance ── */
    if (/\b(finance|financed|monthly payment|installment|repayment|bond|absa|wesbank|fnb|nedbank|mfc|interest rate|loan|pre.?qual)\b/i.test(fullText)) {
        positive.add('asked_about_finance');
    }

    /* ── Test drive ── */
    if (lead.status === 'test_drive_booked' || /\b(test drive|test-drive|book a drive|arrange a drive|try the car)\b/i.test(fullText)) {
        positive.add('booked_test_drive');
    }

    /* ── Specific stock ── */
    if (/\b(in stock|available|do you have|any .+ available|show me your|list of)\b/i.test(fullText)) {
        positive.add('asked_specific_stock');
    }

    /* ── Negative: just browsing ── */
    if (/\b(just browsing|just looking|not ready|maybe later|not sure yet|no rush)\b/i.test(fullText)) {
        negative.add('just_browsing');
    }

    /* ── Negative: price only ── */
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length <= 2 && /\bprice\b/i.test(fullText) && !positive.has('mentioned_budget')) {
        negative.add('price_only');
    }

    /* ── Negative: very negative sentiment (crude keyword test; Claude overrides) ── */
    if (/\b(terrible|useless|waste of time|not interested|scam|rip.?off|angry|disgusted|disappointed|never again)\b/i.test(fullText)) {
        negative.add('very_negative_sentiment');
    }

    /* ── Negative: no response 24h ── */
    const lastContact = lead.last_contact_at || lead.created_at;
    if (lastContact) {
        const hoursAgo = (Date.now() - new Date(lastContact).getTime()) / 3_600_000;
        if (hoursAgo > 24 && ['new', 'contacted'].includes(lead.status)) {
            negative.add('no_response_24h');
        }
    }

    /* ── Stage bonuses handled separately in computeScore ── */
    return { positive, negative };
}

/* ══════════════════════════════════════════════════════════════
   COMPUTE SCORE
   ══════════════════════════════════════════════════════════════ */

/**
 * Compute a new AI score from 0–100.
 *
 * @param {Object}  lead          - Lead record
 * @param {Array}   messages      - Conversation messages
 * @param {Object}  overrideFlags - Optional { positive: Set, negative: Set } to merge in
 * @returns {{ score, breakdown, tier, signals }}
 */
function computeScore(lead, messages = [], overrideFlags = {}) {
    let score = 0;
    const breakdown = [];

    /* 1. Source base bonus */
    const sourceKey = lead.source?.toLowerCase().replace(/-/g, '_');
    const srcBonus = SCORING_RULES.source[sourceKey] || SCORING_RULES.source.website;
    score += srcBonus.points;
    breakdown.push({ category: 'source', key: sourceKey, points: srcBonus.points, label: srcBonus.label });

    /* 2. Auto-detect signals */
    const detected = detectSignals(lead, messages);
    const positiveSignals = new Set([...detected.positive, ...(overrideFlags.positive || [])]);
    const negativeSignals = new Set([...detected.negative, ...(overrideFlags.negative || [])]);

    /* 3. Apply positive signals */
    for (const key of positiveSignals) {
        const rule = SCORING_RULES.positive[key];
        if (rule) {
            score += rule.points;
            breakdown.push({ category: 'positive', key, points: rule.points, label: rule.label });
        }
    }

    /* 4. Apply negative signals */
    for (const key of negativeSignals) {
        const rule = SCORING_RULES.negative[key];
        if (rule) {
            score += rule.points; // already negative
            breakdown.push({ category: 'negative', key, points: rule.points, label: rule.label });
        }
    }

    /* 5. Clamp to 0–100 */
    score = Math.min(100, Math.max(0, Math.round(score)));
    const tier = getTier(score);

    return { score, breakdown, tier, signals: { positive: [...positiveSignals], negative: [...negativeSignals] } };
}

/* ══════════════════════════════════════════════════════════════
   CLAUDE DEEP ANALYSIS
   ══════════════════════════════════════════════════════════════ */

/**
 * Ask Claude to produce structured AI insights about this lead.
 *
 * @param {Object} lead       - Lead record
 * @param {Array}  messages   - [{role,content}] conversation
 * @param {Object} tenant     - Tenant record (for context)
 * @param {number} rawScore   - The numerically computed score
 * @returns {Object} insights - { seriousness, timeline, recommended_vehicle, next_action, summary, score_adjustment }
 */
async function analyseConversation(lead, messages = [], tenant = {}, rawScore = 50) {
    const FALLBACK = {
        seriousness: Math.round(rawScore / 10),
        timeline: 'Unknown',
        recommended_vehicle: lead.vehicle_interest || 'Unknown',
        next_action: `Call ${lead.customer_name} and ask about their timeline and financing needs.`,
        summary: `${lead.customer_name} came in via ${lead.source} looking at a ${lead.vehicle_interest || 'vehicle'}. Follow up immediately.`,
        score_adjustment: 0,
        ai_powered: false,
    };

    if (!AIEngine || !messages.length) return FALLBACK;

    const transcript = messages
        .map(m => `${m.role === 'user' ? 'Customer' : 'Kengan AI'}: ${(m.content || '').slice(0, 300)}`)
        .join('\n');

    const prompt = `You are a senior automotive sales manager reviewing a lead's chatbot conversation.

LEAD CONTEXT:
- Name: ${lead.customer_name}
- Source: ${lead.source}
- Vehicle interest: ${lead.vehicle_interest || 'Unknown'}
- Budget: ${lead.budget_min ? `R${(lead.budget_min / 1000).toFixed(0)}k–R${(lead.budget_max / 1000).toFixed(0)}k` : 'Unknown'}
- Current AI score (rule-based): ${rawScore}/100
- Stage: ${lead.status}
- Dealership: ${tenant.name || 'KenganAuto'}

CONVERSATION TRANSCRIPT:
${transcript}

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "seriousness": <integer 1-10, how serious is this buyer>,
  "timeline": "<one of: Immediate (this week) | Short-term (1 month) | Medium-term (1-3 months) | Long-term (3+ months) | Unknown>",
  "recommended_vehicle": "<specific vehicle recommendation based on what they said>",
  "next_action": "<specific, actionable next step for the salesperson — max 2 sentences>",
  "summary": "<3-5 sentence summary for the salesperson covering what customer wants, urgency, budget, concerns>",
  "score_adjustment": <integer -15 to +15, Claude's suggested adjustment to the rule-based score based on conversation quality/tone/seriousness>
}`;

    try {
        const result = await AIEngine.chat({
            tenant: tenant || { id: 0, name: 'KenganAuto' },
            messages: [{ role: 'user', content: prompt }],
            systemPrompt: 'You are a senior automotive CRM analyst. Respond only with valid JSON. No markdown.',
            intentContext: '',
        });

        const raw = result.text.replace(/```json?/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(raw);
        return {
            seriousness: Math.min(10, Math.max(1, Number(parsed.seriousness) || 5)),
            timeline: parsed.timeline || 'Unknown',
            recommended_vehicle: parsed.recommended_vehicle || lead.vehicle_interest || 'Unknown',
            next_action: parsed.next_action || FALLBACK.next_action,
            summary: parsed.summary || FALLBACK.summary,
            score_adjustment: Math.min(15, Math.max(-15, Number(parsed.score_adjustment) || 0)),
            ai_powered: true,
        };
    } catch (err) {
        logger.warn({ leadId: lead.id, err: err.message }, 'Claude analysis failed — using fallback');
        return FALLBACK;
    }
}

/* ══════════════════════════════════════════════════════════════
   AUTO-ASSIGN LOGIC
   ══════════════════════════════════════════════════════════════ */

/**
 * Find the most available salesperson for a tenant.
 * "Most available" = active salesperson with fewest leads in [new, contacted, qualified].
 *
 * @param {number} tenantId
 * @returns {Object|null} User record or null
 */
async function findMostAvailableSalesperson(tenantId) {
    if (!User || !Lead) return null;
    try {
        const salespeople = await User.query()
            .where({ tenant_id: tenantId, role: 'salesperson', active: true })
            .select('id', 'first_name', 'last_name', 'phone');

        if (!salespeople.length) return null;

        // Count active leads per salesperson
        const counts = await Promise.all(salespeople.map(async (sp) => {
            const count = await Lead.query()
                .where({ tenant_id: tenantId, assigned_to: sp.id })
                .whereIn('status', ['new', 'contacted', 'qualified', 'test_drive_booked', 'negotiation'])
                .count('id as count')
                .first();
            return { ...sp, activeLeads: Number(count?.count || 0) };
        }));

        // Sort by fewest active leads
        counts.sort((a, b) => a.activeLeads - b.activeLeads);
        return counts[0];
    } catch (err) {
        logger.warn({ err: err.message }, 'Could not determine most available salesperson');
        return null;
    }
}

/* ══════════════════════════════════════════════════════════════
   WHATSAPP SALESPERSON ALERT
   ══════════════════════════════════════════════════════════════ */

/**
 * Send a WhatsApp alert to the assigned salesperson when a lead
 * crosses the 70-point threshold for the first time.
 *
 * @param {Object} lead    - Lead record (with assigned salesperson info)
 * @param {Object} tier    - TIERS object for this score
 * @param {Object} insights- Claude AI insights
 * @param {number} tenantId
 */
async function sendSalespersonAlert(lead, tier, insights, tenantId) {
    if (!whatsappSvc) return;

    // We need the salesperson's phone number
    let salespersonPhone = null;
    try {
        if (User && lead.assigned_to) {
            const sp = await User.query().findById(lead.assigned_to).select('phone', 'first_name');
            salespersonPhone = sp?.phone;
        }
    } catch { /* non-fatal */ }

    if (!salespersonPhone) {
        // Log so the team know
        logger.info({ leadId: lead.id, tier: tier.label }, 'Hot lead alert — no salesperson phone on file, logging only');
        return;
    }

    const msg = [
        `${tier.emoji} *${tier.label.toUpperCase()} LEAD ALERT — KenganAuto CRM*`,
        ``,
        `*Customer:* ${lead.customer_name}`,
        `*Phone:* ${lead.customer_phone || '—'}`,
        `*Vehicle:* ${lead.vehicle_interest || 'TBC'}`,
        `*Score:* ${lead.ai_score}/100`,
        ``,
        `*AI Recommendation:*`,
        insights?.next_action || tier.action,
        ``,
        `*Timeline:* ${insights?.timeline || 'Unknown'}`,
        `*Seriousness:* ${insights?.seriousness || '?'}/10`,
        ``,
        `Open CRM: ${process.env.CRM_URL || 'https://crm.kenganauto.co.za'}/leads`,
    ].join('\n');

    try {
        whatsappSvc.sendText(tenantId, salespersonPhone, msg, { priority: true });
        logger.info({ leadId: lead.id, salespersonPhone, tier: tier.label }, 'WhatsApp hot-lead alert sent');
    } catch (err) {
        logger.warn({ err: err.message }, 'WhatsApp alert failed — non-fatal');
    }
}

/* ══════════════════════════════════════════════════════════════
   MAIN ENTRY POINT: rescoreLead
   ══════════════════════════════════════════════════════════════ */

/**
 * Full re-score pipeline for a single lead:
 *   1. Load lead + latest conversation from DB (or use passed data)
 *   2. computeScore() — rule-based
 *   3. analyseConversation() — Claude deep analysis
 *   4. Apply Claude's score_adjustment
 *   5. Persist new score + insights to DB
 *   6. Auto-assign if hot/burning and unassigned
 *   7. Send WhatsApp alert if newly crossed 70 threshold
 *
 * @param {Object|number} leadOrId   - Lead object or lead ID
 * @param {number}        tenantId
 * @param {Object}        tenant     - Tenant record (for Claude prompt)
 * @param {Array}         messages   - Optional: pass messages directly (avoids DB hit)
 * @returns {{ score, breakdown, tier, insights, assigned_to }}
 */
async function rescoreLead(leadOrId, tenantId, tenant = {}, messages = null) {
    let lead = typeof leadOrId === 'object' ? leadOrId : null;
    let Conversation;
    try { Conversation = require('../models/Conversation'); } catch { Conversation = null; }

    /* ── Load lead if we only have an ID ── */
    if (!lead && Lead) {
        try {
            lead = await Lead.query().findById(Number(leadOrId)).where({ tenant_id: tenantId });
        } catch { lead = null; }
    }
    if (!lead) {
        logger.warn({ leadOrId, tenantId }, 'rescoreLead: lead not found');
        return null;
    }

    /* ── Load messages if not provided ── */
    if (!messages && Conversation) {
        try {
            const conv = await Conversation.query()
                .where({ lead_id: lead.id, tenant_id: tenantId })
                .orderBy('updated_at', 'desc')
                .limit(1)
                .first();
            messages = conv?.messages || [];
        } catch { messages = []; }
    }
    messages = messages || [];

    const previousScore = lead.ai_score || 0;

    /* ── Step 1: Rule-based score ── */
    const { score: ruleScore, breakdown, tier: ruleTier, signals } = computeScore(lead, messages);

    /* ── Step 2: Claude deep analysis ── */
    const insights = await analyseConversation(lead, messages, tenant, ruleScore);

    /* ── Step 3: Apply Claude's score adjustment ── */
    const finalScore = Math.min(100, Math.max(0, ruleScore + (insights.score_adjustment || 0)));
    const finalTier = getTier(finalScore);

    /* ── Step 4: Persist to DB ── */
    if (Lead) {
        try {
            await Lead.query().patchById(lead.id, {
                ai_score: finalScore,
                ai_insights: JSON.stringify({
                    ...insights,
                    breakdown,
                    signals,
                    scored_at: new Date().toISOString(),
                    rule_score: ruleScore,
                    final_score: finalScore,
                }),
                updated_at: new Date().toISOString(),
            }).where({ tenant_id: tenantId });
        } catch (err) {
            logger.warn({ err: err.message }, 'Failed to persist score to DB — non-fatal');
        }
    }

    /* ── Step 5: Auto-assign if hot/burning and unassigned ── */
    let assigned_to = lead.assigned_to;
    if (finalScore >= 71 && !lead.assigned_to) {
        const bestSP = await findMostAvailableSalesperson(tenantId);
        if (bestSP) {
            assigned_to = bestSP.id;
            if (Lead) {
                try {
                    await Lead.query().patchById(lead.id, { assigned_to: bestSP.id }).where({ tenant_id: tenantId });
                    logger.info({ leadId: lead.id, assignedTo: bestSP.id, score: finalScore }, 'Hot lead auto-assigned');
                } catch { /* non-fatal */ }
            }
        }
    }

    /* ── Step 6: WhatsApp alert on first crossing of 70 ── */
    const crossedThreshold = previousScore < 70 && finalScore >= 70;
    if (crossedThreshold) {
        await sendSalespersonAlert(
            { ...lead, ai_score: finalScore, assigned_to },
            finalTier,
            insights,
            tenantId
        );
    }

    logger.info({
        leadId: lead.id,
        previousScore,
        ruleScore,
        adjustment: insights.score_adjustment,
        finalScore,
        tier: finalTier.label,
        crossedThreshold,
    }, 'Lead rescored');

    return {
        score: finalScore,
        rule_score: ruleScore,
        breakdown,
        tier: finalTier,
        signals,
        insights,
        assigned_to,
    };
}

/* ══════════════════════════════════════════════════════════════
   BATCH RESCORE (for background jobs / overdue check)
   ══════════════════════════════════════════════════════════════ */

/**
 * Rescore all leads for a tenant that haven't been scored in >1h.
 * Designed to be called from a cron/setInterval job.
 */
async function batchRescore(tenantId, tenant = {}) {
    if (!Lead) return { rescored: 0 };
    try {
        const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
        const staleLeads = await Lead.query()
            .where({ tenant_id: tenantId })
            .where('updated_at', '<', oneHourAgo)
            .whereNotIn('status', ['won', 'lost'])
            .limit(20); // batch size

        let rescored = 0;
        for (const lead of staleLeads) {
            try {
                await rescoreLead(lead, tenantId, tenant);
                rescored++;
                // Throttle: wait 200ms between Claude calls to avoid rate limits
                await new Promise(r => setTimeout(r, 200));
            } catch { /* skip this lead */ }
        }
        logger.info({ tenantId, rescored }, 'Batch rescore complete');
        return { rescored };
    } catch (err) {
        logger.warn({ err: err.message }, 'batchRescore failed');
        return { rescored: 0 };
    }
}

/* ══════════════════════════════════════════════════════════════
   EXPORTS
   ══════════════════════════════════════════════════════════════ */
module.exports = {
    TIERS,
    SCORING_RULES,
    getTier,
    computeScore,
    detectSignals,
    analyseConversation,
    rescoreLead,
    batchRescore,
    findMostAvailableSalesperson,
};
