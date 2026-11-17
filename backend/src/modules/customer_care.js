/**
 * Customer Care Router — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * CSI (customer satisfaction) surveys + concern/complaint case management.
 * Parity with CMS Systems' "WhatsApp Bot CSI" and "Concern & Case Logging (CRP)",
 * plus AI triage: every response is scored for sentiment & category, and a
 * low score / negative comment automatically opens a concern with an SLA.
 *
 *   GET    /api/customer-care/summary?days=90
 *   GET    /api/customer-care/staff
 *   GET    /api/customer-care/surveys?status=
 *   POST   /api/customer-care/surveys
 *   POST   /api/customer-care/surveys/:id/response
 *   GET    /api/customer-care/concerns?status=
 *   POST   /api/customer-care/concerns
 *   PATCH  /api/customer-care/concerns/:id
 *   GET    /api/customer-care/concerns/:id/events
 */

'use strict';

const express = require('express');
const router = express.Router();
const knex = require('../config/db');
const { authenticate } = require('../middleware/auth');
const whatsappSvc = require('../services/whatsapp_service');
const { analyzeFeedback } = require('../services/feedback_ai');
const { listStaff } = require('../utils/staff');

const DEPARTMENTS = ['sales', 'service', 'parts', 'finance', 'general'];
const CONCERN_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const SLA_HOURS = { high: 24, medium: 72, low: 168 };

const nowIso = () => new Date().toISOString();
const dueFrom = (severity) => new Date(Date.now() + (SLA_HOURS[severity] || 72) * 3600 * 1000).toISOString();

async function logEvent(tenantId, concernId, actorId, action, detail = '') {
    await knex('concern_events').insert({
        tenant_id: tenantId, concern_id: concernId, actor_id: actorId || null, action, detail, created_at: nowIso(),
    });
}

function surveyMessage(tenantName, survey) {
    const what = survey.context_type === 'sale' ? 'your recent vehicle purchase' : 'your recent service visit';
    return `Hi ${survey.customer_name.split(' ')[0]}, thank you for choosing ${tenantName || 'us'}. `
        + `On a scale of 0-10, how likely are you to recommend us after ${what}? `
        + `Reply with a number and any comments — we read every response.`;
}

/* ── Core actions (exported so webhooks/service hooks can reuse them) ── */

async function createSurvey(tenantId, data, { send = true, tenantName } = {}) {
    const [id] = await knex('csi_surveys').insert({
        tenant_id: tenantId,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone || null,
        context_type: data.context_type === 'sale' ? 'sale' : 'service',
        context_id: data.context_id || null,
        context_label: data.context_label || null,
        staff_id: data.staff_id || null,
        status: 'sent',
        sent_at: nowIso(),
        created_at: nowIso(),
        updated_at: nowIso(),
    }).returning('id');
    const surveyId = typeof id === 'object' ? id.id : id;
    const survey = await knex('csi_surveys').where({ id: surveyId }).first();

    if (send && survey.customer_phone) {
        Promise.resolve().then(() => whatsappSvc.sendText(tenantId, survey.customer_phone, surveyMessage(tenantName, survey)))
            .catch((e) => console.error('[customer-care] CSI send failed:', e.message));
    }
    return survey;
}

