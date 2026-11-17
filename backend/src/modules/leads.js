/**
 * Leads Router — KenganAuto CRM
 * ─────────────────────────────────────────────────────────────
 * GET    /api/leads                  → paginated list + filters
 * POST   /api/leads                  → create lead
 * GET    /api/leads/stats            → kanban column counts + overdue
 * GET    /api/leads/:id              → lead detail with conversations
 * PATCH  /api/leads/:id              → update lead fields
 * PATCH  /api/leads/:id/stage        → move stage (logs activity)
 * PATCH  /api/leads/:id/assign       → assign salesperson
 * POST   /api/leads/:id/notes        → add note (logs activity)
 * POST   /api/leads/:id/ai-summary   → generate Claude AI summary
 * POST   /api/leads/bulk             → bulk stage / assign / delete
 * GET    /api/leads/team             → list salesperson users (for assign dropdown)
 */

const express = require('express');
const { recordStaffTouch } = require('../services/lead_touch');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { AIEngine } = require('../services/ai_engine');
const notificationSvc = require('../services/notification_service');
const scorer = require('../services/lead_scorer');

/* ── Models (graceful no-op if DB not yet migrated) ── */
let Lead, Conversation, User;
try {
    Lead = require('../models/Lead');
    Conversation = require('../models/Conversation');
    User = require('../models/User');
} catch { /* DB not ready — use mock data */ }

/* ─── In-memory fallback store (used when DB is unavailable) ─── */
const mockLeads = generateMockLeads();
function getMockLeads(tenantId) {
    if (tenantId === 9999) return require('./demo_seeder').getDemoLeads(9999);
    return mockLeads.filter(l => l.tenant_id === tenantId || tenantId === 1);
}

function generateMockLeads() {
    const sources = ['whatsapp', 'website', 'autotrader', 'cars_coza', 'facebook'];
    const statuses = ['new', 'contacted', 'qualified', 'test_drive_booked', 'negotiation', 'won', 'lost'];
    const vehicles = ['BMW X5 M Sport', 'Mercedes GLE 450', 'Audi Q7 S-Line', 'Toyota Land Cruiser', 'Range Rover Sport', 'VW Touareg R-Line', 'Ford Everest', 'Hyundai Tucson'];
    const names = ['Thabo Molefe', 'Priya Naidoo', 'Jacques du Plessis', 'Lerato Sithole', 'Mohamed Patel', 'Zanele Dlamini', 'Pieter van der Merwe', 'Amara Osei', 'Sibongile Ndlovu', 'Ryan Botha'];
    const now = Date.now();

    return names.map((name, i) => ({
        id: i + 1,
        tenant_id: 1,
        customer_name: name,
        customer_phone: `+27 8${i}${Math.floor(Math.random() * 9000000 + 1000000)}`,
        customer_email: `${name.toLowerCase().replace(/ /g, '.')}@example.co.za`,
        source: sources[i % sources.length],
        vehicle_interest: vehicles[i % vehicles.length],
        budget_min: (300 + i * 50) * 1000,
        budget_max: (500 + i * 80) * 1000,
        status: statuses[i % statuses.length],
        assigned_to: (i % 3) + 1,
        assigned_name: ['David M.', 'Sarah K.', 'Neo L.'][i % 3],
        ai_score: 30 + Math.floor(Math.random() * 70),
        last_contact_at: i < 3 ? null : new Date(now - i * 8 * 60 * 60 * 1000).toISOString(),
        notes: i % 2 === 0 ? 'Customer is very interested. Follow up ASAP.' : null,
        created_at: new Date(now - i * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now - i * 4 * 60 * 60 * 1000).toISOString(),
        activity_log: [
            { type: 'created', message: 'Lead created via ' + sources[i % sources.length], timestamp: new Date(now - i * 24 * 60 * 60 * 1000).toISOString() },
            ...(i % 2 === 0 ? [{ type: 'stage_change', message: `Stage changed to ${statuses[i % statuses.length]}`, timestamp: new Date(now - i * 12 * 60 * 60 * 1000).toISOString() }] : []),
        ],
    }));
}

/* ─── Helpers ─── */
function hoursAgo(isoString) {
    if (!isoString) return Infinity;
    return (Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60);
}

