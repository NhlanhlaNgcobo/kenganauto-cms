/**
 * Targets & Scorecards Router — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * Monthly targets for the dealership or individual staff, with live actuals,
 * run-rate projection and at-risk flags (parity with CMS "Target Management"
 * and "Dealer Scorecards").
 *
 *   GET    /api/targets?period=YYYY-MM
 *   POST   /api/targets                (admin)  { user_id|null, metric, period, target_value }
 *   DELETE /api/targets/:id            (admin)
 *   GET    /api/targets/scorecard?period=YYYY-MM
 *   GET    /api/targets/staff
 */

'use strict';

const express = require('express');
const router = express.Router();
const knex = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { listStaff, periodBounds } = require('../utils/staff');

const METRICS = {
    leads: { label: 'New leads', kind: 'count' },
    test_drives: { label: 'Test drives booked', kind: 'count' },
    sales_won: { label: 'Units sold', kind: 'count' },
    service_bookings: { label: 'Service bookings', kind: 'count' },
    csi_score: { label: 'Avg CSI score (0-10)', kind: 'average' },
};

/**
 * Actual value for a metric in a period, optionally scoped to one user.
 * NOTE: leads keep only their current status, so test_drives/sales_won count leads
 * whose status reached that stage and were last updated within the period.
 */
async function actualFor(tenantId, metric, b, userId) {
    const inPeriod = (q, col) => q.andWhere(col, '>=', b.start).andWhere(col, '<', b.end);
    let q;
    switch (metric) {
        case 'leads':
            q = inPeriod(knex('leads').where({ tenant_id: tenantId }), 'created_at');
            if (userId) q.andWhere({ assigned_to: userId });
            return Number((await q.count('* as c').first()).c) || 0;
        case 'test_drives':
            q = inPeriod(knex('leads').where({ tenant_id: tenantId }).whereIn('status', ['test_drive_booked', 'negotiation', 'won']), 'updated_at');
            if (userId) q.andWhere({ assigned_to: userId });
            return Number((await q.count('* as c').first()).c) || 0;
        case 'sales_won':
            q = inPeriod(knex('leads').where({ tenant_id: tenantId, status: 'won' }), 'updated_at');
            if (userId) q.andWhere({ assigned_to: userId });
            return Number((await q.count('* as c').first()).c) || 0;
        case 'service_bookings':
            q = inPeriod(knex('service_bookings').where({ tenant_id: tenantId }).whereNot({ status: 'cancelled' }), 'booking_date');
            if (userId) q.andWhere({ advisor_id: userId });
            return Number((await q.count('* as c').first()).c) || 0;
        case 'csi_score': {
            q = inPeriod(knex('csi_surveys').where({ tenant_id: tenantId, status: 'responded' }), 'responded_at');
            if (userId) q.andWhere({ staff_id: userId });
            const r = await q.avg('score as a').first();
            return r && r.a != null ? Number(Number(r.a).toFixed(1)) : null;
        }
        default:
            return null;
    }
}

function assess(metric, actual, target, b) {
    const today = new Date();
    const isCurrent = today.getFullYear() === b.year && today.getMonth() === b.month;
    const isPast = new Date(b.end) <= today;
    const elapsed = isPast ? b.daysInMonth : isCurrent ? Math.max(today.getDate(), 1) : 0;

    if (METRICS[metric].kind === 'average') {
        if (actual == null) return { projected: null, pct: null, status: 'no_data' };
        const pct = Math.round((actual / target) * 100);
        return { projected: actual, pct, status: actual >= target ? 'on_track' : actual >= target * 0.9 ? 'at_risk' : 'behind' };
    }

    const projected = elapsed ? Math.round((actual / elapsed) * b.daysInMonth) : 0;
    const pct = target ? Math.round((actual / target) * 100) : null;
    let status;
    if (!elapsed) status = 'not_started';
    else if (actual >= target) status = 'achieved';
    else if (projected >= target) status = 'on_track';
    else if (projected >= target * 0.85) status = 'at_risk';
    else status = 'behind';
    return { projected, pct, status };
}

router.get('/staff', authenticate, async (req, res) => {
    try { res.json(await listStaff(req.user.tenant_id)); } catch { res.json([]); }
});

router.get('/', authenticate, async (req, res) => {
    const b = periodBounds(req.query.period);
    res.json(await knex('sales_targets').where({ tenant_id: req.user.tenant_id, period: b.period }).orderBy('metric'));
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { user_id = null, metric, period, target_value } = req.body || {};
    const b = periodBounds(period);
    const value = Number(target_value);
    if (!METRICS[metric]) return res.status(400).json({ error: `metric must be one of ${Object.keys(METRICS).join(', ')}` });
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'target_value must be a positive number' });
    if (metric === 'csi_score' && value > 10) return res.status(400).json({ error: 'CSI target is on a 0-10 scale' });

    if (user_id) {
        const u = await knex('users').where({ id: user_id, tenant_id: tenantId }).first();
        if (!u) return res.status(400).json({ error: 'User not found for this dealership' });
    }

    // Upsert on (tenant, user, metric, period)
    const match = knex('sales_targets').where({ tenant_id: tenantId, metric, period: b.period });
    user_id ? match.andWhere({ user_id }) : match.whereNull('user_id');
    const existing = await match.first();
    if (existing) {
        await knex('sales_targets').where({ id: existing.id }).update({ target_value: value, updated_at: new Date().toISOString() });
        return res.json({ ok: true, target: await knex('sales_targets').where({ id: existing.id }).first() });
    }
    const [id] = await knex('sales_targets').insert({
        tenant_id: tenantId, user_id: user_id || null, metric, period: b.period, target_value: value,
        created_by: req.user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).returning('id');
    const newId = typeof id === 'object' ? id.id : id;
    res.status(201).json({ ok: true, target: await knex('sales_targets').where({ id: newId }).first() });
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
    const n = await knex('sales_targets').where({ id: Number(req.params.id), tenant_id: req.user.tenant_id }).del();
    if (!n) return res.status(404).json({ error: 'Target not found' });
    res.json({ ok: true });
});

router.get('/scorecard', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const b = periodBounds(req.query.period);
    try {
        let targets = await knex('sales_targets').where({ tenant_id: tenantId, period: b.period });
        // Non-admins only see the dealership line and their own targets
        if (req.user.role !== 'admin') targets = targets.filter((t) => !t.user_id || t.user_id === req.user.id);

        const staff = await listStaff(tenantId);
        const names = Object.fromEntries(staff.map((s) => [s.id, s.name]));

        const rows = [];
        for (const t of targets) {
            const actual = await actualFor(tenantId, t.metric, b, t.user_id);
            rows.push({
                id: t.id,
                user_id: t.user_id,
                owner: t.user_id ? (names[t.user_id] || `User #${t.user_id}`) : 'Dealership',
                metric: t.metric,
                label: METRICS[t.metric]?.label || t.metric,
                target: t.target_value,
                actual,
                ...assess(t.metric, actual, t.target_value, b),
            });
        }
        rows.sort((a, z) => (a.user_id ? 1 : 0) - (z.user_id ? 1 : 0) || a.owner.localeCompare(z.owner) || a.metric.localeCompare(z.metric));

        res.json({
            period: b.period,
            days_in_month: b.daysInMonth,
            metrics: METRICS,
            rows,
            at_risk: rows.filter((r) => r.status === 'at_risk' || r.status === 'behind').length,
        });
    } catch (e) {
        console.error('[targets] scorecard', e);
        res.status(500).json({ error: 'Failed to build scorecard' });
    }
});

module.exports = { router, METRICS };
