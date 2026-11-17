/**
 * Showroom Router — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * 1. "Silent Salesman" QR codes (parity with CMS Stock Management):
 *    each stock unit gets a signed, non-guessable public link. Customers on the
 *    floor scan it, see the vehicle, and request a test drive / callback, which
 *    lands in the lead pipeline instantly.
 * 2. AI listing copy for stock units (cf. Auto Trader UK Co-Driver).
 *
 *   GET  /api/showroom/qr/:vehicleId                (auth)  → { token, url }
 *   POST /api/showroom/ai-description/:vehicleId    (auth)  → { text, engine }
 *   GET  /api/showroom/public/:token                (public) → vehicle card
 *   POST /api/showroom/public/:token/enquiry        (public, rate-limited) → lead
 */

'use strict';

const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const knex = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateListingCopy, safeJson } = require('../services/feedback_ai');
const notificationSvc = require('../services/notification_service');

const SECRET = process.env.QR_SECRET || process.env.JWT_SECRET || 'kengan_auto_dev_secret_change_in_prod';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

function sign(tenantId, vehicleId) {
    const body = `${tenantId}.${vehicleId}`;
    const mac = crypto.createHmac('sha256', SECRET).update(body).digest('base64url').slice(0, 16);
    return `${body}.${mac}`;
}

function verify(token) {
    const m = /^(\d+)\.(\d+)\.([A-Za-z0-9_-]{16})$/.exec(String(token || ''));
    if (!m) return null;
    const expected = sign(Number(m[1]), Number(m[2]));
    const a = Buffer.from(expected);
    const b = Buffer.from(String(token));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return { tenantId: Number(m[1]), vehicleId: Number(m[2]) };
}

const publicVehicle = (v, tenant) => ({
    id: v.id,
    make: v.make,
    model: v.model,
    year: v.year,
    variant: v.variant,
    colour: v.colour,
    mileage: v.mileage,
    price: v.price,
    condition: v.condition,
    stock_number: v.stock_number,
    status: v.status,
    images: safeJson(v.images, []),
    features: safeJson(v.features, []),
    description: v.description || null,
    dealership: tenant ? { name: tenant.name, phone: tenant.whatsapp_number || null, city: tenant.city || null } : null,
});

/* ── Staff endpoints ── */

router.get('/qr/:vehicleId', authenticate, async (req, res) => {
    const v = await knex('vehicles').where({ id: Number(req.params.vehicleId), tenant_id: req.user.tenant_id }).first();
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    const token = sign(req.user.tenant_id, v.id);
    res.json({ token, url: `${FRONTEND_URL}/v/${token}`, stock_number: v.stock_number });
});

router.post('/ai-description/:vehicleId', authenticate, async (req, res) => {
    const v = await knex('vehicles').where({ id: Number(req.params.vehicleId), tenant_id: req.user.tenant_id }).first();
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(await generateListingCopy(v));
});

/* ── Public endpoints (no auth — token-gated) ── */

const enquiryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });

router.get('/public/:token', async (req, res) => {
    const ref = verify(req.params.token);
    if (!ref) return res.status(404).json({ error: 'Vehicle not found' });
    const v = await knex('vehicles').where({ id: ref.vehicleId, tenant_id: ref.tenantId }).first();
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    const tenant = await knex('tenants').where({ id: ref.tenantId }).first().catch(() => null);
    res.json(publicVehicle(v, tenant));
});

router.post('/public/:token/enquiry', enquiryLimiter, async (req, res) => {
    const ref = verify(req.params.token);
    if (!ref) return res.status(404).json({ error: 'Vehicle not found' });

    const { name, phone, email, wants_test_drive, message, popia_consent } = req.body || {};
    const cleanName = String(name || '').trim().slice(0, 120);
    const cleanPhone = String(phone || '').replace(/[^\d+]/g, '');
    if (!cleanName) return res.status(400).json({ error: 'Please enter your name' });
    if (!/^(\+27|0)\d{9}$/.test(cleanPhone)) return res.status(400).json({ error: 'Please enter a valid South African mobile number' });
    if (popia_consent !== true) return res.status(400).json({ error: 'Consent is required so we can contact you (POPIA)' });

    const v = await knex('vehicles').where({ id: ref.vehicleId, tenant_id: ref.tenantId }).first();
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });

    const vehicleLabel = `${v.year} ${v.make} ${v.model}${v.variant ? ' ' + v.variant : ''}`;
    const notes = [
        `[Silent Salesman QR] Scanned on stock unit ${v.stock_number}.`,
        wants_test_drive ? 'Customer requested a TEST DRIVE.' : 'Customer requested a callback.',
        message ? `Message: ${String(message).slice(0, 1000)}` : '',
        `POPIA consent given ${new Date().toISOString()}.`,
    ].filter(Boolean).join('\n');

    try {
        const [id] = await knex('leads').insert({
            tenant_id: ref.tenantId,
            customer_name: cleanName,
            customer_phone: cleanPhone,
            customer_email: email ? String(email).trim().slice(0, 200) : null,
            source: 'walk_in',
            vehicle_interest: vehicleLabel,
            budget_max: v.price || null,
            status: 'new',
            ai_score: wants_test_drive ? 80 : 60, // on the floor + scanning a specific unit = high intent
            notes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).returning('id');
        const leadId = typeof id === 'object' ? id.id : id;

        // In-app floor alert so a salesperson walks over while the customer is still at the car
        try {
            notificationSvc._pushToQueue('new_lead', `QR lead #${leadId}: ${cleanName} is at ${v.stock_number} (${vehicleLabel})${wants_test_drive ? ' — wants a test drive' : ''}`);
        } catch { /* non-fatal */ }

        res.status(201).json({ ok: true, message: wants_test_drive ? 'Thanks! A sales executive will come to you shortly to arrange your test drive.' : 'Thanks! A sales executive will contact you shortly.' });
    } catch (e) {
        console.error('[showroom] enquiry failed', e);
        res.status(500).json({ error: 'Could not submit your enquiry. Please ask a salesperson for help.' });
    }
});

module.exports = { router, sign, verify };
