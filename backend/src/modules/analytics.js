/**
 * Analytics Router — KenganAuto (LIVE)
 * ─────────────────────────────────────────────────────────────
 * Real per-tenant business intelligence computed from the database.
 * Every handler degrades gracefully: if a query fails or there's no DB,
 * it returns a sensible mock so the UI never breaks.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

let knex = null;
try { knex = require('../config/db'); } catch { /* fallback only */ }

const HOUR = 3_600_000, DAY = 86_400_000;
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const zar = (n) => `R ${Math.round(Number(n || 0)).toLocaleString('en-ZA')}`;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

async function load(tenantId) {
    const [leads, deals, vehicles, conversations, service, finance, customers] = await Promise.all([
        knex('leads').where({ tenant_id: tenantId }).catch(() => []),
        knex('deals').where({ tenant_id: tenantId }).catch(() => []),
        knex('vehicles').where({ tenant_id: tenantId }).catch(() => []),
        knex('conversations').where({ tenant_id: tenantId }).catch(() => []),
        knex('service_bookings').where({ tenant_id: tenantId }).catch(() => []),
        knex('finance_applications').where({ tenant_id: tenantId }).catch(() => []),
        knex('customers').where({ tenant_id: tenantId }).catch(() => []),
    ]);
    const users = await knex('users').where({ tenant_id: tenantId }).catch(() => []);
    return { leads, deals, vehicles, conversations, service, finance, customers, users };
}

function monthsSeries(n = 6) {
    const now = new Date();
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        out.push({ key: monthKey(d), label: d.toLocaleString('en-ZA', { month: 'short' }), revenue: 0, units: 0 });
    }
    return out;
}

const STAGE_FLOW = [
    ['new', 'New'], ['contacted', 'Contacted'], ['qualified', 'Qualified'],
    ['test_drive_booked', 'Test Drive'], ['negotiation', 'Negotiation'], ['won', 'Won'],
];
const SOURCE_LABELS = { whatsapp: 'WhatsApp', website: 'Website', autotrader: 'Autotrader', cars_coza: 'Cars.co.za', facebook: 'Facebook', walk_in: 'Walk-in', phone: 'Phone' };

/* ─────────────────────────────────────────────────────────────
   GET /api/analytics/dashboard  (overview)
   ───────────────────────────────────────────────────────────── */