/** Records a 0-10 response, runs AI triage and auto-opens a concern when needed. */
async function recordSurveyResponse(tenantId, surveyId, { score, comment }, actorId = null) {
    const survey = await knex('csi_surveys').where({ id: surveyId, tenant_id: tenantId }).first();
    if (!survey) return null;

    const s = Math.max(0, Math.min(10, Math.round(Number(score))));
    const ai = await analyzeFeedback({ score: s, comment, context: `${survey.context_type} — ${survey.context_label || ''}` });

    await knex('csi_surveys').where({ id: surveyId }).update({
        status: 'responded', score: s, comment: comment || null, sentiment: ai.sentiment,
        ai_category: ai.category, ai_summary: ai.summary, responded_at: nowIso(), updated_at: nowIso(),
    });

    let concern = null;
    if (ai.needs_followup) {
        const existing = await knex('concerns').where({ tenant_id: tenantId, survey_id: surveyId }).first();
        if (!existing) {
            const [cid] = await knex('concerns').insert({
                tenant_id: tenantId,
                survey_id: surveyId,
                customer_name: survey.customer_name,
                customer_phone: survey.customer_phone,
                department: survey.context_type === 'sale' ? 'sales' : 'service',
                severity: ai.severity,
                subject: `CSI ${s}/10 — ${ai.category.replace(/_/g, ' ')}`,
                description: [ai.summary !== comment ? ai.summary : '', comment ? `Customer said: "${comment}"` : ''].filter(Boolean).join('\n'),
                status: 'open',
                source: 'csi_auto',
                ai_category: ai.category,
                due_at: dueFrom(ai.severity),
                created_at: nowIso(),
                updated_at: nowIso(),
            }).returning('id');
            const concernId = typeof cid === 'object' ? cid.id : cid;
            await logEvent(tenantId, concernId, actorId, 'created', `Auto-opened from CSI survey #${surveyId} (score ${s}, ${ai.engine} triage)`);
            concern = await knex('concerns').where({ id: concernId }).first();
        }
    }

    const updated = await knex('csi_surveys').where({ id: surveyId }).first();
    return { survey: updated, concern, ai };
}

/**
 * Inbound WhatsApp hook: if the customer has an open CSI survey (last 7 days) and their message starts
 * with a 0-10 score, record it (rest of the message = comment), thank them, and return true so the
 * chatbot does not also answer. Never throws; returns false when the message isn't a survey reply.
 */
async function handleCsiReply(tenantId, phone, text) {
    try {
        const m = /^\s*(10|[0-9])(?:\s*\/\s*10)?\b[\s.,:;!-]*([\s\S]*)$/.exec(String(text || ''));
        if (!m) return false;
        const last9 = String(phone || '').replace(/\D/g, '').slice(-9);
        if (last9.length !== 9) return false;
        const since = new Date(Date.now() - 7 * 86400000).toISOString();
        const open = await knex('csi_surveys')
            .where({ tenant_id: tenantId, status: 'sent' })
            .andWhere('sent_at', '>=', since)
            .orderBy('sent_at', 'desc');
        const survey = open.find((s) => String(s.customer_phone || '').replace(/\D/g, '').slice(-9) === last9);
        if (!survey) return false;

        const result = await recordSurveyResponse(tenantId, survey.id, { score: Number(m[1]), comment: m[2].trim() || null });
        const reply = result?.concern
            ? "Thank you for the honest feedback. We're sorry we fell short; a manager will contact you within 24 hours to make it right."
            : 'Thank you for your feedback! We really appreciate you taking the time.';
        Promise.resolve().then(() => whatsappSvc.sendText(tenantId, phone, reply)).catch(() => {});
        return true;
    } catch (e) {
        console.error('[customer-care] handleCsiReply failed:', e.message);
        return false;
    }
}

/** Called from the service module when a job is completed. Never throws. */
async function sendServiceCsi(tenantId, booking) {
    try {
        if (!booking || !booking.customer_phone) return null;
        const dup = await knex('csi_surveys').where({ tenant_id: tenantId, context_type: 'service', context_id: booking.id }).first();
        if (dup) return dup;
        return await createSurvey(tenantId, {
            customer_name: booking.customer_name || 'Customer',
            customer_phone: booking.customer_phone,
            context_type: 'service',
            context_id: booking.id,
            context_label: `${booking.vehicle_make || ''} ${booking.vehicle_model || ''} ${booking.job_card_number || ''}`.trim(),
            staff_id: booking.advisor_id || null,
        });
    } catch (e) {
        console.error('[customer-care] sendServiceCsi failed:', e.message);
        return null;
    }
}

/* ── Routes ── */

