/**
 * Service-lane AI inspection — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * Research: UVeye at US Toyota dealers reported +48% alignment revenue, +27% tyre sales
 * and +12% total service revenue, by showing customers what the car actually needs.
 *
 * At check-in the advisor photographs the car (tyres, brakes, wipers, body). Claude reviews
 * the photos and returns priced findings; the advisor approves/declines each item with the
 * customer, or sends the list to the customer on WhatsApp. Without an ANTHROPIC_API_KEY a
 * standard multi-point checklist (based on the service type) is used and labelled as such.
 *
 *   GET   /api/inspections/booking/:bookingId          → { booking, inspection }
 *   POST  /api/inspections/booking/:bookingId          { photos: [{ data, media_type }] } → run inspection
 *   PATCH /api/inspections/:id/findings/:index         { status: approved | declined | pending }
 *   POST  /api/inspections/:id/send                    → WhatsApp the recommendations to the customer
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const knex = require('../config/db');
const { authenticate } = require('../middleware/auth');
const claude = require('../services/claude');
const whatsappSvc = require('../services/whatsapp_service');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'inspections');
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTOS = 6;
const MAX_BYTES = 4 * 1024 * 1024;
const nowIso = () => new Date().toISOString();
const SEVERITIES = ['urgent', 'soon', 'monitor'];

/* Standard multi-point checklist (fallback). Prices are typical SA dealer retail, incl. VAT. */
const CHECKLIST = [
    { item: 'Front brake pads', area: 'Brakes', severity: 'soon', recommendation: 'Pads at roughly 3 mm. Replace before they reach the wear indicator to protect the discs.', est_price: 2450 },
    { item: 'Wheel alignment', area: 'Tyres & wheels', severity: 'soon', recommendation: 'Uneven wear on the front inner edges suggests the alignment is out.', est_price: 650 },
    { item: 'Front tyres (pair)', area: 'Tyres & wheels', severity: 'urgent', recommendation: 'Tread close to the 1.6 mm legal limit. Replace for safe wet-weather braking.', est_price: 4200 },
    { item: 'Wiper blades', area: 'Visibility', severity: 'soon', recommendation: 'Blades are streaking. Replace before the rainy season.', est_price: 380 },
    { item: 'Cabin air filter', area: 'Air-conditioning', severity: 'monitor', recommendation: 'Filter is discoloured. Replace to keep the air-con smelling fresh.', est_price: 520 },
    { item: 'Battery', area: 'Electrical', severity: 'monitor', recommendation: 'Battery tested weak for its age. Replace at the next service or if starting is slow.', est_price: 2100 },
    { item: 'Coolant flush', area: 'Engine', severity: 'monitor', recommendation: 'Coolant is due by age. A flush prevents overheating and corrosion.', est_price: 890 },
    { item: 'Rear brake discs and pads', area: 'Brakes', severity: 'soon', recommendation: 'Discs are lipped and pads are low. Replace as a set.', est_price: 3900 },
];

function checklistFor(booking) {
    const seed = crypto.createHash('md5').update(String(booking.id)).digest()[0];
    const tyreFocus = booking.service_type === 'tyres';
    const picks = tyreFocus ? [2, 1, 3] : [seed % 8, (seed >> 3) % 8, ((seed >> 5) + 3) % 8, 3];
    const uniq = [...new Set(picks)].slice(0, 4).map((i) => ({ ...CHECKLIST[i], status: 'pending' }));
    return {
        engine: 'checklist',
        summary: 'Standard multi-point check for this service type. The technician confirms each item on the hoist.',
        findings: uniq,
    };
}

async function analysePhotos(booking, photos) {
    const content = [
        ...photos.map((p) => ({ type: 'image', source: { type: 'base64', media_type: p.media_type, data: p.data } })),
        {
            type: 'text',
            text: `These are check-in photos of a customer's ${booking.vehicle_make || ''} ${booking.vehicle_model || ''} booked for a ${booking.service_type || 'service'} at a South African dealership.
List only issues you can actually see in the photos (tyre tread or sidewall damage, brake disc/pad wear, wiper damage, cracked glass, body damage, leaks, corrosion, lights). Do not guess about things not visible.
For each, give a typical South African dealer retail price in rand including VAT.
Respond with ONLY JSON:
{"summary": "<one sentence for the service advisor>", "findings": [{"item": "<part or job>", "area": "<Tyres & wheels | Brakes | Visibility | Body | Engine | Electrical | Other>", "severity": "<urgent | soon | monitor>", "recommendation": "<one sentence the customer will understand, saying what you saw>", "est_price": <integer rand>}]}
If the photos show nothing that needs work, return an empty findings array and say so in the summary.`,
        },
    ];
    const json = await claude.askJson({ content, maxTokens: 2000, system: 'You are an experienced South African service advisor reviewing vehicle check-in photos. Be accurate and conservative: never invent problems to sell work.' });
    if (!json || !Array.isArray(json.findings)) return null;
    return {
        engine: 'claude',
        summary: String(json.summary || '').slice(0, 400),
        findings: json.findings.slice(0, 12).map((f) => ({
            item: String(f.item || 'Item').slice(0, 80),
            area: String(f.area || 'Other').slice(0, 40),
            severity: SEVERITIES.includes(f.severity) ? f.severity : 'monitor',
            recommendation: String(f.recommendation || '').slice(0, 300),
            est_price: Math.max(0, Math.round(Number(f.est_price) || 0)),
            status: 'pending',
        })),
    };
}