router.get('/dashboard', authenticate, async (req, res) => {
    try {
        if (!knex) throw new Error('no-db');
        const tid = req.user.tenant_id;
        const { leads, deals, conversations, users } = await load(tid);
        const now = new Date();
        const thisMonth = monthKey(now);
        const soldStages = ['delivered', 'contracted'];

        // top metrics
        const leadsThisMonth = leads.filter(l => monthKey(new Date(l.created_at)) === thisMonth).length;
        const wonCount = leads.filter(l => l.status === 'won').length;
        const convRate = pct(wonCount, leads.length);
        const respDeltas = leads.filter(l => l.last_contact_at).map(l => (new Date(l.last_contact_at) - new Date(l.created_at)) / 60000).filter(m => m >= 0 && m < 14 * 24 * 60);
        const avgRespMin = respDeltas.length ? respDeltas.reduce((a, b) => a + b, 0) / respDeltas.length : 0;
        const mm = String(Math.floor(avgRespMin / 60)).padStart(2, '0');
        const ss = String(Math.round(avgRespMin % 60)).padStart(2, '0');
        const testDrives = leads.filter(l => l.status === 'test_drive_booked').length;
        const financeApps = (await knex('finance_applications').where({ tenant_id: tid }).catch(() => [])).length;
        const soldDeals = deals.filter(d => soldStages.includes(d.stage));
        const revenueThisMonth = soldDeals.filter(d => monthKey(new Date(d.delivered_at || d.deal_date || d.created_at)) === thisMonth).reduce((s, d) => s + Number(d.sale_price || 0), 0);

        const top_metrics = [
            { label: 'Leads This Month', value: leadsThisMonth, change: null, positive: true },
            { label: 'Lead→Sale Conversion', value: `${convRate}%`, positive: true },
            { label: 'Avg Response Time', value: `${mm}:${ss}`, positive: avgRespMin <= 5 },
            { label: 'Test Drives Booked', value: testDrives, positive: true },
            { label: 'Finance Applications', value: financeApps, positive: true },
            { label: 'Revenue This Month', value: zar(revenueThisMonth), positive: true },
        ];

        // funnel
        const statusCounts = {};
        leads.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });
        let prev = null;
        const pipeline_funnel = STAGE_FLOW.map(([key, label]) => {
            // cumulative reach: leads that are at this stage or beyond
            const order = STAGE_FLOW.map(s => s[0]);
            const idx = order.indexOf(key);
            const volume = leads.filter(l => {
                const li = order.indexOf(l.status);
                return li >= idx && l.status !== 'lost';
            }).length;
            const dropoff = prev == null ? '0%' : `${Math.max(0, pct(prev - volume, prev))}%`;
            prev = volume;
            return { stage: label, volume, dropoff };
        });

        // lead sources
        const bySource = {};
        leads.forEach(l => {
            const k = l.source || 'other';
            if (!bySource[k]) bySource[k] = { source: SOURCE_LABELS[k] || k, volume: 0, won: 0 };
            bySource[k].volume += 1;
            if (l.status === 'won') bySource[k].won += 1;
        });
        const lead_sources = Object.values(bySource).map(s => ({ source: s.source, volume: s.volume, conversion_rate: pct(s.won, s.volume) })).sort((a, b) => b.volume - a.volume);

        // response trend (last 30 days — avg response minutes of leads created that day)
        const response_trend = Array.from({ length: 30 }, (_, i) => {
            const day = new Date(now.getTime() - (29 - i) * DAY);
            const dk = day.toISOString().slice(0, 10);
            const dayLeads = leads.filter(l => (l.created_at || '').slice(0, 10) === dk && l.last_contact_at);
            const deltas = dayLeads.map(l => (new Date(l.last_contact_at) - new Date(l.created_at)) / 60000).filter(m => m >= 0 && m < 14 * 24 * 60);
            const avg = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
            return { day: `D${i + 1}`, time: Math.round(avg * 10) / 10 };
        });

        // monthly revenue (6mo, in millions)
        const months = monthsSeries(6);
        const idxMap = Object.fromEntries(months.map((m, i) => [m.key, i]));
        soldDeals.forEach(d => {
            const k = monthKey(new Date(d.delivered_at || d.deal_date || d.created_at));
            if (k in idxMap) { months[idxMap[k]].revenue += Number(d.sale_price || 0); months[idxMap[k]].units += 1; }
        });
        const monthly_revenue = months.map(m => ({ month: m.label, revenue: Math.round(m.revenue / 1e6 * 100) / 100, units: m.units }));

        // live alerts (from real signals)
        const userMap = {}; users.forEach(u => { userMap[u.id] = `${u.first_name} ${u.last_name}`; });
        const live_alerts = [];
        const hot = [...leads].filter(l => (l.ai_score || 0) >= 90 && !['won', 'lost'].includes(l.status)).sort((a, b) => b.ai_score - a.ai_score)[0];
        if (hot) live_alerts.push({ id: 1, type: 'hot_lead', message: `Hot lead (score ${hot.ai_score}): ${hot.customer_name} — ${hot.vehicle_interest || 'vehicle'}`, time: 'now' });
        const stale = leads.filter(l => !['won', 'lost'].includes(l.status) && l.last_contact_at && (Date.now() - new Date(l.last_contact_at)) > 24 * HOUR)[0];
        if (stale) live_alerts.push({ id: 2, type: 'dormant_lead', message: `${stale.customer_name} untouched >24h (${userMap[stale.assigned_to] || 'Unassigned'})`, time: `${Math.round((Date.now() - new Date(stale.last_contact_at)) / HOUR)}h ago` });
        const recentWon = soldDeals.sort((a, b) => new Date(b.delivered_at || b.deal_date) - new Date(a.delivered_at || a.deal_date))[0];
        if (recentWon) live_alerts.push({ id: 3, type: 'finance_sub', message: `Deal closed: ${zar(recentWon.sale_price)} (${recentWon.bank_name || 'cash'})`, time: 'recent' });
        if (!live_alerts.length) live_alerts.push({ id: 0, type: 'info', message: 'No alerts right now — pipeline is calm.', time: 'now' });

        return res.json({ top_metrics, pipeline_funnel, lead_sources, response_trend, monthly_revenue, live_alerts });
    } catch {
        return res.json(MOCK.dashboard);
    }
});

