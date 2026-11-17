/**
 * Online deals (staff side) — KenganAuto
 * Deals that customers structured and reserved themselves on the dealer website.
 *
 *   GET   /api/online-deals            list with vehicle + customer
 *   PATCH /api/online-deals/:id        { status } reserved → docs_pending → approved → completed | cancelled
 *                                      cancelling releases the car back into stock
 */

'use strict';

const express = require('express');
const knex = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { safeJson } = require('../services/feedback_ai');

const router = express.Router();
const FLOW = ['reserved', 'docs_pending', 'approved', 'completed', 'cancelled'];

router.get('/', authenticate, async (req, res) => {
    try {
        const rows = await knex('online_deals as o')
            .leftJoin('vehicles as v', 'v.id', 'o.vehicle_id')
            .leftJoin('leads as l', 'l.id', 'o.lead_id')
            .where({ 'o.tenant_id': req.user.tenant_id })
            .orderBy('o.created_at', 'desc').limit(100)
            .select('o.*', 'v.year', 'v.make', 'v.model', 'v.variant', 'v.images', 'v.stock_number',
                'l.customer_name', 'l.customer_phone', 'l.customer_email', 'l.first_response_at', 'l.created_at as lead_created_at');
        res.json(rows.map((r) => ({ ...r, image: safeJson(r.images, [])[0] || null, images: undefined })));
    } catch (e) {
        console.error('[online-deals]', e);
        res.status(500).json({ error: 'Failed to load online deals' });
    }
});

router.patch('/:id', authenticate, async (req, res) => {
    const { status } = req.body || {};
    if (!FLOW.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const row = await knex('online_deals').where({ id: Number(req.params.id), tenant_id: req.user.tenant_id }).first();
    if (!row) return res.status(404).json({ error: 'Online deal not found' });
    const now = new Date().toISOString();
    await knex.transaction(async (trx) => {
        await trx('online_deals').where({ id: row.id }).update({ status, updated_at: now });
        if (status === 'cancelled') {
            await trx('vehicles').where({ id: row.vehicle_id, status: 'reserved' }).update({ status: 'available', updated_at: now });
            if (row.lead_id) await trx('leads').where({ id: row.lead_id }).update({ status: 'lost', updated_at: now });
        }
        if (status === 'approved' && row.deal_id) await trx('deals').where({ id: row.deal_id }).update({ stage: 'approved', updated_at: now });
        if (status === 'completed') {
            await trx('vehicles').where({ id: row.vehicle_id }).update({ status: 'sold', updated_at: now });
            if (row.deal_id) await trx('deals').where({ id: row.deal_id }).update({ stage: 'delivered', delivered_at: now, updated_at: now });
            if (row.lead_id) await trx('leads').where({ id: row.lead_id }).update({ status: 'won', updated_at: now });
        }
    });
    res.json({ ok: true, status });
});

module.exports = { router };
