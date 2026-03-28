/**
 * Parts Management Router — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * Catalogue management, enquiries, workshop integration, and analytics.
 */

'use strict';

const express = require('express');
const router = express.Router();
const PartsEnquiry = require('../models/PartsEnquiry');
const { authenticate } = require('../middleware/auth');
const whatsappSvc = require('../services/whatsapp_service');

async function tryDB(dbCall, mockCall) {
    try {
        if (!PartsEnquiry) return mockCall();
        const res = await dbCall();
        return res || mockCall();
    } catch {
        return mockCall();
    }
}

// In-Memory Parts Catalogue (Can be uploaded via CSV)
let partsCatalog = [
    { part_number: 'FORD-BRK-001', description: 'Front Brake Pads', fitment: 'Ford Ranger 2020-2023', price: 1250, stock: 45 },
    { part_number: 'VW-FIL-01A', description: 'Oil Filter', fitment: 'VW Polo Vivo 2018-2024', price: 180, stock: 120 },
    { part_number: 'TOY-PLG-09X', description: 'Spark Plugs (Set of 4)', fitment: 'Toyota Hilux 2020+', price: 460, stock: 32 },
    { part_number: 'BMP-F-RR19', description: 'Front Bumper Cover Prime', fitment: 'Range Rover Sport 2019', price: 8500, stock: 0 }
];

let mockEnquiries = [
    {
        id: 1, tenant_id: 1, customer_name: 'David Zondo', customer_phone: '+27821234567',
        vehicle_make: 'Ford', vehicle_model: 'Ranger 2020', part_name: 'Front Brake Pads',
        part_number: 'FORD-BRK-001', quantity: 1, status: 'quoted', price_quoted: 1450,
        created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 2, tenant_id: 1, customer_name: 'INTERNAL: JC-002', customer_phone: '',
        vehicle_make: 'Toyota', vehicle_model: 'Hilux', part_name: 'Spark Plugs',
        part_number: '', quantity: 1, status: 'enquiry', price_quoted: null,
        created_at: new Date().toISOString()
    }
];

/* ─────────────────────────────────────────────────────────────
   GET /api/parts/catalog — List catalogue
   ───────────────────────────────────────────────────────────── */
router.get('/catalog', authenticate, (req, res) => {
    const q = (req.query.q || '').toLowerCase();
    let results = partsCatalog;
    if (q) {
        results = partsCatalog.filter(p =>
            p.part_number.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.fitment.toLowerCase().includes(q)
        );
    }
    res.json(results);
});

/* ─────────────────────────────────────────────────────────────
   POST /api/parts/catalog/bulk — Upload CSV
   ───────────────────────────────────────────────────────────── */