router.get('/summary', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const days = Math.min(Math.max(Number(req.query.days) || 90, 1), 730);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    try {
        const surveys = await knex('csi_surveys').where({ tenant_id: tenantId }).andWhere('sent_at', '>=', since);
        const responded = surveys.filter((s) => s.status === 'responded' && s.score != null);
        const promoters = responded.filter((s) => s.score >= 9).length;
        const detractors = responded.filter((s) => s.score <= 6).length;
        const nps = responded.length ? Math.round(((promoters - detractors) / responded.length) * 100) : null;
        const avg = responded.length ? Number((responded.reduce((a, s) => a + s.score, 0) / responded.length).toFixed(1)) : null;

        const byCategory = {};
        responded.filter((s) => s.score <= 6).forEach((s) => {
            const c = s.ai_category || 'other';
            byCategory[c] = (byCategory[c] || 0) + 1;
        });

        const concerns = await knex('concerns').where({ tenant_id: tenantId });
        const open = concerns.filter((c) => c.status === 'open' || c.status === 'in_progress');
        const overdue = open.filter((c) => c.due_at && new Date(c.due_at) < new Date()).length;
        const resolved = concerns.filter((c) => c.resolved_at);
        const avgResolveHrs = resolved.length
            ? Math.round(resolved.reduce((a, c) => a + (new Date(c.resolved_at) - new Date(c.created_at)) / 3600000, 0) / resolved.length)
            : null;

        res.json({
            days,
            sent: surveys.length,
            responded: responded.length,
            response_rate: surveys.length ? Math.round((responded.length / surveys.length) * 100) : null,
            avg_score: avg,
            nps,
            promoters,
            detractors,
            detractor_drivers: Object.entries(byCategory).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
            open_concerns: open.length,
            overdue_concerns: overdue,
            avg_resolution_hours: avgResolveHrs,
        });
    } catch (e) {
        console.error('[customer-care] summary', e);
        res.status(500).json({ error: 'Failed to load summary' });
    }
});

router.get('/staff', authenticate, async (req, res) => {
    try { res.json(await listStaff(req.user.tenant_id)); } catch { res.json([]); }
});

router.get('/surveys', authenticate, async (req, res) => {
    const q = knex('csi_surveys').where({ tenant_id: req.user.tenant_id }).orderBy('sent_at', 'desc').limit(200);
    if (req.query.status) q.andWhere({ status: req.query.status });
    res.json(await q);
});

router.post('/surveys', authenticate, async (req, res) => {
    const { customer_name, customer_phone, context_type, context_label, send_whatsapp = true } = req.body || {};
    if (!customer_name || !String(customer_name).trim()) return res.status(400).json({ error: 'customer_name is required' });
    try {
        const survey = await createSurvey(req.user.tenant_id, {
            customer_name: String(customer_name).trim(), customer_phone, context_type, context_label, staff_id: req.user.id,
        }, { send: Boolean(send_whatsapp), tenantName: req.tenant?.name });
        res.status(201).json({ ok: true, survey });
    } catch (e) {
        console.error('[customer-care] create survey', e);
        res.status(500).json({ error: 'Failed to create survey' });
    }
});

router.post('/surveys/:id/response', authenticate, async (req, res) => {
    const { score, comment } = req.body || {};
    const n = Number(score);
    if (!Number.isFinite(n) || n < 0 || n > 10) return res.status(400).json({ error: 'score must be 0-10' });
    try {
        const result = await recordSurveyResponse(req.user.tenant_id, Number(req.params.id), { score: n, comment }, req.user.id);
        if (!result) return res.status(404).json({ error: 'Survey not found' });
        res.json({ ok: true, ...result });
    } catch (e) {
        console.error('[customer-care] record response', e);
        res.status(500).json({ error: 'Failed to record response' });
    }
});

router.get('/concerns', authenticate, async (req, res) => {
    const q = knex('concerns').where({ tenant_id: req.user.tenant_id }).orderBy('created_at', 'desc').limit(300);
    if (req.query.status && CONCERN_STATUSES.includes(req.query.status)) q.andWhere({ status: req.query.status });
    res.json(await q);
});

