/**
 * Follow-ups / Action Queue — KenganAuto CRM
 * ─────────────────────────────────────────────────────────────
 * Turns the "speed-to-lead" and "structured nurture cadence" research
 * into a daily action list for reps.
 *
 * GET  /api/followups/queue        → SLA breaches, due-today cadence, dormant
 * POST /api/followups/:id/draft    → AI-drafted next follow-up message
 * POST /api/followups/:id/complete → log a touch (updates last_contact_at)
 *
 * Cadence: day 0 (first response), 2, 5, 10, 30 — the pattern the research
 * converges on. First-response SLA target is 5 minutes.
 */
'use strict';

const express = require('express');
const { recordStaffTouch } = require('../services/lead_touch');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { AIEngine } = require('../services/ai_engine');
const demo = require('./demo_seeder');

let Lead, User, Conversation;
try {
    Lead = require('../models/Lead');
    User = require('../models/User');
    Conversation = require('../models/Conversation');
} catch { /* DB not ready — fallback */ }

const CADENCE_DAYS = [0, 2, 5, 10, 30];
const SLA_MINUTES = 5;
const DORMANT_DAYS = 21;
const ACTIVE = ['new', 'contacted', 'qualified', 'test_drive_booked', 'negotiation'];
const HOUR = 3_600_000;
const DAY = 86_400_000;

async function tryDB(fn, fallback) {
    if (!Lead) return fallback();
    try { return await fn(); } catch { return fallback(); }
}

function minsSince(iso) { return iso ? (Date.now() - new Date(iso).getTime()) / 60000 : Infinity; }
function hoursSince(iso) { return iso ? (Date.now() - new Date(iso).getTime()) / HOUR : Infinity; }
function daysSince(iso) { return iso ? (Date.now() - new Date(iso).getTime()) / DAY : Infinity; }

function suggestChannel(lead) {
    if (lead.source === 'whatsapp') return 'WhatsApp';
    if (lead.source === 'phone' || (lead.ai_score || 0) >= 85) return 'Call';
    return 'WhatsApp';
}

function classify(lead) {
    const anchor = lead.last_contact_at || lead.created_at;
    const hSince = hoursSince(anchor);
    const dCreated = daysSince(lead.created_at);
    const touchesDue = CADENCE_DAYS.filter(d => dCreated >= d).length;
    const nextTouch = CADENCE_DAYS.find(d => d > dCreated);
    const base = {
        id: lead.id,
        name: lead.customer_name,
        vehicle: lead.vehicle_interest || 'No vehicle specified',
        source: lead.source,
        status: lead.status,
        ai_score: lead.ai_score ?? 0,
        assigned_to: lead.assigned_to || null,
        last_contact_at: lead.last_contact_at || null,
        created_at: lead.created_at,
        hours_since: Math.round(hSince),
        channel: suggestChannel(lead),
    };

    // 1. SLA breach — a brand-new lead that has never been answered
    if (lead.status === 'new' && !lead.last_contact_at) {
        const mins = minsSince(lead.created_at);
        if (mins > SLA_MINUTES) {
            return { bucket: 'sla', ...base, minutes_waiting: Math.round(mins),
                severity: mins > 60 ? 'high' : 'medium', step: 'First response' };
        }
    }
    // 2. Dormant — long no-contact, reactivation candidate
    if (daysSince(anchor) >= DORMANT_DAYS) {
        return { bucket: 'dormant', ...base, days_since: Math.round(daysSince(anchor)), step: 'Re-engage' };
    }
    // 3. Due today — overdue for the next cadence touch
    if (hSince >= 24) {
        const stepDay = CADENCE_DAYS[Math.min(touchesDue, CADENCE_DAYS.length - 1)] ?? 2;
        return { bucket: 'due_today', ...base, step: touchesDue <= 1 ? 'Follow-up' : `Day ${stepDay} touch`, next_touch: nextTouch ?? null };
    }
    return { bucket: 'scheduled', ...base, next_touch: nextTouch ?? null };
}

async function loadLeads(tenantId) {
    return tryDB(
        () => Lead.query().where({ tenant_id: tenantId }),
        () => demo.getDemoLeads(tenantId)
    );
}

async function loadTeamMap(tenantId) {
    const team = await tryDB(
        () => User.query().where({ tenant_id: tenantId }).select('id', 'first_name', 'last_name'),
        () => []
    );
    const map = {};
    team.forEach(u => { map[u.id] = `${u.first_name} ${u.last_name}`.trim(); });
    return map;
}

/* ─────────────────────────────────────────────────────────────
   GET /api/followups/queue
   ───────────────────────────────────────────────────────────── */