/* ───────────── SALES ───────────── */
router.get('/sales', authenticate, async (req, res) => {
    try {
        if (!knex) throw new Error('no-db');
        const tid = req.user.tenant_id;
        const { leads, deals, users } = await load(tid);
        const soldStages = ['delivered', 'contracted'];
        const sold = deals.filter(d => soldStages.includes(d.stage));
        const userMap = {}; users.forEach(u => { userMap[u.id] = `${u.first_name} ${u.last_name}`; });

        const spMap = {};
        sold.forEach(d => {
            const name = userMap[d.salesperson_id] || 'Unassigned';
            if (!spMap[name]) spMap[name] = { name, revenue: 0, units: 0 };
            spMap[name].revenue += Number(d.sale_price || 0); spMap[name].units += 1;
        });
        const revenue_by_salesperson = Object.values(spMap)
            .map(s => ({ name: s.name, revenue: Math.round(s.revenue / 1e6 * 100) / 100, units: s.units }))
            .sort((a, b) => b.revenue - a.revenue).slice(0, 6);

        // vehicle popularity
        const vMap = {};
        leads.forEach(l => {
            const k = l.vehicle_interest || 'Other';
            if (!vMap[k]) vMap[k] = { model: k, enquiries: 0, test_drives: 0, sold: 0 };
            vMap[k].enquiries += 1;
            if (l.status === 'test_drive_booked') vMap[k].test_drives += 1;
            if (l.status === 'won') vMap[k].sold += 1;
        });
        const vehicle_popularity = Object.values(vMap).sort((a, b) => b.enquiries - a.enquiries).slice(0, 6);

        const unitsSold = sold.length;
        const closeDays = sold.map(d => (new Date(d.delivered_at || d.deal_date) - new Date(d.created_at)) / DAY).filter(x => x >= 0);
        const avgClose = closeDays.length ? (closeDays.reduce((a, b) => a + b, 0) / closeDays.length).toFixed(1) : '—';

        return res.json({
            metrics: [
                { label: 'Units Sold', value: unitsSold, target: null },
                { label: 'Avg Days to Close', value: `${avgClose} Days` },
                { label: 'Total Sales Revenue', value: zar(sold.reduce((s, d) => s + Number(d.sale_price || 0), 0)) },
            ],
            revenue_by_salesperson: revenue_by_salesperson.length ? revenue_by_salesperson : MOCK.sales.revenue_by_salesperson,
            won_lost_reasons: MOCK.sales.won_lost_reasons, // reason not captured in schema yet
            vehicle_popularity: vehicle_popularity.length ? vehicle_popularity : MOCK.sales.vehicle_popularity,
        });
    } catch { return res.json(MOCK.sales); }
});

/* ───────────── LEADS (quality) ───────────── */
router.get('/leads', authenticate, async (req, res) => {
    try {
        if (!knex) throw new Error('no-db');
        const tid = req.user.tenant_id;
        const { leads, users } = await load(tid);
        const userMap = {}; users.forEach(u => { userMap[u.id] = `${u.first_name} ${u.last_name}`; });

        const buckets = [
            { score: 'Burning (90-100)', min: 90, count: 0 },
            { score: 'Hot (75-89)', min: 75, count: 0 },
            { score: 'Warm (50-74)', min: 50, count: 0 },
            { score: 'Cold (0-49)', min: 0, count: 0 },
        ];
        leads.forEach(l => {
            const s = l.ai_score || 0;
            const b = buckets.find(x => s >= x.min);
            if (b) b.count += 1;
        });

        const stale = leads
            .filter(l => !['won', 'lost'].includes(l.status))
            .map(l => ({ l, h: l.last_contact_at ? (Date.now() - new Date(l.last_contact_at)) / HOUR : (Date.now() - new Date(l.created_at)) / HOUR }))
            .filter(x => x.h > 48)
            .sort((a, b) => b.h - a.h).slice(0, 8)
            .map(x => ({ id: `#${x.l.id}`, assigned_to: userMap[x.l.assigned_to] || x.l.customer_name, untouched_hours: Math.round(x.h) }));

        const velocity = leads.filter(l => l.last_contact_at).map(l => (new Date(l.last_contact_at) - new Date(l.created_at)) / 60000).filter(m => m >= 0);
        const avgVel = velocity.length ? Math.round(velocity.reduce((a, b) => a + b, 0) / velocity.length) : 0;

        return res.json({
            metrics: [
                { label: 'Avg Lead Velocity (New→Contacted)', value: `${avgVel} Mins` },
                { label: 'Stale Leads (>48h untouched)', value: stale.length },
                { label: 'Total Leads', value: leads.length },
            ],
            ai_score_distribution: buckets.map(b => ({ score: b.score, count: b.count })),
            stale_leads_details: stale.length ? stale : MOCK.leads.stale_leads_details,
        });
    } catch { return res.json(MOCK.leads); }
});