function isOverdue(lead) {
    // Won/lost leads are closed — never "overdue for follow-up".
    if (['won', 'lost'].includes(lead.status)) return false;
    const lastContact = lead.last_contact_at;
    if (!lastContact && lead.status === 'new') {
        return hoursAgo(lead.created_at) > 24;
    }
    return hoursAgo(lastContact) > 24;
}

async function tryDB(fn, fallback) {
    if (!Lead) return fallback();
    try { return await fn(); } catch { return fallback(); }
}

/* ─────────────────────────────────────────────────────────────
   POST /api/leads/widget/:tenantId  — PUBLIC (no auth required)
   Called by the embeddable finance-widget.js on external websites.
   Creates a lead in the tenant's CRM from the finance widget form.
   IMPORTANT: Must be defined BEFORE router.use(authenticate)
   ───────────────────────────────────────────────────────────── */
router.post('/widget/:tenantId', async (req, res) => {
    const tenantId = Number(req.params.tenantId) || 1;
    const { customer_name, customer_phone, customer_email, notes, metadata } = req.body;

    if (!customer_name || !customer_phone) {
        return res.status(400).json({ error: 'customer_name and customer_phone are required.' });
    }

    // Rate-limit: max 5 leads per IP per hour (basic check via in-memory map)
    const ip = req.ip || 'unknown';
    if (!router._widgetRateMap) router._widgetRateMap = new Map();
    const now = Date.now();
    const hits = (router._widgetRateMap.get(ip) || []).filter(t => now - t < 3_600_000);
    if (hits.length >= 5) return res.status(429).json({ error: 'Too many requests. Try again in an hour.' });
    router._widgetRateMap.set(ip, [...hits, now]);

    const newLead = await tryDB(
        () => Lead.query().insertAndFetch({
            tenant_id: tenantId,
            customer_name, customer_phone, customer_email,
            source: 'website',
            notes: notes || null,
            status: 'new',
            ai_score: 15, // widget leads start lower — rescore will update
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }),
        () => {
            const lead = {
                id: mockLeads.length + 1,
                tenant_id: tenantId,
                customer_name, customer_phone, customer_email,
                source: 'website',
                notes: notes || null,
                status: 'new',
                ai_score: 15,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                activity_log: [{ type: 'created', message: 'Lead from finance calculator widget', timestamp: new Date().toISOString() }],
                overdue: false,
            };
            if (metadata) lead.finance_metadata = metadata;
            mockLeads.push(lead);
            return lead;
        }
    );

    // Background score
    setImmediate(async () => {
        try {
            await scorer.rescoreLead(newLead, tenantId, { id: tenantId, name: 'KenganAuto' }, []);
        } catch { /* non-fatal */ }
    });

    return res.status(201).json({ ok: true, lead_id: newLead.id });
});

/* ─── All routes below require auth ─── */
router.use(authenticate);

/* ─────────────────────────────────────────────────────────────
   GET /api/leads/team  — users available for assignment
   ───────────────────────────────────────────────────────────── */
