/**
 * AI Impact — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * Cox Automotive (2026): 82% of dealers use AI but only 22% can show revenue growth.
 * The gap is measurement. This report measures the dealer's OWN lead data before and
 * after AI went live (tenants.ai_go_live_at), plus the digital-retail and service-lane
 * features, so the dealer sees what changed in rands and units.
 *
 *   GET /api/ai-impact            (auth)  full report
 *   PUT /api/ai-impact/go-live    (admin) { date } set the go-live date used as the baseline split
 *
 * Method: response metrics use every lead; appointment and conversion rates use only
 * leads at least 14 days old (younger leads haven't had time to close). This is a
 * before/after comparison, not a controlled experiment, and the UI says so.
 */

'use strict';

const express = require('express');
const knex = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const DAY = 86400000;
const MATURE_DAYS = 14;
const BASELINE_DAYS = 90;

const median = (xs) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);
const ms = (v) => (v ? new Date(v).getTime() : null);
const monthKey = (t) => new Date(t).toISOString().slice(0, 7);

function afterHours(t) {
    const d = new Date(t); const day = d.getDay(); const h = d.getHours();
    return day === 0 || (day === 6 && (h < 8 || h >= 13)) || h < 8 || h >= 17;
}

function responseMins(l) {
    const first = ms(l.first_response_at) ?? ms(l.last_contact_at);
    const created = ms(l.created_at);
    return first && created && first >= created ? (first - created) / 60000 : null;
}

function summarise(leads, now) {
    const times = leads.map(responseMins).filter((x) => x != null);
    const ah = leads.filter((l) => afterHours(l.created_at));
    const ahFast = ah.filter((l) => { const m = responseMins(l); return m != null && m <= 5; });
    const mature = leads.filter((l) => now - ms(l.created_at) >= MATURE_DAYS * DAY);
    const appts = mature.filter((l) => l.appointment_at || ['test_drive_booked', 'negotiation', 'won'].includes(l.status));
    const won = mature.filter((l) => l.status === 'won');
    return {
        leads: leads.length,
        median_response_min: times.length ? Math.round(median(times) * 10) / 10 : null,
        within5_pct: pct(times.filter((m) => m <= 5).length, leads.length),
        after_hours_leads: ah.length,
        after_hours_within5_pct: pct(ahFast.length, ah.length),
        unanswered: leads.length - times.length,
        mature_leads: mature.length,
        appointment_pct: pct(appts.length, mature.length),
        conversion_pct: pct(won.length, mature.length),
        won: won.length,
        ai_answered_pct: pct(leads.filter((l) => l.first_response_by === 'ai').length, leads.length),
    };
}

async function goLiveFor(tenant) {
    if (tenant.ai_go_live_at) return ms(tenant.ai_go_live_at);
    const first = await knex('leads').where({ tenant_id: tenant.id, first_response_by: 'ai' }).min('first_response_at as t').first();
    return first?.t ? ms(first.t) : null;
}