router.get('/queue', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const [leads, teamMap] = await Promise.all([loadLeads(tenantId), loadTeamMap(tenantId)]);

    const active = leads.filter(l => ACTIVE.includes(l.status));
    const sla = [], due_today = [], dormant = [];
    active.forEach(l => {
        const c = classify(l);
        c.assigned_name = teamMap[c.assigned_to] || 'Unassigned';
        if (c.bucket === 'sla') sla.push(c);
        else if (c.bucket === 'dormant') dormant.push(c);
        else if (c.bucket === 'due_today') due_today.push(c);
    });

    // Sort: most urgent first
    sla.sort((a, b) => b.minutes_waiting - a.minutes_waiting);
    due_today.sort((a, b) => (b.ai_score - a.ai_score) || (b.hours_since - a.hours_since));
    dormant.sort((a, b) => b.ai_score - a.ai_score);

    return res.json({
        generated_at: new Date().toISOString(),
        sla_target_minutes: SLA_MINUTES,
        cadence_days: CADENCE_DAYS,
        counts: { sla: sla.length, due_today: due_today.length, dormant: dormant.length, total: sla.length + due_today.length + dormant.length },
        sla_breaches: sla.slice(0, 50),
        due_today: due_today.slice(0, 50),
        dormant: dormant.slice(0, 50),
    });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/followups/:id/draft  — AI drafts the next message
   ───────────────────────────────────────────────────────────── */
router.post('/:id/draft', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const leadId = Number(req.params.id);
    const { intent } = req.body; // 'follow_up' | 'reactivate' | 'first_response'

    const lead = await tryDB(
        () => Lead.query().findById(leadId).where({ tenant_id: tenantId }),
        () => demo.getDemoLeads(tenantId).find(l => l.id === leadId)
    );
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    let history = [];
    if (Conversation) {
        try {
            const conv = await Conversation.query().where({ lead_id: leadId }).orderBy('updated_at', 'desc').first();
            history = conv?.messages || [];
        } catch { /* none */ }
    }

    const transcript = history.length
        ? history.map(m => `${m.role === 'user' ? 'Customer' : 'Us'}: ${m.content}`).join('\n')
        : '(no prior conversation on record)';

    const purpose = intent === 'reactivate'
        ? 'This lead has gone quiet for weeks. Write a warm re-engagement message that revives interest without being pushy.'
        : intent === 'first_response'
            ? 'This is a brand-new enquiry that needs an immediate first reply. Be fast, warm, and move toward booking a test drive or sharing details.'
            : 'Write the next follow-up message to keep this deal moving toward a test drive or finance step.';

    const systemPrompt = `You are a top-performing South African car dealership salesperson writing a short, friendly WhatsApp follow-up.
Rules: warm and human (not corporate), 2-4 sentences max, use the customer's first name, reference the vehicle, always end with ONE clear next-step question (test drive, finance estimate, or a good time to chat). Prices in Rand (R). Do not invent specific prices or stock you don't know.`;

    const context = `${purpose}

Customer: ${lead.customer_name}
Vehicle of interest: ${lead.vehicle_interest || 'unspecified'}
Lead source: ${lead.source}
Current stage: ${lead.status}
AI interest score: ${lead.ai_score ?? 'n/a'}/100

Recent conversation:
${transcript}

Write only the message text to send — no preamble, no quotes.`;

    // Deterministic, context-aware template — used when no AI key is set.
    const first = (lead.customer_name || 'there').split(' ')[0];
    const veh = lead.vehicle_interest || 'the vehicle';
    const templates = {
        first_response: `Hi ${first}! Thanks for your enquiry on the ${veh} 🚗 It's a great choice and we have options ready. Would you like to book a quick test drive this week, or should I send you a finance estimate first?`,
        reactivate: `Hi ${first}, it's the team at the dealership 👋 We still have the ${veh} you were interested in, and some fresh finance deals have just landed. Would it help if I sent a quick update, or is there a better time to chat?`,
        follow_up: `Hi ${first}! Just following up on the ${veh}. I'd love to get you behind the wheel — are you free for a test drive this week, or would a finance estimate be more useful right now?`,
    };
    const template = templates[intent] || templates.follow_up;

    try {
        const result = await AIEngine.chat({
            tenant: { id: tenantId, name: req.user.tenant_name || 'our dealership' },
            messages: [{ role: 'user', content: context }],
            systemPrompt,
            intentContext: '',
        });
        // If the engine degraded (no/invalid API key), prefer our tailored template.
        const draft = result.degraded ? template : AIEngine.stripExtracted(result.text);
        return res.json({ draft, channel: suggestChannel(lead), degraded: !!result.degraded });
    } catch {
        return res.json({ draft: template, channel: suggestChannel(lead), degraded: true });
    }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/followups/:id/complete  — log a touch
   ───────────────────────────────────────────────────────────── */
router.post('/:id/complete', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const leadId = Number(req.params.id);
    const { note, status } = req.body;
    const now = new Date().toISOString();

    const patch = { last_contact_at: now, updated_at: now };
    if (status && ACTIVE.concat(['won', 'lost']).includes(status)) patch.status = status;
    if (note) patch.notes = note;

    const updated = await tryDB(
        () => Lead.query().patchAndFetchById(leadId, patch).where({ tenant_id: tenantId }),
        () => {
            const l = demo.getDemoLeads(tenantId).find(x => x.id === leadId);
            if (l) Object.assign(l, patch);
            return l;
        }
    );
    if (!updated) return res.status(404).json({ error: 'Lead not found.' });
    await recordStaffTouch(tenantId, leadId, { status });
    return res.json({ ok: true, lead: updated });
});

module.exports = { router };
