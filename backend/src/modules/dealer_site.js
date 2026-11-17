/**
 * Dealer Website API — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * Public endpoints a dealership's own website (e.g. the Acme Cars demo site) calls.
 * Everything a visitor does is captured straight into the dealer's KenganAuto workspace:
 *
 *   GET  /api/public/dealer/:tenantId/profile
 *   GET  /api/public/dealer/:tenantId/stock              live inventory (sold units hidden)
 *   GET  /api/public/dealer/:tenantId/stock/:id
 *   POST /api/public/dealer/:tenantId/track              vehicle_view (anonymous, no PII)
 *   POST /api/public/dealer/:tenantId/enquiry            enquiry | test_drive | callback → Lead
 *   POST /api/public/dealer/:tenantId/finance            → Lead + finance application
 *   POST /api/public/dealer/:tenantId/trade-in/estimate  instant valuation range (no capture)
 *   POST /api/public/dealer/:tenantId/trade-in           → Lead + trade-in
 *   POST /api/public/dealer/:tenantId/service            → service booking (+ customer)
 *   POST /api/public/dealer/:tenantId/online-deal        buy/reserve online → Lead + deal + reservation
 *
 * Every lead captured here gets an instant AI WhatsApp reply (services/instant_responder.js).
 *
 * Authenticated (dashboard):
 *   GET  /api/website-activity?since=ISO                 live feed + most-viewed vehicles
 *
 * All capture endpoints require explicit POPIA consent and are rate-limited.
 */

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const knex = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { safeJson } = require('../services/feedback_ai');
const tradeInSvc = require('../services/trade_in_service');
const notificationSvc = require('../services/notification_service');
const responder = require('../services/instant_responder');

const publicRouter = express.Router();
const activityRouter = express.Router();

const PRIME_PLUS = 11.75; // indicative rate for estimates shown on the website
const nowIso = () => new Date().toISOString();
const captureLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
const trackLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false });

/* ── helpers ── */

const SA_MOBILE = /^(\+27|0)\d{9}$/;
const cleanPhone = (p) => String(p || '').replace(/[^\d+]/g, '');
const clip = (s, n = 500) => (s == null ? null : String(s).trim().slice(0, n) || null);

function monthly(price, deposit = 0, months = 72, rate = PRIME_PLUS, balloon = 0) {
    const principal = Math.max(0, Number(price) - Number(deposit));
    const r = rate / 100 / 12;
    const fv = principal * (balloon / 100);
    if (!principal) return 0;
    return Math.round(((principal - fv / Math.pow(1 + r, months)) * r) / (1 - Math.pow(1 + r, -months)));
}

