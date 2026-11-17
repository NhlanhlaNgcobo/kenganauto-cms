/**
 * Dashboard Router — KenganAuto OS
 * ─────────────────────────────────────────────────────────────
 * Live, per-tenant overview for the home screen. Replaces the old
 * hardcoded `/api/dashboard/stats` route that lived in app.js.
 *
 * GET /api/dashboard/overview  → stat cards, revenue trend, inventory
 *                                mix, leads needing attention, AI focus
 * GET /api/dashboard/stats     → lightweight summary (back-compat)
 *
 * Every query degrades gracefully: if the DB/tables are unavailable, or
 * the tenant is the demo sandbox (9999), we compute the same shape from
 * the demo seeder so the UI never breaks.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const demo = require('./demo_seeder');

/* Knex instance — guarded so the module still loads before migrations. */
let knex = null;
try { knex = require('../config/db'); } catch { /* DB not ready — fallback only */ }

/* ── Small helpers ───────────────────────────────────────────── */
const ACTIVE_STATUSES = ['new', 'contacted', 'qualified', 'test_drive_booked', 'negotiation'];
const SOLD_STAGES = ['delivered', 'contracted'];

function hoursAgo(iso) {
    if (!iso) return Infinity;
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? Infinity : (Date.now() - t) / 3_600_000;
}

function isOverdue(lead) {
    if (['won', 'lost'].includes(lead.status)) return false;
    if (!lead.last_contact_at && lead.status === 'new') return hoursAgo(lead.created_at) > 24;
    return hoursAgo(lead.last_contact_at) > 24;
}

function monthKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function pctChange(current, previous) {
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}

