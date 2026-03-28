/**
 * Trade-Ins Router — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * Endpoints to manage trade-in valuations and offers.
 */

'use strict';

const express = require('express');
const router = express.Router();
const TradeIn = require('../models/TradeIn');
const Lead = require('../models/Lead');
const { authenticate } = require('../middleware/auth');
const whatsappSvc = require('../services/whatsapp_service');
const tradeInSvc = require('../services/trade_in_service');

/* ── Helper to gracefully handle missing DBs in demo mode ── */
async function tryDB(dbCall, mockCall) {
    try {
        if (!TradeIn) return mockCall();
        const res = await dbCall();
        return res || mockCall();
    } catch (e) {
        return mockCall();
    }
}

let mockTradeIns = [];

/* GET /api/trade-ins  — List all trade-ins for tenant */
router.get('/', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { status } = req.query;

    const tradeIns = await tryDB(
        async () => {
            let q = TradeIn.query()
                .withGraphFetched('lead')
                .where({ tenant_id: tenantId })
                .orderBy('created_at', 'desc');
            if (status) q = q.where({ status });
            return await q;
        },
        () => {
            let list = mockTradeIns.filter(t => t.tenant_id === tenantId);
            if (status) list = list.filter(t => t.status === status);
            return list;
        }
    );

    return res.json(tradeIns);
});

/* GET /api/trade-ins/:id  — Get detail */
router.get('/:id', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const tradeIn = await tryDB(
        () => TradeIn.query().withGraphFetched('lead').findById(id).where({ tenant_id: tenantId }),
        () => mockTradeIns.find(t => t.id === Number(id) && t.tenant_id === tenantId)
    );

    if (!tradeIn) return res.status(404).json({ error: 'Trade-In not found' });
    return res.json(tradeIn);
});


/* POST /api/trade-ins  — Create new (e.g. from chatbot) */
router.post('/', async (req, res) => {
    // Accessible anonymously for webhook/chatbot or authed
    const tenantId = req.user ? req.user.tenant_id : (Number(req.body.tenant_id) || 1);
    const { lead_id, year, make, model, mileage, condition, accident_damage, colour, photos } = req.body;

    if (!year || !make || !model) {
        return res.status(400).json({ error: 'Year, make, and model are required.' });
    }

    // Auto calculate initial range
    const estimate = await tradeInSvc.calculateTradeInRange({ year, make, model, mileage, condition, accidentDamage: accident_damage, vin: req.body.vin });

    const newTradeIn = await tryDB(
        () => TradeIn.query().insertAndFetch({
            tenant_id: tenantId,
            lead_id: lead_id || null,
            year: Number(year),
            make,
            model,
            mileage: Number(mileage) || null,
            condition: condition || 'good',
            colour,
            estimated_value: estimate.baseValue,
            status: 'enquiry',
            photos: photos ? JSON.stringify(photos) : '[]',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }),
        () => {
            const t = {
                id: Date.now(),
                tenant_id: tenantId,
                lead_id, year, make, model, mileage, condition, colour,
                estimated_value: estimate.baseValue,
                status: 'enquiry',
                photos: photos || [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            mockTradeIns.push(t);
            return t;
        }
    );

    return res.status(201).json({ ok: true, trade_in: newTradeIn, estimate });
});

/* PATCH /api/trade-ins/:id  — Update offer & status */
router.patch('/:id', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { dealer_offer, status, send_whatsapp } = req.body;

    const existing = await tryDB(
        () => TradeIn.query().withGraphFetched('lead').findById(id).where({ tenant_id: tenantId }),
        () => mockTradeIns.find(t => t.id === Number(id) && t.tenant_id === tenantId)
    );

    if (!existing) return res.status(404).json({ error: 'Trade-In not found' });

    let updated;
    const patchData = { updated_at: new Date().toISOString() };
    if (dealer_offer !== undefined) patchData.dealer_offer = Number(dealer_offer);
    if (status !== undefined) patchData.status = status;

    updated = await tryDB(
        () => TradeIn.query().patchAndFetchById(id, patchData).where({ tenant_id: tenantId }),
        () => {
            Object.assign(existing, patchData);
            return existing;
        }
    );

    // If requested, send WhatsApp offer immediately
    if (send_whatsapp && updated.dealer_offer && existing.lead?.customer_phone) {
        try {
            const makeModel = `${updated.year} ${updated.make} ${updated.model}`;
            const amount = `R${updated.dealer_offer.toLocaleString('en-ZA')}`;
            const text = `Great news! We can offer you *${amount}* for your ${makeModel}. Would you like to use this as a deposit towards a new vehicle?`;
            await whatsappSvc.sendText(tenantId, existing.lead.customer_phone, text, { priority: true });

            // Log in Conversation if active? Usually we just rely on whatsappSvc inside.
        } catch (err) {
            console.error('Failed to send WhatsApp offer:', err);
        }
    }

    return res.json({ ok: true, trade_in: updated });
});

module.exports = router;