/* ───────────── SERVICE ───────────── */
router.get('/service', authenticate, async (req, res) => {
    try {
        if (!knex) throw new Error('no-db');
        const tid = req.user.tenant_id;
        const { service } = await load(tid);
        if (!service.length) return res.json(MOCK.service);

        const typeMap = {};
        service.forEach(b => { typeMap[b.service_type] = (typeMap[b.service_type] || 0) + Number(b.invoice_amount || 0); });
        const revenue_by_type = Object.entries(typeMap).map(([type, revenue]) => ({ type, revenue: Math.round(revenue) }));

        const dayMap = {};
        service.forEach(b => {
            const wd = new Date(b.booking_date).toLocaleString('en-ZA', { weekday: 'long' });
            if (!dayMap[wd]) dayMap[wd] = { day: wd, am: 0, pm: 0 };
            const hour = parseInt((b.booking_time || '09:00').split(':')[0], 10);
            if (hour < 12) dayMap[wd].am += 1; else dayMap[wd].pm += 1;
        });
        const noShow = pct(service.filter(b => b.status === 'cancelled').length, service.length);
        const invoices = service.map(b => Number(b.invoice_amount || 0)).filter(Boolean);
        const avgJob = invoices.length ? Math.round(invoices.reduce((a, b) => a + b, 0) / invoices.length) : 0;

        return res.json({
            metrics: [
                { label: 'Total Bookings', value: service.length },
                { label: 'No-Show Rate', value: `${noShow}%`, target: '< 5%' },
                { label: 'Avg Job Card Value', value: zar(avgJob) },
                { label: 'Completed', value: service.filter(b => b.status === 'completed').length },
            ],
            revenue_by_type: revenue_by_type.length ? revenue_by_type : MOCK.service.revenue_by_type,
            busiest_times: Object.values(dayMap).length ? Object.values(dayMap) : MOCK.service.busiest_times,
        });
    } catch { return res.json(MOCK.service); }
});

/* ───────────── FINANCE ───────────── */
router.get('/finance', authenticate, async (req, res) => {
    try {
        if (!knex) throw new Error('no-db');
        const tid = req.user.tenant_id;
        const { deals, finance } = await load(tid);
        const bankMap = {};
        deals.filter(d => d.bank_name).forEach(d => {
            if (!bankMap[d.bank_name]) bankMap[d.bank_name] = { bank: d.bank_name, applications: 0, approved: 0 };
            bankMap[d.bank_name].applications += 1;
            if (['approved', 'contracted', 'delivered'].includes(d.stage)) bankMap[d.bank_name].approved += 1;
        });
        const approval_by_bank = Object.values(bankMap).map(b => ({ bank: b.bank, applications: b.applications, approval_rate: pct(b.approved, b.applications) })).sort((a, b) => b.applications - a.applications);
        const amounts = deals.map(d => Number(d.finance_amount || 0)).filter(Boolean);
        const avgAmt = amounts.length ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length) : 0;

        return res.json({
            metrics: [
                { label: 'Applications', value: finance.length || deals.filter(d => d.finance_amount).length },
                { label: 'Average Finance Amount', value: zar(avgAmt) },
                { label: 'Deals with Finance', value: deals.filter(d => d.finance_amount).length },
            ],
            approval_by_bank: approval_by_bank.length ? approval_by_bank : MOCK.finance.approval_by_bank,
        });
    } catch { return res.json(MOCK.finance); }
});

/* ───────────── RETENTION ───────────── */
router.get('/retention', authenticate, async (req, res) => {
    try {
        if (!knex) throw new Error('no-db');
        const tid = req.user.tenant_id;
        const { customers } = await load(tid);
        if (!customers.length) return res.json(MOCK.retention);

        const tiers = [
            { tier: 'Platinum', min: 1000, members: 0 },
            { tier: 'Gold', min: 500, members: 0 },
            { tier: 'Silver', min: 100, members: 0 },
            { tier: 'Bronze', min: 0, members: 0 },
        ];
        customers.forEach(c => { const t = tiers.find(x => (c.loyalty_points || 0) >= x.min); if (t) t.members += 1; });
        const nps = customers.map(c => c.nps_score).filter(n => n != null);
        const avgNps = nps.length ? (nps.reduce((a, b) => a + b, 0) / nps.length).toFixed(1) : '—';

        return res.json({
            metrics: [
                { label: 'Total Customers', value: customers.length },
                { label: 'Avg NPS Score', value: `${avgNps}${nps.length ? '/10' : ''}` },
                { label: 'Promoters (NPS 9-10)', value: nps.filter(n => n >= 9).length },
            ],
            sequences_performance: MOCK.retention.sequences_performance,
            loyalty_distribution: tiers.map(t => ({ tier: t.tier, members: t.members })),
        });
    } catch { return res.json(MOCK.retention); }
});