/* ── Pure aggregation — the single source of truth for the shape ── */
function computeOverview({ leads = [], vehicles = [], deals = [], conversations = [] }) {
    const now = new Date();
    const thisMonth = monthKey(now);
    const weekAgo = Date.now() - 7 * 24 * 3_600_000;
    const twoWeeksAgo = Date.now() - 14 * 24 * 3_600_000;

    /* Leads */
    const activeLeads = leads.filter(l => ACTIVE_STATUSES.includes(l.status));
    const newThisWeek = leads.filter(l => new Date(l.created_at).getTime() >= weekAgo).length;
    const newPrevWeek = leads.filter(l => {
        const t = new Date(l.created_at).getTime();
        return t >= twoWeeksAgo && t < weekAgo;
    }).length;
    const overdueLeads = leads.filter(isOverdue);

    /* Deals / revenue */
    const dealDate = d => d.delivered_at || d.deal_date || d.created_at;
    const soldDeals = deals.filter(d => SOLD_STAGES.includes(d.stage));
    const soldThisMonth = soldDeals.filter(d => monthKey(new Date(dealDate(d))) === thisMonth);
    const revenueThisMonth = soldThisMonth.reduce((s, d) => s + Number(d.sale_price || 0), 0);
    const pipelineValue = deals
        .filter(d => !SOLD_STAGES.includes(d.stage) && d.stage !== 'lost')
        .reduce((s, d) => s + Number(d.sale_price || 0), 0);

    /* 6-month revenue trend */
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ key: monthKey(d), label: d.toLocaleString('en-ZA', { month: 'short' }), revenue: 0, units: 0 });
    }
    const monthIndex = Object.fromEntries(months.map((m, i) => [m.key, i]));
    soldDeals.forEach(d => {
        const k = monthKey(new Date(dealDate(d)));
        if (k in monthIndex) {
            months[monthIndex[k]].revenue += Number(d.sale_price || 0);
            months[monthIndex[k]].units += 1;
        }
    });

    /* AI resolution — share of chatbot conversations with positive sentiment */
    const scored = conversations.filter(c => c.sentiment_score != null);
    const resolved = scored.filter(c => Number(c.sentiment_score) >= 0.5).length;
    const aiResolution = scored.length ? Math.round((resolved / scored.length) * 100) : null;

    /* ── Speed to lead ──────────────────────────────────────────
       The single biggest conversion lever in the research: how fast
       a new enquiry gets its first human/AI response. Approximated as
       (first response − created) for leads from the last 30 days. */
    const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
    const responseDeltas = leads
        .filter(l => (l.first_response_at || l.last_contact_at) && l.created_at && new Date(l.created_at).getTime() >= monthAgo)
        .map(l => (new Date(l.first_response_at || l.last_contact_at).getTime() - new Date(l.created_at).getTime()) / 60000)
        .filter(m => m >= 0 && m < 60 * 24 * 14); // ignore absurd/negative values
    const respArr = responseDeltas;
    const avgMinutes = respArr.length ? Math.round(respArr.reduce((a, b) => a + b, 0) / respArr.length) : null;
    const sortedResp = [...respArr].sort((a, b) => a - b);
    const medianMinutes = sortedResp.length ? Math.round(sortedResp[Math.floor(sortedResp.length / 2)]) : null;
    const under5 = respArr.filter(m => m <= 5).length;
    const under5Pct = respArr.length ? Math.round((under5 / respArr.length) * 100) : null;

    /* Follow-ups due now: overdue active leads need contact today */
    const followupsDue = overdueLeads.length;

    /* ── Lead source performance (volume + win conversion) ────── */
    const SOURCE_LABELS = {
        whatsapp: 'WhatsApp', website: 'Website', autotrader: 'AutoTrader',
        cars_coza: 'Cars.co.za', facebook: 'Facebook', walk_in: 'Walk-in', phone: 'Phone',
    };
    const bySource = {};
    leads.forEach(l => {
        const key = l.source || 'other';
        if (!bySource[key]) bySource[key] = { source: SOURCE_LABELS[key] || key, leads: 0, won: 0 };
        bySource[key].leads += 1;
        if (l.status === 'won') bySource[key].won += 1;
    });
    const sourcePerformance = Object.values(bySource)
        .map(s => ({ ...s, conversion_pct: s.leads ? Math.round((s.won / s.leads) * 100) : 0 }))
        .sort((a, b) => b.leads - a.leads);

    /* Inventory mix by condition (always available in schema) */
    const available = vehicles.filter(v => v.status !== 'sold');
    const mixMap = {};
    available.forEach(v => {
        const key = (v.condition || 'used');
        mixMap[key] = (mixMap[key] || 0) + 1;
    });
    const CONDITION_LABELS = { new: 'New', demo: 'Demo', used: 'Pre-owned' };
    const inventoryMix = Object.entries(mixMap)
        .map(([k, v]) => ({ name: CONDITION_LABELS[k] || k, value: v }))
        .sort((a, b) => b.value - a.value);

    /* Leads needing attention — overdue first, then hottest */
    const attention = [...activeLeads]
        .map(l => ({ ...l, overdue: isOverdue(l) }))
        .sort((a, b) => (b.overdue - a.overdue) || ((b.ai_score || 0) - (a.ai_score || 0)))
        .slice(0, 5)
        .map(l => ({
            id: l.id,
            name: l.customer_name,
            vehicle: l.vehicle_interest || 'No vehicle specified',
            status: l.status,
            ai_score: l.ai_score ?? 0,
            value: l.budget_max ? Number(l.budget_max) : null,
            overdue: l.overdue,
        }));

    /* AI focus — data-driven next moves */
    const aiFocus = [];
    const topOverdue = overdueLeads.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0))[0];
    if (topOverdue) {
        aiFocus.push(`Follow up with ${topOverdue.customer_name} on the ${topOverdue.vehicle_interest || 'vehicle'} enquiry — no contact in over 24h.`);
    }
    if (overdueLeads.length > 1) {
        aiFocus.push(`${overdueLeads.length} leads are overdue for a follow-up. Clearing them today protects your conversion rate.`);
    }
    const agingStock = available
        .filter(v => (v.days_in_stock || 0) > 60)
        .sort((a, b) => (b.days_in_stock || 0) - (a.days_in_stock || 0))[0];
    if (agingStock) {
        aiFocus.push(`${agingStock.make} ${agingStock.model} has been in stock ${agingStock.days_in_stock} days — consider a price review or campaign.`);
    }
    if (pipelineValue > 0) {
        aiFocus.push(`R ${(pipelineValue / 1_000_000).toFixed(2)}M in deals is still open in the pipeline. Prioritise the negotiation-stage deals.`);
    }
    if (!aiFocus.length) {
        aiFocus.push('Pipeline is healthy — no overdue leads right now. Keep capturing new enquiries.');
    }

    return {
        generated_at: new Date().toISOString(),
        stat_cards: [
            {
                key: 'active_leads',
                label: 'Active leads',
                value: activeLeads.length,
                subtext: `${newThisWeek} new this week`,
                trend: pctChange(newThisWeek, newPrevWeek),
            },
            {
                key: 'vehicles_sold',
                label: 'Vehicles sold',
                value: soldThisMonth.length,
                subtext: 'Closed this month',
                trend: pctChange(soldThisMonth.length, months[4]?.units || 0),
            },
            {
                key: 'monthly_revenue',
                label: 'Monthly revenue',
                value: revenueThisMonth,
                format: 'zar',
                subtext: 'Booked this month',
                trend: pctChange(revenueThisMonth, months[4]?.revenue || 0),
            },
            {
                key: 'ai_resolution',
                label: 'AI resolution',
                value: aiResolution,
                format: 'percent',
                subtext: aiResolution == null ? 'No chats yet' : 'Positive chat sentiment',
                trend: 0,
            },
        ],
        revenue_trend: months.map(({ label, revenue, units }) => ({ month: label, revenue, units })),
        inventory_mix: inventoryMix,
        inventory_total: available.length,
        pipeline_value: pipelineValue,
        leads_attention: attention,
        ai_focus: aiFocus.slice(0, 3),
        speed_to_lead: {
            avg_minutes: avgMinutes,
            median_minutes: medianMinutes,
            under_5min_pct: under5Pct,
            target_minutes: 5,
            responded: respArr.length,
            followups_due: followupsDue,
        },
        source_performance: sourcePerformance,
        totals: {
            leads: leads.length,
            active_leads: activeLeads.length,
            overdue_leads: overdueLeads.length,
            vehicles_available: available.length,
        },
    };
}