function mediaUrl(req, src) {
    if (!src) return null;
    if (/^https?:\/\//.test(src)) return src;
    const file = String(src).split('/').pop();
    return `${req.protocol}://${req.get('host')}/media/vehicles/${encodeURIComponent(file)}`;
}

function publicVehicle(req, v) {
    const features = safeJson(v.features, []);
    return {
        id: v.id,
        make: v.make, model: v.model, year: v.year, variant: v.variant,
        title: `${v.year} ${v.make} ${v.model}`,
        colour: v.colour, mileage: v.mileage, condition: v.condition, status: v.status,
        price: Number(v.price), est_monthly: monthly(v.price, Number(v.price) * 0.1, 72),
        stock_number: v.stock_number,
        images: safeJson(v.images, []).map((s) => mediaUrl(req, s)),
        features, description: v.description || null,
        days_in_stock: v.days_in_stock,
    };
}

async function tenantOr404(req, res) {
    const id = Number(req.params.tenantId);
    const t = Number.isInteger(id) ? await knex('tenants').where({ id }).first().catch(() => null) : null;
    if (!t) { res.status(404).json({ error: 'Dealership not found' }); return null; }
    return t;
}

function validContact(body, res) {
    const name = clip(body.name, 120);
    const phone = cleanPhone(body.phone);
    if (!name) { res.status(400).json({ error: 'Please enter your name.' }); return null; }
    if (!SA_MOBILE.test(phone)) { res.status(400).json({ error: 'Please enter a valid South African mobile number, e.g. 082 123 4567.' }); return null; }
    if (body.popia_consent !== true) { res.status(400).json({ error: 'Please tick the consent box so we may contact you (POPIA).' }); return null; }
    const email = clip(body.email, 200);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { res.status(400).json({ error: 'Please enter a valid email address.' }); return null; }
    return { name, phone, email };
}

async function logEvent(tenantId, type, label, extra = {}) {
    try {
        await knex('website_events').insert({
            tenant_id: tenantId, type, label,
            vehicle_id: extra.vehicle_id || null, lead_id: extra.lead_id || null,
            visitor_id: clip(extra.visitor_id, 64), meta: JSON.stringify(extra.meta || {}), created_at: nowIso(),
        });
    } catch (e) { console.error('[dealer-site] event log failed', e.message); }
}

async function createLead(tenantId, contact, { status = 'new', score = 60, vehicle = null, interest = null, budget = null, notes }) {
    const [id] = await knex('leads').insert({
        tenant_id: tenantId,
        customer_name: contact.name, customer_phone: contact.phone, customer_email: contact.email,
        source: 'website',
        vehicle_interest: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : clip(interest, 120),
        budget_min: budget ? Math.round(budget * 0.85) : null,
        budget_max: budget || (vehicle ? Number(vehicle.price) : null),
        status, ai_score: score, notes,
        created_at: nowIso(), updated_at: nowIso(),
    }).returning('id');
    const leadId = typeof id === 'object' ? id.id : id;
    try { notificationSvc._pushToQueue('new_lead', `Website lead #${leadId}: ${contact.name}${vehicle ? ` — ${vehicle.year} ${vehicle.make} ${vehicle.model}` : ''}`); } catch { /* non-fatal */ }
    return leadId;
}

const consentLine = () => `POPIA consent given on the dealer website ${nowIso()}.`;

/* ── public: profile & stock ── */

publicRouter.get('/:tenantId/profile', async (req, res) => {
    const t = await tenantOr404(req, res); if (!t) return;
    res.json({ id: t.id, name: t.name, phone: t.whatsapp_number, city: t.city, province: t.province, address: t.address, brand_color: t.primary_color });
});

publicRouter.get('/:tenantId/stock', async (req, res) => {
    const t = await tenantOr404(req, res); if (!t) return;
    const rows = await knex('vehicles').where({ tenant_id: t.id }).whereNot({ status: 'sold' }).orderBy('price', 'desc');
    res.set('Cache-Control', 'public, max-age=30');
    res.json(rows.map((v) => publicVehicle(req, v)));
});

publicRouter.get('/:tenantId/stock/:id', async (req, res) => {
    const t = await tenantOr404(req, res); if (!t) return;
    const v = await knex('vehicles').where({ tenant_id: t.id, id: Number(req.params.id) }).first();
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(publicVehicle(req, v));
});

/* ── public: anonymous engagement tracking (no personal data) ── */

publicRouter.post('/:tenantId/track', trackLimiter, async (req, res) => {
    const t = await tenantOr404(req, res); if (!t) return;
    const { type, vehicle_id, visitor_id } = req.body || {};
    if (type !== 'vehicle_view') return res.status(400).json({ error: 'Unsupported event' });
    const v = await knex('vehicles').where({ tenant_id: t.id, id: Number(vehicle_id) }).first();
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    // de-duplicate: one view per visitor per vehicle per 10 minutes
    const recent = await knex('website_events')
        .where({ tenant_id: t.id, type: 'vehicle_view', vehicle_id: v.id, visitor_id: clip(visitor_id, 64) })
        .andWhere('created_at', '>=', new Date(Date.now() - 10 * 60000).toISOString()).first();
    if (!recent) await logEvent(t.id, 'vehicle_view', `Viewed ${v.year} ${v.make} ${v.model}`, { vehicle_id: v.id, visitor_id });
    res.status(204).end();
});

/* ── public: lead capture ── */

publicRouter.post('/:tenantId/enquiry', captureLimiter, async (req, res) => {
    const t = await tenantOr404(req, res); if (!t) return;
    const contact = validContact(req.body || {}, res); if (!contact) return;
    const { kind = 'enquiry', vehicle_id, message, preferred_date, preferred_time, visitor_id } = req.body;
    if (!['enquiry', 'test_drive', 'callback'].includes(kind)) return res.status(400).json({ error: 'Unknown enquiry type' });
    const v = vehicle_id ? await knex('vehicles').where({ tenant_id: t.id, id: Number(vehicle_id) }).first() : null;

    const viewed = visitor_id ? await knex('website_events').where({ tenant_id: t.id, visitor_id: clip(visitor_id, 64), type: 'vehicle_view' }).count('* as c').first() : { c: 0 };
    const headline = kind === 'test_drive' ? 'TEST DRIVE request' : kind === 'callback' ? 'CALLBACK request' : 'Vehicle enquiry';
    const notes = [
        `[${t.name} website] ${headline}${v ? ` — ${v.year} ${v.make} ${v.model} (${v.stock_number}, R${Number(v.price).toLocaleString('en-ZA')})` : ''}.`,
        kind === 'test_drive' && (preferred_date || preferred_time) ? `Preferred slot: ${clip(preferred_date, 20) || 'any day'} ${clip(preferred_time, 20) || ''}`.trim() : null,
        message ? `Message: "${clip(message, 1000)}"` : null,
        Number(viewed?.c) ? `Browsing signal: viewed ${viewed.c} vehicle page(s) before enquiring.` : null,
        consentLine(),
    ].filter(Boolean).join('\n');

    const leadId = await createLead(t.id, contact, {
        status: kind === 'test_drive' ? 'test_drive_booked' : 'new',
        score: kind === 'test_drive' ? 84 : kind === 'callback' ? 66 : 72,
        vehicle: v, notes,
    });
    const slotDate = /^\d{4}-\d{2}-\d{2}$/.test(preferred_date || '') ? preferred_date : null;
    const slotTime = /^\d{2}:\d{2}$/.test(preferred_time || '') ? preferred_time : '10:00';
    if (kind === 'test_drive') {
        await knex('leads').where({ id: leadId }).update({ appointment_at: new Date(`${slotDate || new Date().toISOString().slice(0, 10)}T${slotTime}:00`).toISOString() }).catch(() => {});
    }
    responder.respondLater(t, leadId, kind, { contact, vehicle: v, message: clip(message, 1000), visitorId: visitor_id, extra: { slot: slotDate ? `${slotDate} at ${slotTime}` : null } });
    await logEvent(t.id, kind, `${contact.name.split(' ')[0]} ${kind === 'test_drive' ? 'booked a test drive' : kind === 'callback' ? 'asked for a callback' : 'enquired'}${v ? ` — ${v.year} ${v.make} ${v.model}` : ''}`, { vehicle_id: v?.id, lead_id: leadId, visitor_id });

    res.status(201).json({
        ok: true, lead_id: leadId,
        message: kind === 'test_drive'
            ? `Thanks ${contact.name.split(' ')[0]}! Your test drive request is in. Check WhatsApp: we've just sent you a confirmation.`
            : `Thanks ${contact.name.split(' ')[0]}! Check WhatsApp: we've just sent you a reply, and a sales executive will follow up.`,
    });
});

publicRouter.post('/:tenantId/finance', captureLimiter, async (req, res) => {
    const t = await tenantOr404(req, res); if (!t) return;
    const contact = validContact(req.body || {}, res); if (!contact) return;
    const b = req.body;
    const income = Number(b.monthly_income);
    const price = Number(b.vehicle_price);
    const deposit = Math.max(0, Number(b.deposit) || 0);
    const term = [48, 60, 72, 84].includes(Number(b.term_months)) ? Number(b.term_months) : 72;
    if (!Number.isFinite(income) || income < 3000) return res.status(400).json({ error: 'Please enter your gross monthly income.' });
    if (!Number.isFinite(price) || price < 20000) return res.status(400).json({ error: 'Please choose a vehicle price.' });
    const v = b.vehicle_id ? await knex('vehicles').where({ tenant_id: t.id, id: Number(b.vehicle_id) }).first() : null;
    const instalment = monthly(price, deposit, term);
    const affordability = Math.round((instalment / income) * 100);

    const notes = [
        `[${t.name} website] FINANCE pre-qualification${v ? ` — ${v.year} ${v.make} ${v.model} (${v.stock_number})` : ''}.`,
        `Price R${price.toLocaleString('en-ZA')} · deposit R${deposit.toLocaleString('en-ZA')} · ${term} months · est. R${instalment.toLocaleString('en-ZA')}/month at ${PRIME_PLUS}%.`,
        `Gross income R${income.toLocaleString('en-ZA')}/month (${clip(b.employment_status, 30) || 'employment not given'}) → instalment is ${affordability}% of income.`,
        consentLine(),
    ].join('\n');

    const leadId = await createLead(t.id, contact, { status: 'qualified', score: affordability <= 25 ? 86 : affordability <= 35 ? 74 : 58, vehicle: v, interest: 'Vehicle finance', budget: price, notes });
    await knex('finance_applications').insert({
        tenant_id: t.id, lead_id: leadId, monthly_income: income,
        employment_status: ['permanent', 'self_employed', 'contract'].includes(b.employment_status) ? b.employment_status : 'permanent',
        vehicle_price: price, deposit_amount: deposit, term_months: term, interest_rate: PRIME_PLUS,
        monthly_installment: instalment, status: 'pending', created_at: nowIso(), updated_at: nowIso(),
    }).catch((e) => console.error('[dealer-site] finance app insert failed', e.message));
    responder.respondLater(t, leadId, 'finance', { contact, vehicle: v, visitorId: b.visitor_id, extra: { est_monthly: instalment, term_months: term } });
    await logEvent(t.id, 'finance', `${contact.name.split(' ')[0]} applied for finance — R${instalment.toLocaleString('en-ZA')}/month${v ? ` on a ${v.year} ${v.make} ${v.model}` : ''}`, { vehicle_id: v?.id, lead_id: leadId, visitor_id: b.visitor_id });

    res.status(201).json({ ok: true, lead_id: leadId, est_monthly: instalment, affordability_pct: affordability, message: `Thanks ${contact.name.split(' ')[0]}! Our F&I team will review your application and call you to confirm the best bank offer.` });
});

function tradeInput(b) {
    const year = Number(b.year);
    const mileage = Number(String(b.mileage || '').replace(/\D/g, ''));
    const make = clip(b.make, 40); const model = clip(b.model, 60);
    const condition = ['excellent', 'good', 'fair', 'poor'].includes(b.condition) ? b.condition : 'good';
    const thisYear = new Date().getFullYear();
    if (!make || !model) return { error: 'Please enter the make and model.' };
    if (!Number.isInteger(year) || year < thisYear - 30 || year > thisYear + 1) return { error: 'Please enter a valid year.' };
    if (!Number.isFinite(mileage) || mileage < 0 || mileage > 1_000_000) return { error: 'Please enter the mileage in km.' };
    return { year, make, model, mileage, condition };
}

publicRouter.post('/:tenantId/trade-in/estimate', captureLimiter, async (req, res) => {
    const t = await tenantOr404(req, res); if (!t) return;
    const input = tradeInput(req.body || {});
    if (input.error) return res.status(400).json({ error: input.error });
    const est = await tradeInSvc.calculateTradeInRange(input);
    res.json({ min: est.min, max: est.max, note: est.note });
});

publicRouter.post('/:tenantId/trade-in', captureLimiter, async (req, res) => {
    const t = await tenantOr404(req, res); if (!t) return;
    const contact = validContact(req.body || {}, res); if (!contact) return;
    const input = tradeInput(req.body);
    if (input.error) return res.status(400).json({ error: input.error });
    const est = await tradeInSvc.calculateTradeInRange(input);
    const wanted = req.body.vehicle_id ? await knex('vehicles').where({ tenant_id: t.id, id: Number(req.body.vehicle_id) }).first() : null;

    const notes = [
        `[${t.name} website] TRADE-IN valuation — ${input.year} ${input.make} ${input.model}, ${input.mileage.toLocaleString('en-ZA')} km, ${input.condition} condition.`,
        `Instant estimate shown to customer: R${est.min.toLocaleString('en-ZA')} – R${est.max.toLocaleString('en-ZA')}.`,
        wanted ? `Wants to trade towards: ${wanted.year} ${wanted.make} ${wanted.model} (${wanted.stock_number}).` : null,
        consentLine(),
    ].filter(Boolean).join('\n');
    const leadId = await createLead(t.id, contact, { status: 'qualified', score: 76, vehicle: wanted, interest: `Trade-in: ${input.year} ${input.make} ${input.model}`, notes });
    await knex('trade_ins').insert({
        tenant_id: t.id, lead_id: leadId, year: input.year, make: input.make, model: input.model,
        mileage: input.mileage, condition: input.condition, colour: clip(req.body.colour, 30),
        estimated_value: est.baseValue, status: 'valued', photos: '[]', created_at: nowIso(), updated_at: nowIso(),
    });
    responder.respondLater(t, leadId, 'trade_in', { contact, vehicle: wanted, visitorId: req.body.visitor_id, extra: { trade: `${input.year} ${input.make} ${input.model}`, range: `R${est.min.toLocaleString('en-ZA')} – R${est.max.toLocaleString('en-ZA')}` } });
    await logEvent(t.id, 'trade_in', `${contact.name.split(' ')[0]} valued a ${input.year} ${input.make} ${input.model} — R${est.min.toLocaleString('en-ZA')}–R${est.max.toLocaleString('en-ZA')}`, { vehicle_id: wanted?.id, lead_id: leadId, visitor_id: req.body.visitor_id });

    res.status(201).json({ ok: true, lead_id: leadId, min: est.min, max: est.max, message: `Thanks ${contact.name.split(' ')[0]}! Your trade-in is booked for a free inspection; we'll confirm a firm offer after a quick look at the car.` });
});

publicRouter.post('/:tenantId/service', captureLimiter, async (req, res) => {
    const t = await tenantOr404(req, res); if (!t) return;
    const contact = validContact(req.body || {}, res); if (!contact) return;
    const b = req.body;
    const make = clip(b.make, 40); const model = clip(b.model, 60);
    const registration = clip(b.registration, 20);
    const type = ['minor', 'major', 'warranty', 'tyres', 'body_repair', 'other'].includes(b.service_type) ? b.service_type : 'minor';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : null;
    const time = /^\d{2}:\d{2}$/.test(b.time || '') ? b.time : '08:00';
    if (!make || !model || !registration) return res.status(400).json({ error: 'Please enter your vehicle make, model and registration.' });
    if (!date || new Date(date) < new Date(new Date().toDateString())) return res.status(400).json({ error: 'Please choose a date from today onwards.' });

    const [first, ...rest] = contact.name.split(' ');
    let customer = await knex('customers').where({ tenant_id: t.id, phone: contact.phone }).first().catch(() => null);
    if (!customer) {
        const [cid] = await knex('customers').insert({
            tenant_id: t.id, first_name: first, last_name: rest.join(' ') || '-', email: contact.email, phone: contact.phone,
            vehicle_owned_make: make, vehicle_owned_model: model, registration, tags: '[]', created_at: nowIso(), updated_at: nowIso(),
        }).returning('id').catch(() => [null]);
        customer = cid ? { id: typeof cid === 'object' ? cid.id : cid } : null;
    }
    const [bid] = await knex('service_bookings').insert({
        tenant_id: t.id, customer_id: customer?.id || null, customer_name: contact.name, customer_phone: contact.phone, customer_email: contact.email,
        vehicle_registration: registration, vehicle_make: make, vehicle_model: model, service_type: type,
        description: [`Booked on the ${t.name} website.`, clip(b.notes, 500)].filter(Boolean).join(' '),
        booking_date: date, booking_time: time, status: 'booked', created_at: nowIso(), updated_at: nowIso(),
    }).returning('id');
    const bookingId = typeof bid === 'object' ? bid.id : bid;
    await logEvent(t.id, 'service', `${first} booked a ${type.replace('_', ' ')} service — ${make} ${model}, ${date} ${time}`, { visitor_id: b.visitor_id, meta: { booking_id: bookingId } });

    res.status(201).json({ ok: true, booking_id: bookingId, message: `You're booked in, ${first}! We'll send a WhatsApp reminder 48 hours before ${date} at ${time}.` });
});

/* ── public: buy / reserve online (digital retail, cf. Carvana) ──
 * One flow: payment method → optional trade-in → collect or deliver → details.
 * No money is taken online. The car is held for 48 hours and the dealer gets a deal
 * already structured in the pipeline. */

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeRef = () => `AC-${Array.from({ length: 5 }, () => REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)]).join('')}`;

publicRouter.post('/:tenantId/online-deal', captureLimiter, async (req, res) => {
    const t = await tenantOr404(req, res); if (!t) return;
    const contact = validContact(req.body || {}, res); if (!contact) return;
    const b = req.body;
    const v = await knex('vehicles').where({ tenant_id: t.id, id: Number(b.vehicle_id) }).first();
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    if (v.status !== 'available') return res.status(409).json({ error: 'Sorry, this car has just been reserved by another buyer. Our team can help you find a similar one.' });

    const payment = b.payment_method === 'cash' ? 'cash' : 'finance';
    const price = Number(v.price);
    const deposit = payment === 'finance' ? Math.min(price * 0.5, Math.max(0, Number(b.deposit) || 0)) : price;
    const term = [48, 60, 72, 84].includes(Number(b.term_months)) ? Number(b.term_months) : 72;
    const fulfilment = b.fulfilment === 'delivery' ? 'delivery' : 'collect';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(b.fulfilment_date || '') ? b.fulfilment_date : null;
    if (!date || new Date(date) < new Date(new Date().toDateString())) return res.status(400).json({ error: 'Please choose a collection or delivery date from today onwards.' });
    const address = fulfilment === 'delivery' ? clip(b.delivery_address, 300) : null;
    if (fulfilment === 'delivery' && !address) return res.status(400).json({ error: 'Please enter the delivery address.' });

    let trade = null;
    if (b.trade_in && b.trade_in.make) {
        const input = tradeInput(b.trade_in);
        if (input.error) return res.status(400).json({ error: `Trade-in: ${input.error}` });
        trade = { input, est: await tradeInSvc.calculateTradeInRange(input) };
    }
    const tradeMid = trade ? Math.round((trade.est.min + trade.est.max) / 2) : 0;
    const financed = payment === 'finance' ? Math.max(0, price - deposit - tradeMid) : 0;
    const instalment = payment === 'finance' ? monthly(price - tradeMid, deposit, term) : null;
    const reference = makeRef();
    const car = `${v.year} ${v.make} ${v.model}`;
    const money = (n) => `R${Math.round(n).toLocaleString('en-ZA')}`;

    const notes = [
        `[${t.name} website] ONLINE DEAL ${reference} — ${car} (${v.stock_number}, ${money(price)}). Car held for 48 hours.`,
        payment === 'finance'
            ? `Finance: deposit ${money(deposit)} · ${term} months · est. ${money(instalment)}/month at ${PRIME_PLUS}%.`
            : 'Paying cash / own bank finance.',
        trade ? `Trade-in: ${trade.input.year} ${trade.input.make} ${trade.input.model}, ${trade.input.mileage.toLocaleString('en-ZA')} km — estimate ${money(trade.est.min)}–${money(trade.est.max)} (subject to inspection).` : 'No trade-in.',
        fulfilment === 'delivery' ? `Home delivery on ${date} to: ${address}.` : `Collect from showroom on ${date}.`,
        consentLine(),
    ].join('\n');

    const leadId = await createLead(t.id, contact, { status: 'negotiation', score: 93, vehicle: v, notes });
    await knex('leads').where({ id: leadId }).update({ appointment_at: new Date(`${date}T10:00:00`).toISOString() }).catch(() => {});

    let tradeInId = null;
    if (trade) {
        const [tid] = await knex('trade_ins').insert({
            tenant_id: t.id, lead_id: leadId, year: trade.input.year, make: trade.input.make, model: trade.input.model,
            mileage: trade.input.mileage, condition: trade.input.condition, estimated_value: trade.est.baseValue,
            status: 'valued', photos: '[]', created_at: nowIso(), updated_at: nowIso(),
        }).returning('id');
        tradeInId = typeof tid === 'object' ? tid.id : tid;
    }
    const [did] = await knex('deals').insert({
        tenant_id: t.id, lead_id: leadId, vehicle_id: v.id, stage: payment === 'finance' ? 'finance_submitted' : 'negotiation',
        sale_price: price, trade_in_id: tradeInId, finance_amount: financed || null, deposit: payment === 'finance' ? deposit : null,
        monthly_installment: instalment, deal_date: nowIso(), created_at: nowIso(), updated_at: nowIso(),
    }).returning('id');
    const dealId = typeof did === 'object' ? did.id : did;
    if (payment === 'finance') {
        await knex('finance_applications').insert({
            tenant_id: t.id, lead_id: leadId, deal_id: dealId, vehicle_price: price, deposit_amount: deposit, term_months: term,
            interest_rate: PRIME_PLUS, monthly_installment: instalment, monthly_income: Number(b.monthly_income) || null,
            employment_status: 'permanent', status: 'pending', created_at: nowIso(), updated_at: nowIso(),
        }).catch((e) => console.error('[dealer-site] finance app insert failed', e.message));
    }
    const [oid] = await knex('online_deals').insert({
        tenant_id: t.id, lead_id: leadId, vehicle_id: v.id, deal_id: dealId, trade_in_id: tradeInId, reference,
        payment_method: payment, vehicle_price: price, deposit: payment === 'finance' ? deposit : null,
        term_months: payment === 'finance' ? term : null, est_monthly: instalment, trade_in_estimate: trade ? tradeMid : null,
        fulfilment, fulfilment_date: date, delivery_address: address, status: 'reserved',
        hold_expires_at: new Date(Date.now() + 48 * 3600000).toISOString(), created_at: nowIso(), updated_at: nowIso(),
    }).returning('id');
    await knex('vehicles').where({ id: v.id }).update({ status: 'reserved', updated_at: nowIso() });

    await logEvent(t.id, 'online_deal', `${contact.name.split(' ')[0]} reserved the ${car} online — ${payment === 'finance' ? `${money(instalment)}/month` : 'cash'}${trade ? ' + trade-in' : ''}`, { vehicle_id: v.id, lead_id: leadId, visitor_id: b.visitor_id, meta: { reference, online_deal_id: typeof oid === 'object' ? oid.id : oid } });
    responder.respondLater(t, leadId, 'online_deal', { contact, vehicle: v, visitorId: b.visitor_id, extra: { reference, payment, est_monthly: instalment, fulfilment, date } });

    res.status(201).json({
        ok: true, reference, lead_id: leadId, est_monthly: instalment,
        trade_in: trade ? { min: trade.est.min, max: trade.est.max } : null,
        hold_hours: 48,
        message: `The ${car} is reserved for you, ${contact.name.split(' ')[0]}. Your reference is ${reference}. We've sent the next steps to your WhatsApp.`,
    });
});

/* ── dashboard: live website activity ── */

activityRouter.get('/', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const since = req.query.since && !Number.isNaN(Date.parse(req.query.since)) ? new Date(req.query.since).toISOString() : null;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    try {
        const feedQ = knex('website_events').where({ tenant_id: tenantId }).orderBy('created_at', 'desc').limit(25);
        if (since) feedQ.andWhere('created_at', '>', since);
        const [feed, top, today] = await Promise.all([
            feedQ,
            knex('website_events as e').join('vehicles as v', 'v.id', 'e.vehicle_id')
                .where({ 'e.tenant_id': tenantId, 'e.type': 'vehicle_view' }).andWhere('e.created_at', '>=', weekAgo)
                .groupBy('e.vehicle_id', 'v.year', 'v.make', 'v.model', 'v.images', 'v.price')
                .select('e.vehicle_id', 'v.year', 'v.make', 'v.model', 'v.images', 'v.price').count('* as views')
                .orderBy('views', 'desc').limit(5),
            knex('website_events').where({ tenant_id: tenantId }).andWhere('created_at', '>=', dayAgo).select('type').count('* as c').groupBy('type'),
        ]);
        const counts = Object.fromEntries(today.map((r) => [r.type, Number(r.c)]));
        const leadsToday = ['enquiry', 'test_drive', 'callback', 'finance', 'trade_in', 'online_deal'].reduce((a, k) => a + (counts[k] || 0), 0);
        res.json({
            feed,
            top_viewed: top.map((r) => ({ ...r, views: Number(r.views), image: safeJson(r.images, [])[0] || null })),
            today: { views: counts.vehicle_view || 0, leads: leadsToday, service: counts.service || 0, conversion_pct: counts.vehicle_view ? Math.round((leadsToday / counts.vehicle_view) * 100) : null },
        });
    } catch (e) {
        console.error('[website-activity]', e);
        res.status(500).json({ error: 'Failed to load website activity' });
    }
});

module.exports = { publicRouter, activityRouter, monthly };