router.get('/', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const now = Date.now();
    try {
        const tenant = await knex('tenants').where({ id: tenantId }).first();
        const goLive = await goLiveFor(tenant);
        const since = (goLive || now) - BASELINE_DAYS * DAY;
        const leads = await knex('leads').where({ tenant_id: tenantId }).andWhere('created_at', '>=', new Date(Math.min(since, now - 180 * DAY)).toISOString())
            .select('id', 'status', 'source', 'created_at', 'first_response_at', 'first_response_by', 'last_contact_at', 'appointment_at');

        const before = goLive ? leads.filter((l) => ms(l.created_at) >= since && ms(l.created_at) < goLive) : [];
        const after = goLive ? leads.filter((l) => ms(l.created_at) >= goLive) : leads.filter((l) => ms(l.created_at) >= now - BASELINE_DAYS * DAY);
        const B = summarise(before, now); const A = summarise(after, now);

        // Monthly trend (last 6 calendar months)
        const months = [];
        for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(d.toISOString().slice(0, 7)); }
        const monthly = months.map((m) => {
            const ls = leads.filter((l) => monthKey(l.created_at) === m);
            const s = summarise(ls, now);
            const settled = s.mature_leads >= 10; // too few closed-out leads to judge yet
            return { month: m, leads: s.leads, median_response_min: s.median_response_min, within5_pct: s.within5_pct, conversion_pct: settled ? s.conversion_pct : null, appointment_pct: settled ? s.appointment_pct : null, ai_answered_pct: s.ai_answered_pct, ai_live: goLive ? ms(`${m}-28`) >= goLive : false };
        });

        // Gross profit per unit (Lithia-style), delivered deals with a known cost price
        const delivered = await knex('deals as d').join('vehicles as v', 'v.id', 'd.vehicle_id')
            .where({ 'd.tenant_id': tenantId, 'd.stage': 'delivered' }).andWhere('d.deal_date', '>=', new Date(now - 200 * DAY).toISOString())
            .select('d.deal_date', 'd.sale_price', 'v.cost_price');
        const gpu = months.map((m) => {
            const ds = delivered.filter((d) => monthKey(d.deal_date) === m && d.cost_price != null);
            const gross = ds.reduce((a, d) => a + (Number(d.sale_price) - Number(d.cost_price)), 0);
            return { month: m, units: ds.length, gross_per_unit: ds.length ? Math.round(gross / ds.length) : null };
        });
        const gpuVals = gpu.filter((g) => g.gross_per_unit != null);
        const avgGpu = gpuVals.length ? Math.round(gpuVals.reduce((a, g) => a + g.gross_per_unit * g.units, 0) / gpuVals.reduce((a, g) => a + g.units, 0)) : null;

        // Estimated lift: change in conversion applied to post-go-live mature leads
        const liftPts = B.conversion_pct != null && A.conversion_pct != null ? A.conversion_pct - B.conversion_pct : null;
        const extraSales = liftPts != null ? Math.round((liftPts / 100) * A.mature_leads * 10) / 10 : null;

        // Digital retail (last 30 days)
        const d30 = new Date(now - 30 * DAY).toISOString();
        const [od, webLeads] = await Promise.all([
            knex('online_deals').where({ tenant_id: tenantId }).andWhere('created_at', '>=', d30).select('status', 'vehicle_price', 'payment_method'),
            knex('leads').where({ tenant_id: tenantId, source: 'website' }).andWhere('created_at', '>=', d30).count('* as c').first(),
        ]);
        const liveOd = od.filter((o) => o.status !== 'cancelled');

        // Service lane inspections (last 90 days)
        const insp = await knex('inspections').where({ tenant_id: tenantId }).andWhere('created_at', '>=', new Date(now - 90 * DAY).toISOString()).select('findings');
        let items = 0; let approved = 0; let approvedValue = 0; let decided = 0;
        insp.forEach((i) => {
            let f = []; try { f = JSON.parse(i.findings || '[]'); } catch { /* ignore */ }
            f.forEach((x) => {
                items++;
                if (x.status === 'approved') { approved++; approvedValue += Number(x.est_price) || 0; }
                if (x.status === 'approved' || x.status === 'declined') decided++;
            });
        });

        res.json({
            go_live_at: goLive ? new Date(goLive).toISOString() : null,
            baseline_days: BASELINE_DAYS,
            before: B, after: A,
            lift: {
                conversion_pts: liftPts != null ? Math.round(liftPts * 10) / 10 : null,
                extra_sales: extraSales,
                avg_gross_per_unit: avgGpu,
                extra_gross: extraSales != null && avgGpu ? Math.round(extraSales * avgGpu) : null,
            },
            monthly, gross_per_unit: gpu,
            digital: {
                online_deals_30d: liveOd.length,
                share_of_website_leads_pct: pct(od.length, Number(webLeads?.c || 0)),
                reserved_value: liveOd.reduce((a, o) => a + Number(o.vehicle_price || 0), 0),
                finance_pct: pct(liveOd.filter((o) => o.payment_method === 'finance').length, liveOd.length),
            },
            service: { inspections: insp.length, items, approved_items: approved, approved_value: approvedValue, approval_pct: pct(approved, decided) },
            method: `Before = ${BASELINE_DAYS} days before AI went live; after = since go-live. Conversion and appointment rates count only leads at least ${MATURE_DAYS} days old. This compares periods, so seasonality and stock mix also play a part.`,
        });
    } catch (e) {
        console.error('[ai-impact]', e);
        res.status(500).json({ error: 'Failed to build the AI impact report' });
    }
});

router.put('/go-live', authenticate, requireRole('admin'), async (req, res) => {
    const d = Date.parse(req.body?.date);
    if (Number.isNaN(d) || d > Date.now()) return res.status(400).json({ error: 'Please choose a valid date in the past.' });
    await knex('tenants').where({ id: req.user.tenant_id }).update({ ai_go_live_at: new Date(d).toISOString() });
    res.json({ ok: true, go_live_at: new Date(d).toISOString() });
});

module.exports = { router };