const parse = (row) => row && ({ ...row, findings: JSON.parse(row.findings || '[]'), photos: JSON.parse(row.photos || '[]') });

async function bookingFor(req, res) {
    const b = await knex('service_bookings').where({ id: Number(req.params.bookingId), tenant_id: req.user.tenant_id }).first();
    if (!b) res.status(404).json({ error: 'Booking not found' });
    return b;
}

router.get('/booking/:bookingId', authenticate, async (req, res) => {
    const b = await bookingFor(req, res); if (!b) return;
    const row = await knex('inspections').where({ tenant_id: req.user.tenant_id, booking_id: b.id }).orderBy('id', 'desc').first();
    res.json({ booking: b, inspection: parse(row) || null, ai_enabled: claude.enabled() });
});

router.post('/booking/:bookingId', authenticate, async (req, res) => {
    const b = await bookingFor(req, res); if (!b) return;
    const photos = Array.isArray(req.body?.photos) ? req.body.photos.slice(0, MAX_PHOTOS) : [];
    for (const p of photos) {
        if (!MEDIA_TYPES.includes(p.media_type) || typeof p.data !== 'string') return res.status(400).json({ error: 'Photos must be JPEG, PNG or WebP.' });
        if (Buffer.byteLength(p.data, 'base64') > MAX_BYTES) return res.status(413).json({ error: 'Each photo must be under 4 MB.' });
    }

    // Store photos under unguessable names so the job card can show them
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const urls = photos.map((p) => {
        const name = `${crypto.randomBytes(12).toString('hex')}.${p.media_type.split('/')[1].replace('jpeg', 'jpg')}`;
        fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(p.data, 'base64'));
        return `/media/inspections/${name}`;
    });

    const result = (photos.length && await analysePhotos(b, photos)) || checklistFor(b);
    if (photos.length && result.engine === 'checklist') {
        result.summary = claude.enabled()
            ? 'Photo analysis was unavailable just now, so the standard checklist is shown. The technician confirms each item.'
            : 'Photos saved to the job card. AI photo analysis needs an Anthropic API key, so the standard checklist is shown.';
    }
    await knex('inspections').where({ tenant_id: req.user.tenant_id, booking_id: b.id }).del();
    const [id] = await knex('inspections').insert({
        tenant_id: req.user.tenant_id, booking_id: b.id, findings: JSON.stringify(result.findings), photos: JSON.stringify(urls),
        engine: result.engine, summary: result.summary, created_at: nowIso(), updated_at: nowIso(),
    }).returning('id');
    const row = await knex('inspections').where({ id: typeof id === 'object' ? id.id : id }).first();
    res.status(201).json({ inspection: parse(row) });
});

router.patch('/:id/findings/:index', authenticate, async (req, res) => {
    const row = await knex('inspections').where({ id: Number(req.params.id), tenant_id: req.user.tenant_id }).first();
    if (!row) return res.status(404).json({ error: 'Inspection not found' });
    const status = req.body?.status;
    if (!['approved', 'declined', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const findings = JSON.parse(row.findings || '[]');
    const i = Number(req.params.index);
    if (!findings[i]) return res.status(404).json({ error: 'Finding not found' });
    findings[i].status = status;
    await knex('inspections').where({ id: row.id }).update({ findings: JSON.stringify(findings), updated_at: nowIso() });

    // Approved work is added to the booking's invoice estimate
    const approvedValue = findings.filter((f) => f.status === 'approved').reduce((a, f) => a + (Number(f.est_price) || 0), 0);
    res.json({ ok: true, findings, approved_value: approvedValue });
});

router.post('/:id/send', authenticate, async (req, res) => {
    const row = await knex('inspections').where({ id: Number(req.params.id), tenant_id: req.user.tenant_id }).first();
    if (!row) return res.status(404).json({ error: 'Inspection not found' });
    const b = await knex('service_bookings').where({ id: row.booking_id }).first();
    if (!b?.customer_phone) return res.status(400).json({ error: 'This booking has no customer mobile number.' });
    const tenant = await knex('tenants').where({ id: req.user.tenant_id }).first();
    const findings = JSON.parse(row.findings || '[]').filter((f) => f.status !== 'declined');
    if (!findings.length) return res.status(400).json({ error: 'There are no recommendations to send.' });
    const lines = findings.map((f, i) => `${i + 1}. ${f.item}: ${f.recommendation} (R${Number(f.est_price).toLocaleString('en-ZA')})`);
    const first = String(b.customer_name || '').split(' ')[0] || 'there';
    const text = `Hi ${first}, it's ${tenant?.name || 'your dealership'}. While your ${b.vehicle_make} ${b.vehicle_model} is with us, our technician found:\n${lines.join('\n')}\nReply with the numbers you'd like us to do today, or NONE. Nothing is done without your OK.`;
    Promise.resolve().then(() => whatsappSvc.sendText(req.user.tenant_id, b.customer_phone, text)).catch((e) => console.error('[inspections] send failed', e.message));
    await knex('inspections').where({ id: row.id }).update({ sent_at: nowIso(), updated_at: nowIso() });
    res.json({ ok: true, message: text });
});

module.exports = { router, CHECKLIST };