router.post('/concerns', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { customer_name, customer_phone, department = 'general', subject, description, assigned_to } = req.body || {};
    if (!customer_name || !subject) return res.status(400).json({ error: 'customer_name and subject are required' });
    try {
        const ai = await analyzeFeedback({ comment: `${subject}. ${description || ''}` });
        const severity = ['low', 'medium', 'high'].includes(req.body.severity) ? req.body.severity : (ai.severity === 'low' ? 'medium' : ai.severity);
        const [cid] = await knex('concerns').insert({
            tenant_id: tenantId,
            customer_name, customer_phone: customer_phone || null,
            department: DEPARTMENTS.includes(department) ? department : 'general',
            severity, subject, description: description || null,
            status: 'open', source: 'manual', ai_category: ai.category,
            assigned_to: assigned_to || null, due_at: dueFrom(severity),
            created_at: nowIso(), updated_at: nowIso(),
        }).returning('id');
        const concernId = typeof cid === 'object' ? cid.id : cid;
        await logEvent(tenantId, concernId, req.user.id, 'created', `Logged manually (${severity}, AI category: ${ai.category})`);
        res.status(201).json({ ok: true, concern: await knex('concerns').where({ id: concernId }).first() });
    } catch (e) {
        console.error('[customer-care] create concern', e);
        res.status(500).json({ error: 'Failed to create concern' });
    }
});

router.patch('/concerns/:id', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const id = Number(req.params.id);
    const existing = await knex('concerns').where({ id, tenant_id: tenantId }).first();
    if (!existing) return res.status(404).json({ error: 'Concern not found' });

    const { status, assigned_to, department, resolution, note } = req.body || {};
    const patch = { updated_at: nowIso() };
    const events = [];

    if (status && CONCERN_STATUSES.includes(status) && status !== existing.status) {
        if ((status === 'resolved' || status === 'closed') && !(resolution || existing.resolution)) {
            return res.status(400).json({ error: 'A resolution note is required to resolve or close a concern' });
        }
        patch.status = status;
        if (status === 'resolved' || status === 'closed') patch.resolved_at = existing.resolved_at || nowIso();
        if (status === 'open' || status === 'in_progress') patch.resolved_at = null;
        events.push(['status_changed', `${existing.status} → ${status}`]);
    }
    if (assigned_to !== undefined && Number(assigned_to || 0) !== Number(existing.assigned_to || 0)) {
        patch.assigned_to = assigned_to || null;
        events.push(['assigned', assigned_to ? `Assigned to user #${assigned_to}` : 'Unassigned']);
    }
    if (department && DEPARTMENTS.includes(department) && department !== existing.department) {
        patch.department = department;
        events.push(['department_changed', `${existing.department} → ${department}`]);
    }
    if (resolution !== undefined && resolution !== existing.resolution) {
        patch.resolution = resolution;
        events.push(['resolution_updated', resolution]);
    }
    if (note) events.push(['note', note]);

    await knex('concerns').where({ id }).update(patch);
    for (const [action, detail] of events) await logEvent(tenantId, id, req.user.id, action, detail);
    res.json({ ok: true, concern: await knex('concerns').where({ id }).first() });
});

router.get('/concerns/:id/events', authenticate, async (req, res) => {
    const rows = await knex('concern_events as e')
        .leftJoin('users as u', 'u.id', 'e.actor_id')
        .where({ 'e.tenant_id': req.user.tenant_id, 'e.concern_id': Number(req.params.id) })
        .select('e.*', 'u.first_name', 'u.last_name')
        .orderBy('e.created_at', 'asc');
    res.json(rows.map((r) => ({ ...r, actor: r.first_name ? `${r.first_name} ${r.last_name || ''}`.trim() : (r.actor_id ? `User #${r.actor_id}` : 'System') })));
});

module.exports = { router, createSurvey, recordSurveyResponse, sendServiceCsi, handleCsiReply };