/* ── Fallback data (no DB, or demo sandbox) ──────────────────── */
function fallbackData(tenantId) {
    const leads = demo.getDemoLeads(tenantId).map(l => ({
        ...l,
        created_at: l.created_at || new Date().toISOString(),
    }));
    const vehicles = demo.getDemoStock(tenantId).map(v => ({ ...v, condition: v.condition || 'used' }));
    // Synthesise deals from won leads so revenue/trend have something to show.
    const now = Date.now();
    const deals = leads
        .filter(l => l.status === 'won')
        .map((l, i) => ({
            stage: 'delivered',
            sale_price: l.budget_max || 650000 + i * 40000,
            delivered_at: new Date(now - i * 20 * 24 * 3_600_000).toISOString(),
        }));
    const conversations = leads.slice(0, 8).map(l => ({ sentiment_score: (l.ai_score || 50) / 100 }));
    return { leads, vehicles, deals, conversations };
}

async function loadFromDB(tenantId) {
    const [leads, vehicles, deals, conversations] = await Promise.all([
        knex('leads').where({ tenant_id: tenantId }),
        knex('vehicles').where({ tenant_id: tenantId }),
        knex('deals').where({ tenant_id: tenantId }).catch(() => []),
        knex('conversations').where({ tenant_id: tenantId }).catch(() => []),
    ]);
    return { leads, vehicles, deals, conversations };
}

/* ─────────────────────────────────────────────────────────────
   GET /api/dashboard/overview
   ───────────────────────────────────────────────────────────── */
router.get('/overview', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;

    let data;
    if (!knex || tenantId === 9999) {
        data = fallbackData(tenantId);
    } else {
        try {
            data = await loadFromDB(tenantId);
            // A brand-new tenant with no data at all still gets a valid (zeroed) overview.
        } catch {
            data = fallbackData(tenantId);
        }
    }

    try {
        return res.json(computeOverview(data));
    } catch (err) {
        return res.status(500).json({ error: 'Failed to build dashboard overview.', detail: err.message });
    }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/dashboard/stats  — back-compat lightweight summary
   ───────────────────────────────────────────────────────────── */
router.get('/stats', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    let data;
    if (!knex || tenantId === 9999) data = fallbackData(tenantId);
    else { try { data = await loadFromDB(tenantId); } catch { data = fallbackData(tenantId); } }

    const o = computeOverview(data);
    return res.json({
        leads: o.totals.active_leads,
        vehicles_available: o.totals.vehicles_available,
        monthly_revenue: o.stat_cards.find(c => c.key === 'monthly_revenue')?.value || 0,
        ai_resolution: o.stat_cards.find(c => c.key === 'ai_resolution')?.value,
        overdue_leads: o.totals.overdue_leads,
    });
});

module.exports = { router, computeOverview };