router.get('/team', async (req, res) => {
    const tenantId = req.user.tenant_id;
    const team = await tryDB(
        () => User.query().where({ tenant_id: tenantId, active: true })
            .select('id', 'first_name', 'last_name', 'email', 'role'),
        () => [
            { id: 1, first_name: 'David', last_name: 'M.', role: 'admin' },
            { id: 2, first_name: 'Sarah', last_name: 'K.', role: 'salesperson' },
            { id: 3, first_name: 'Neo', last_name: 'L.', role: 'salesperson' },
        ]
    );
    return res.json({ team });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/leads/stats  — column counts for kanban header
   ───────────────────────────────────────────────────────────── */
router.get('/stats', async (req, res) => {
    const tenantId = req.user.tenant_id;
    const leads = await tryDB(
        () => Lead.query().where({ tenant_id: tenantId }),
        () => getMockLeads(tenantId)
    );

    const stages = ['new', 'contacted', 'qualified', 'test_drive_booked', 'negotiation', 'won', 'lost'];
    const counts = {};
    stages.forEach(s => { counts[s] = leads.filter(l => l.status === s).length; });
    const overdue = leads.filter(isOverdue).length;

    return res.json({ counts, total: leads.length, overdue });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/leads  — paginated list with filters
   ───────────────────────────────────────────────────────────── */
router.get('/', async (req, res) => {
    const tenantId = req.user.tenant_id;
    const {
        status, source, assigned_to, search,
        score_min, score_max, page = 1, limit = 50, include_archived,
    } = req.query;
    const archiveCutoff = new Date(Date.now() - 30 * 86400000).toISOString();

    let leads = await tryDB(
        async () => {
            let q = Lead.query().where({ tenant_id: tenantId });
            if (!include_archived) q = q.where(b => b.whereNotIn('status', ['won', 'lost']).orWhere('updated_at', '>=', archiveCutoff));
            if (status) q = q.where('status', status);
            if (source) q = q.where('source', source);
            if (assigned_to) q = q.where('assigned_to', Number(assigned_to));
            if (search) q = q.where(b => b.where('customer_name', 'ilike', `%${search}%`).orWhere('customer_phone', 'ilike', `%${search}%`).orWhere('vehicle_interest', 'ilike', `%${search}%`));
            if (score_min) q = q.where('ai_score', '>=', Number(score_min));
            if (score_max) q = q.where('ai_score', '<=', Number(score_max));
            return q.orderBy('updated_at', 'desc');
        },
        () => {
            let results = getMockLeads(tenantId);
            if (status) results = results.filter(l => l.status === status);
            if (source) results = results.filter(l => l.source === source);
            if (assigned_to) results = results.filter(l => l.assigned_to === Number(assigned_to));
            if (search) {
                const q = search.toLowerCase();
                results = results.filter(l =>
                    l.customer_name?.toLowerCase().includes(q) ||
                    l.customer_phone?.toLowerCase().includes(q) ||
                    l.vehicle_interest?.toLowerCase().includes(q)
                );
            }
            return results;
        }
    );

    // Enrich with overdue flag
    leads = leads.map(l => ({ ...l, overdue: isOverdue(l) }));

    const total = leads.length;
    const start = (Number(page) - 1) * Number(limit);
    const paginated = leads.slice(start, start + Number(limit));

    return res.json({ leads: paginated, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/leads  — create a new lead
   ───────────────────────────────────────────────────────────── */
router.post('/', async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { customer_name, customer_phone, customer_email, source, vehicle_interest, notes } = req.body;

    if (!customer_name || !source) {
        return res.status(400).json({ error: 'customer_name and source are required.' });
    }

    const newLead = await tryDB(
        () => Lead.query().insertAndFetch({
            tenant_id: tenantId,
            customer_name, customer_phone, customer_email,
            source, vehicle_interest, notes,
            status: 'new',
            ai_score: 50,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }),
        () => {
            const lead = {
                id: mockLeads.length + 1,
                tenant_id: tenantId,
                customer_name, customer_phone, customer_email,
                source, vehicle_interest, notes,
                status: 'new',
                ai_score: 50,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                activity_log: [{ type: 'created', message: `Lead created manually`, timestamp: new Date().toISOString() }],
                overdue: false,
            };
            mockLeads.push(lead);
            return lead;
        }
    );
    // Compute initial AI score from source + basic signals
    let initialScore = 50;
    try {
        const { score } = scorer.computeScore(newLead, []);
        initialScore = score;
        // Persist score
        if (Lead) {
            await Lead.query().patchById(newLead.id, { ai_score: initialScore }).where({ tenant_id: tenantId }).catch(() => { });
        } else {
            newLead.ai_score = initialScore;
        }
    } catch { /* non-fatal */ }

    try {
        await notificationSvc.notifyLeadQualified({
            tenant: { id: tenantId, name: 'KenganAuto' },
            lead: newLead,
            conversationId: null,
            intent: 'NEW_LEAD',
            channel: source,
        });
    } catch { /* non-fatal */ }

    return res.status(201).json(newLead);
});

/* ─────────────────────────────────────────────────────────────
   GET /api/leads/:id  — lead detail
   ───────────────────────────────────────────────────────────── */
router.get('/:id', async (req, res) => {
    const tenantId = req.user.tenant_id;
    const leadId = Number(req.params.id);

    const lead = await tryDB(
        async () => {
            const found = await Lead.query().findById(leadId).where({ tenant_id: tenantId });
            if (!found) return null;
            // Attach last 5 conversations
            const convs = await Conversation.query().where({ lead_id: leadId, tenant_id: tenantId }).orderBy('updated_at', 'desc').limit(5);
            found.conversations = convs;
            return found;
        },
        () => {
            const found = getMockLeads(tenantId).find(l => l.id === leadId);
            if (!found) return null;
            found.conversations = [{
                id: 1,
                channel: 'whatsapp',
                messages: [
                    { role: 'user', content: `Hi, I'm interested in the ${found.vehicle_interest}`, timestamp: new Date().toISOString() },
                    { role: 'assistant', content: `Great choice! The ${found.vehicle_interest} is one of our most popular models. Can I get your name to personalise your quote?`, timestamp: new Date().toISOString() },
                ],
                intent_detected: 'VEHICLE_ENQUIRY',
                sentiment_score: 0.8,
            }];
            return found;
        }
    );

    if (!lead) return res.status(404).json({ error: 'Lead not found.' });
    return res.json({ ...lead, overdue: isOverdue(lead) });
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/leads/:id  — update lead fields
   ───────────────────────────────────────────────────────────── */
router.patch('/:id', async (req, res) => {
    const tenantId = req.user.tenant_id;
    const leadId = Number(req.params.id);
    const allowed = ['customer_name', 'customer_phone', 'customer_email', 'vehicle_interest', 'budget_min', 'budget_max', 'ai_score'];
    const patch = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) patch[k] = req.body[k]; });
    patch.updated_at = new Date().toISOString();

    const updated = await tryDB(
        () => Lead.query().patchAndFetchById(leadId, patch).where({ tenant_id: tenantId }),
        () => {
            const lead = getMockLeads(tenantId).find(l => l.id === leadId);
            if (!lead) return null;
            Object.assign(lead, patch);
            return lead;
        }
    );

    if (!updated) return res.status(404).json({ error: 'Lead not found.' });
    return res.json(updated);
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/leads/:id/stage  — move stage (drag-and-drop)
   ───────────────────────────────────────────────────────────── */
router.patch('/:id/stage', async (req, res) => {
    const tenantId = req.user.tenant_id;
    const leadId = Number(req.params.id);
    const { status } = req.body;

    const validStatuses = ['new', 'contacted', 'qualified', 'test_drive_booked', 'negotiation', 'won', 'lost'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const logEntry = {
        type: 'stage_change',
        message: `Stage moved to "${status}" by ${req.user.first_name} ${req.user.last_name}`,
        timestamp: new Date().toISOString(),
        actor: `${req.user.first_name} ${req.user.last_name}`,
    };

    const updated = await tryDB(
        async () => {
            const lead = await Lead.query().patchAndFetchById(leadId, {
                status,
                last_contact_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }).where({ tenant_id: tenantId });
            return lead;
        },
        () => {
            const lead = getMockLeads(tenantId).find(l => l.id === leadId);
            if (!lead) return null;
            lead.status = status;
            lead.last_contact_at = new Date().toISOString();
            lead.updated_at = new Date().toISOString();
            if (!lead.activity_log) lead.activity_log = [];
            lead.activity_log.unshift(logEntry);
            return lead;
        }
    );

    if (!updated) return res.status(404).json({ error: 'Lead not found.' });
    await recordStaffTouch(tenantId, leadId, { status });
    return res.json({ ...updated, activity_log_entry: logEntry });
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/leads/:id/assign  — assign salesperson
   ───────────────────────────────────────────────────────────── */
router.patch('/:id/assign', requireRole('admin', 'salesperson'), async (req, res) => {
    const tenantId = req.user.tenant_id;
    const leadId = Number(req.params.id);
    const { assigned_to } = req.body;

    const updated = await tryDB(
        () => Lead.query().patchAndFetchById(leadId, {
            assigned_to,
            updated_at: new Date().toISOString(),
        }).where({ tenant_id: tenantId }),
        () => {
            const lead = getMockLeads(tenantId).find(l => l.id === leadId);
            if (!lead) return null;
            lead.assigned_to = assigned_to;
            lead.updated_at = new Date().toISOString();
            if (!lead.activity_log) lead.activity_log = [];
            lead.activity_log.unshift({
                type: 'assigned',
                message: `Lead assigned to user #${assigned_to}`,
                timestamp: new Date().toISOString(),
            });
            return lead;
        }
    );

    if (!updated) return res.status(404).json({ error: 'Lead not found.' });
    return res.json(updated);
});

/* ─────────────────────────────────────────────────────────────
   POST /api/leads/:id/notes  — add salesperson note
   ───────────────────────────────────────────────────────────── */
router.post('/:id/notes', async (req, res) => {
    const tenantId = req.user.tenant_id;
    const leadId = Number(req.params.id);
    const { note } = req.body;

    if (!note?.trim()) return res.status(400).json({ error: 'note is required.' });

    const timestamp = new Date().toISOString();
    const noteEntry = {
        text: note.trim(),
        author: `${req.user.first_name} ${req.user.last_name}`,
        timestamp,
    };

    const updated = await tryDB(
        () => Lead.query().patchAndFetchById(leadId, {
            notes: note.trim(),
            last_contact_at: timestamp,
            updated_at: timestamp,
        }).where({ tenant_id: tenantId }),
        () => {
            const lead = getMockLeads(tenantId).find(l => l.id === leadId);
            if (!lead) return null;
            lead.notes = note.trim();
            lead.last_contact_at = timestamp;
            lead.updated_at = timestamp;
            if (!lead.activity_log) lead.activity_log = [];
            lead.activity_log.unshift({ type: 'note', message: `Note added: "${note.trim().slice(0, 60)}…"`, timestamp, actor: noteEntry.author });
            return lead;
        }
    );

    if (!updated) return res.status(404).json({ error: 'Lead not found.' });
    await recordStaffTouch(tenantId, leadId);
    return res.json({ ...updated, note_added: noteEntry });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/leads/:id/ai-summary  — ask Claude to summarise conversation
   ───────────────────────────────────────────────────────────── */
router.post('/:id/ai-summary', async (req, res) => {
    const tenantId = req.user.tenant_id;
    const leadId = Number(req.params.id);

    const lead = await tryDB(
        async () => {
            const l = await Lead.query().findById(leadId).where({ tenant_id: tenantId });
            if (!l) return null;
            const convs = await Conversation.query().where({ lead_id: leadId }).orderBy('updated_at', 'desc').limit(1);
            l.conversations = convs;
            return l;
        },
        () => {
            const found = getMockLeads(tenantId).find(l => l.id === leadId);
            if (found && !found.conversations) {
                found.conversations = [{
                    messages: [
                        { role: 'user', content: `I'm interested in the ${found.vehicle_interest}` },
                        { role: 'assistant', content: 'Great! Let me tell you about it.' },
                    ]
                }];
            }
            return found;
        }
    );

    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    const messages = lead.conversations?.[0]?.messages || [];
    if (!messages.length) {
        return res.json({ summary: 'No conversation history found for this lead.' });
    }

    const transcript = messages.map(m => `${m.role === 'user' ? 'Customer' : 'AI'}: ${m.content}`).join('\n');

    try {
        const result = await AIEngine.chat({
            tenant: { id: tenantId, name: 'KenganAuto' },
            messages: [{ role: 'user', content: `Summarise this car dealership chatbot conversation in 3-5 sentences for a salesperson. Focus on: what the customer wants, their urgency, their budget, and the best next steps.\n\nConversation:\n${transcript}` }],
            systemPrompt: 'You are a CRM assistant creating concise lead summaries for automotive salespeople. Be factual and actionable.',
            intentContext: '',
        });
        return res.json({ summary: result.text });
    } catch {
        return res.json({ summary: `${lead.customer_name} is interested in a ${lead.vehicle_interest || 'vehicle'}. They came in via ${lead.source}. Recommend following up immediately with personalised stock details.` });
    }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/leads/:id/score   — trigger a full rescore (async)
   GET  /api/leads/:id/score   — return current score + breakdown
   ───────────────────────────────────────────────────────────── */
router.post('/:id/score', async (req, res) => {
    const tenantId = req.user.tenant_id;
    const leadId = Number(req.params.id);

    // Kick off async — respond immediately so UI doesn't hang
    res.json({ status: 'rescoring', leadId, message: 'AI rescoring started. Refresh in a few seconds.' });

    // Run in background
    setImmediate(async () => {
        try {
            let lead = null;
            let messages = [];

            // Try to get lead + messages from DB
            await tryDB(
                async () => {
                    lead = await Lead.query().findById(leadId).where({ tenant_id: tenantId });
                    if (lead && Conversation) {
                        const conv = await Conversation.query().where({ lead_id: leadId }).orderBy('updated_at', 'desc').limit(1).first();
                        messages = conv?.messages || [];
                    }
                },
                () => {
                    lead = getMockLeads(tenantId).find(l => l.id === leadId);
                    messages = lead?.conversations?.[0]?.messages || [];
                }
            );
            if (!lead) return;

            const result = await scorer.rescoreLead(lead, tenantId, { id: tenantId, name: 'KenganAuto' }, messages);

            // Update mock store if no DB
            if (!Lead) {
                const mockLead = getMockLeads(tenantId).find(l => l.id === leadId);
                if (mockLead && result) {
                    mockLead.ai_score = result.score;
                    mockLead.ai_insights = result.insights;
                }
            }
        } catch (err) {
            const pino = require('pino');
            pino({ name: 'leads-router' }).warn({ leadId, err: err.message }, 'Rescore failed');
        }
    });
});

router.get('/:id/score', async (req, res) => {
    const tenantId = req.user.tenant_id;
    const leadId = Number(req.params.id);

    const lead = await tryDB(
        () => Lead.query().findById(leadId).where({ tenant_id: tenantId }),
        () => getMockLeads(tenantId).find(l => l.id === leadId)
    );
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    // Live compute from current lead data (fast — no Claude call)
    const messages = await tryDB(
        async () => {
            if (!Conversation) return [];
            const conv = await Conversation.query().where({ lead_id: leadId }).orderBy('updated_at', 'desc').limit(1).first();
            return conv?.messages || [];
        },
        () => lead.conversations?.[0]?.messages || []
    );

    const { score, breakdown, tier, signals } = scorer.computeScore(lead, messages);

    // Try to load persisted Claude insights
    let insights = null;
    try {
        if (lead.ai_insights) {
            insights = typeof lead.ai_insights === 'string' ? JSON.parse(lead.ai_insights) : lead.ai_insights;
        }
    } catch { insights = null; }

    return res.json({
        lead_id: leadId,
        score: lead.ai_score ?? score,
        live_score: score,
        breakdown,
        tier,
        signals,
        insights,
        scoring_rules: scorer.SCORING_RULES,
    });
});

// NOTE: /bulk is intentionally placed BEFORE /:id routes to prevent Express
// from matching 'bulk' as a lead ID param.
router.post('/bulk', requireRole('admin'), async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { ids, action, value } = req.body;

    if (!ids?.length || !action) {
        return res.status(400).json({ error: 'ids and action are required.' });
    }

    const results = await Promise.all(ids.map(async (id) => {
        const leadId = Number(id);
        return tryDB(
            async () => {
                const patch = action === 'stage' ? { status: value, updated_at: new Date().toISOString() }
                    : action === 'assign' ? { assigned_to: Number(value), updated_at: new Date().toISOString() }
                        : null;
                if (patch) return Lead.query().patchAndFetchById(leadId, patch).where({ tenant_id: tenantId });
                if (action === 'delete') return Lead.query().deleteById(leadId).where({ tenant_id: tenantId });
                return null;
            },
            () => {
                const lead = getMockLeads(tenantId).find(l => l.id === leadId);
                if (!lead) return null;
                if (action === 'stage') lead.status = value;
                if (action === 'assign') lead.assigned_to = Number(value);
                return lead;
            }
        );
    }));

    return res.json({ updated: results.filter(Boolean).length, total: ids.length });
});

/* ─── Widget route has been moved above router.use(authenticate) ─── */
// See the route definition around line 90 in this file.

module.exports = router;

