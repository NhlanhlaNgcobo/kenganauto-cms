/**
 * Customers CRM Router — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * Endpoints for managing the central customer database.
 */

'use strict';

const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const { authenticate } = require('../middleware/auth');

async function tryDB(dbCall, mockCall) {
    try {
        if (!Customer) return mockCall();
        const res = await dbCall();
        return res || mockCall();
    } catch {
        return mockCall();
    }
}

// In-Memory mock data for demonstration
let mockCustomers = [
    {
        id: 1, tenant_id: 1, first_name: 'David', last_name: 'Zondo', email: 'david@example.com',
        phone: '+27821234567', whatsapp_number: '+27821234567', id_number: '8501015023087',
        address: '123 Main St, Sandton', vehicle_owned_make: 'Ford', vehicle_owned_model: 'Ranger',
        vehicle_owned_year: 2020, registration: 'CA 123-456', vin: 'AFR123456789',
        purchase_date: '2023-05-15T00:00:00.000Z', loyalty_points: 550, nps_score: 9,
        last_contact_at: new Date().toISOString(), tags: '["VIP", "Service Regular"]'
    },
    {
        id: 2, tenant_id: 1, first_name: 'Sarah', last_name: 'Naidoo', email: 'sarah@example.com',
        phone: '+27712345678', whatsapp_number: '+27712345678', id_number: '9203155023087',
        address: '45 Beach Rd, Durban', vehicle_owned_make: 'Toyota', vehicle_owned_model: 'Hilux',
        vehicle_owned_year: 2024, registration: 'ND 987-654', vin: 'AHT987654321',
        purchase_date: '2024-01-20T00:00:00.000Z', loyalty_points: 500, nps_score: null,
        last_contact_at: '2024-02-15T00:00:00.000Z', tags: '["New Buyer"]'
    }
];

/* ─────────────────────────────────────────────────────────────
   GET /api/customers 
   ───────────────────────────────────────────────────────────── */
router.get('/', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { q, tag } = req.query;

    const customers = await tryDB(
        async () => {
            let query = Customer.query().where({ tenant_id: tenantId });
            if (q) {
                query = query.where(builder => {
                    builder.where('first_name', 'ilike', `%${q}%`)
                        .orWhere('last_name', 'ilike', `%${q}%`)
                        .orWhere('vehicle_owned_model', 'ilike', `%${q}%`);
                });
            }
            // Tags filtering can be complex safely in JSONB, skipped here for brevity
            return await query.orderBy('last_contact_at', 'desc');
        },
        () => {
            let list = mockCustomers.filter(c => c.tenant_id === tenantId);
            if (q) {
                const lq = q.toLowerCase();
                list = list.filter(c =>
                    c.first_name.toLowerCase().includes(lq) ||
                    c.last_name.toLowerCase().includes(lq) ||
                    (c.vehicle_owned_model && c.vehicle_owned_model.toLowerCase().includes(lq))
                );
            }
            if (tag) list = list.filter(c => c.tags && c.tags.includes(tag));
            return list;
        }
    );

    // format tags
    const formatted = customers.map(c => ({
        ...c,
        tags: typeof c.tags === 'string' ? JSON.parse(c.tags || '[]') : (c.tags || [])
    }));

    res.json(formatted);
});

/* ─────────────────────────────────────────────────────────────
   GET /api/customers/:id
   ───────────────────────────────────────────────────────────── */
router.get('/:id', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const customer = await tryDB(
        () => Customer.query().findById(id).where({ tenant_id: tenantId }),
        () => mockCustomers.find(c => c.id === Number(id) && c.tenant_id === tenantId)
    );

    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (typeof customer.tags === 'string') customer.tags = JSON.parse(customer.tags || '[]');
    res.json(customer);
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/customers/:id/tags
   ───────────────────────────────────────────────────────────── */
router.patch('/:id/tags', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { tags } = req.body;

    const updated = await tryDB(
        () => Customer.query().patchAndFetchById(id, { tags: JSON.stringify(tags) }).where({ tenant_id: tenantId }),
        () => {
            const c = mockCustomers.find(x => x.id === Number(id));
            if (c) c.tags = JSON.stringify(tags);
            return c;
        }
    );

    if (!updated) return res.status(404).json({ error: 'Not found' });
    if (typeof updated.tags === 'string') updated.tags = JSON.parse(updated.tags || '[]');
    res.json(updated);
});

module.exports = { router };