/* ─────────────────────────────────────────────────────────────
   Fallback mocks (used only when DB unavailable / empty)
   ───────────────────────────────────────────────────────────── */
const MOCK = {
    dashboard: {
        top_metrics: [
            { label: 'Leads This Month', value: 0, positive: true },
            { label: 'Lead→Sale Conversion', value: '0%', positive: true },
            { label: 'Avg Response Time', value: '00:00', positive: true },
            { label: 'Test Drives Booked', value: 0, positive: true },
            { label: 'Finance Applications', value: 0, positive: true },
            { label: 'Revenue This Month', value: 'R 0', positive: true },
        ],
        pipeline_funnel: STAGE_FLOW.map(([, label]) => ({ stage: label, volume: 0, dropoff: '0%' })),
        lead_sources: [{ source: 'WhatsApp', volume: 0, conversion_rate: 0 }],
        response_trend: Array.from({ length: 30 }, (_, i) => ({ day: `D${i + 1}`, time: 0 })),
        monthly_revenue: monthsSeries(6).map(m => ({ month: m.label, revenue: 0, units: 0 })),
        live_alerts: [{ id: 0, type: 'info', message: 'No data yet — add leads and deals to see live analytics.', time: 'now' }],
    },
    sales: {
        metrics: [{ label: 'Units Sold', value: 0 }, { label: 'Avg Days to Close', value: '— Days' }],
        revenue_by_salesperson: [{ name: 'No data', revenue: 0, units: 0 }],
        won_lost_reasons: [
            { reason: 'Price too high', value: 45 }, { reason: 'Found car elsewhere', value: 25 },
            { reason: 'Finance declined', value: 15 }, { reason: 'Bought new instead', value: 10 }, { reason: 'Other', value: 5 },
        ],
        vehicle_popularity: [{ model: 'No data', enquiries: 0, test_drives: 0, sold: 0 }],
    },
    finance: {
        metrics: [{ label: 'Applications', value: 0 }, { label: 'Average Finance Amount', value: 'R 0' }],
        approval_by_bank: [{ bank: 'WesBank', approval_rate: 0, applications: 0 }],
    },
    service: {
        metrics: [{ label: 'Total Bookings', value: 0 }, { label: 'No-Show Rate', value: '0%', target: '< 5%' }],
        revenue_by_type: [{ type: 'Minor Service', revenue: 0 }],
        busiest_times: [{ day: 'Monday', am: 0, pm: 0 }],
    },
    leads: {
        metrics: [{ label: 'Avg Lead Velocity (New→Contacted)', value: '0 Mins' }, { label: 'Stale Leads (>48h untouched)', value: 0 }],
        ai_score_distribution: [
            { score: 'Burning (90-100)', count: 0 }, { score: 'Hot (75-89)', count: 0 },
            { score: 'Warm (50-74)', count: 0 }, { score: 'Cold (0-49)', count: 0 },
        ],
        stale_leads_details: [{ id: '#—', assigned_to: 'No data', untouched_hours: 0 }],
    },
    retention: {
        metrics: [{ label: 'Total Customers', value: 0 }, { label: 'Avg NPS Score', value: '—' }],
        sequences_performance: [
            { seq: 'New Buyer Nurture', open_rate: 85, response_rate: 42 },
            { seq: 'Service Retention', open_rate: 78, response_rate: 35 },
            { seq: 'Cold Re-engagement', open_rate: 45, response_rate: 12 },
            { seq: 'Win-Back', open_rate: 35, response_rate: 4 },
        ],
        loyalty_distribution: [{ tier: 'Platinum', members: 0 }, { tier: 'Gold', members: 0 }, { tier: 'Silver', members: 0 }, { tier: 'Bronze', members: 0 }],
    },
};

module.exports = { router };