router.post('/catalog/bulk', authenticate, (req, res) => {
    const { parts } = req.body;
    if (Array.isArray(parts) && parts.length > 0) {
        // Append or replace. For this demo, let's prepend and keep unique part numbers.
        parts.forEach(p => {
            if (!p.part_number || !p.description) return;
            const idx = partsCatalog.findIndex(x => x.part_number === p.part_number);
            const entry = {
                part_number: p.part_number,
                description: p.description,
                fitment: p.fitment || '',
                price: Number(p.price) || 0,
                stock: Number(p.stock) || 0
            };
            if (idx >= 0) partsCatalog[idx] = entry;
            else partsCatalog.unshift(entry);
        });
    }
    res.json({ ok: true, count: partsCatalog.length });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/parts/enquiries — List enquiries
   ───────────────────────────────────────────────────────────── */
router.get('/enquiries', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { status } = req.query;

    const enquiries = await tryDB(
        async () => {
            let q = PartsEnquiry.query().where({ tenant_id: tenantId }).orderBy('created_at', 'desc');
            if (status && status !== 'all') q = q.where({ status });
            return await q;
        },
        () => {
            let list = mockEnquiries.filter(e => e.tenant_id === tenantId);
            if (status && status !== 'all') list = list.filter(e => e.status === status);
            return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
        }
    );
    res.json(enquiries);
});

/* ─────────────────────────────────────────────────────────────
   POST /api/parts/enquiries — Create (Chatbot / Workshop)
   ───────────────────────────────────────────────────────────── */
router.post('/enquiries', async (req, res) => {
    const tenantId = req.user ? req.user.tenant_id : (Number(req.body.tenant_id) || 1);
    const data = req.body; // customer_name, customer_phone, vehicle_make, vehicle_model, part_name, part_number, quantity, is_internal

    // Auto-search dictionary if part requested via Chatbot
    let quoteContext = '';
    const match = partsCatalog.find(p => p.part_number === data.part_number || (data.part_name && p.description.toLowerCase().includes(data.part_name.toLowerCase())));

    if (match && match.stock > 0) {
        quoteContext = `I found that part in our system! It's currently in stock at R${match.price.toLocaleString()}.`;
    } else {
        quoteContext = `I'm checking availability for you. Our parts team will confirm within 2 hours during business hours.`;
    }

    const newEnq = await tryDB(
        () => PartsEnquiry.query().insertAndFetch({
            tenant_id: tenantId,
            customer_name: data.is_internal ? `INTERNAL: JC-${data.job_card_number}` : (data.customer_name || 'Anonymous'),
            customer_phone: data.customer_phone || '',
            vehicle_make: data.vehicle_make || '',
            vehicle_model: data.vehicle_model || '',
            part_name: data.part_name || '',
            part_number: data.part_number || '',
            quantity: Number(data.quantity) || 1,
            status: match && match.stock > 0 ? 'quoted' : 'enquiry',
            price_quoted: match && match.stock > 0 ? match.price : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }),
        () => {
            const e = {
                id: Date.now(), tenant_id: tenantId,
                customer_name: data.is_internal ? `INTERNAL: JC-${data.job_card_number}` : (data.customer_name || 'Anonymous'),
                customer_phone: data.customer_phone || '',
                vehicle_make: data.vehicle_make || '',
                vehicle_model: data.vehicle_model || '',
                part_name: data.part_name || '',
                part_number: data.part_number || '',
                quantity: Number(data.quantity) || 1,
                status: match && match.stock > 0 ? 'quoted' : 'enquiry',
                price_quoted: match && match.stock > 0 ? match.price : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            mockEnquiries.unshift(e);
            return e;
        }
    );

    res.status(201).json({ ok: true, enquiry: newEnq, bot_response: quoteContext });
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/parts/enquiries/:id — Update Status / WhatsApp
   ───────────────────────────────────────────────────────────── */
router.patch('/enquiries/:id', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const patch = req.body;

    patch.updated_at = new Date().toISOString();

    const updated = await tryDB(
        () => PartsEnquiry.query().patchAndFetchById(id, patch).where({ tenant_id: tenantId }),
        () => {
            const e = mockEnquiries.find(x => x.id === Number(id) && x.tenant_id === tenantId);
            if (e) Object.assign(e, patch);
            return e;
        }
    );

    if (!updated) return res.status(404).json({ error: 'Not found' });

    // WhatsApp Notification triggers
    if (updated.status === 'ready' && updated.customer_phone && !updated.customer_name.startsWith('INTERNAL')) {
        const msg = `Good news! Your ${updated.part_name} for your ${updated.vehicle_make} ${updated.vehicle_model} is ready for collection. Total due: R${updated.price_quoted || '0.00'}. We're open Mon-Fri 8am-5pm.`;
        whatsappSvc.sendText(tenantId, updated.customer_phone, msg).catch(console.error);
    } else if (updated.status === 'ready' && updated.customer_name.startsWith('INTERNAL')) {
        // Technically: we'd fire an internal notification to the Service Advisor who owns that JC 
        // e.g., Update Job Card status to 'Parts Ready' implicitly if we hooked them tight in a CRM logic block.
    }

    res.json({ ok: true, enquiry: updated });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/parts/analytics — KPIs
   ───────────────────────────────────────────────────────────── */
router.get('/analytics', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;

    // Top selling, pending orders value, collection rate
    const enqs = await tryDB(
        () => PartsEnquiry.query().where({ tenant_id: tenantId }),
        () => mockEnquiries.filter(e => e.tenant_id === tenantId)
    );

    const ordered = enqs.filter(e => e.status === 'ordered');
    const collected = enqs.filter(e => e.status === 'collected');
    const ready = enqs.filter(e => e.status === 'ready');
    const pendingOrderValue = ordered.reduce((sum, e) => sum + (e.price_quoted || 0) * (e.quantity || 1), 0);

    // Collection rate: (Collected) / (Collected + Ready)
    let collectionRate = 0;
    if ((collected.length + ready.length) > 0) {
        collectionRate = Math.round((collected.length / (collected.length + ready.length)) * 100);
    } else { collectionRate = 100; }

    const revenues = collected.reduce((sum, e) => sum + (e.price_quoted || 0) * (e.quantity || 1), 0);

    // Group for top parts
    const partCounts = {};
    collected.forEach(e => {
        const nm = e.part_name || 'Unknown Part';
        partCounts[nm] = (partCounts[nm] || 0) + (e.quantity || 1);
    });
    const topParts = Object.entries(partCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => ({ name: x[0], count: x[1] }));

    res.json({
        revenue_this_month: revenues,
        pending_orders_value: pendingOrderValue,
        collection_rate: collectionRate,
        top_selling_parts: topParts,
        total_enquiries: enqs.length
    });
});

module.exports = {
    router,
    checkStockLocally: (partName, partNum) => {
        return partsCatalog.find(p => p.part_number === partNum || (partName && p.description.toLowerCase().includes(partName.toLowerCase())));
    }
};
