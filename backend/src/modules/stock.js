/**
 * Stock Management Router — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * Endpoints for vehicle inventory management.
 */

'use strict';

const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const { authenticate } = require('../middleware/auth');
const { getDemoStock } = require('./demo_seeder');

/* ── Helper for DB vs Mock ── */
async function tryDB(dbCall, mockCall) {
    try {
        if (!Vehicle) return mockCall();
        const res = await dbCall();
        return res || mockCall();
    } catch (e) {
        return mockCall();
    }
}

// Initial Mock Stock
let mockStock = [
    {
        id: 1, tenant_id: 1, make: 'Toyota', model: 'Hilux', year: 2022, variant: '2.8 GD-6 RB Legend',
        colour: 'White', mileage: 15400, price: 689900, cost_price: 615000, condition: 'used',
        stock_number: 'TA-001', vin: 'AHT11122233344455', status: 'available', days_in_stock: 12,
        images: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800'],
        features: ['Leather', 'Reverse Camera', 'Towbar'], description: 'Immaculate condition, full service history.'
    },
    {
        id: 2, tenant_id: 1, make: 'Volkswagen', model: 'Amarok', year: 2023, variant: '3.0 V6 TDI Aventura 4Motion',
        colour: 'Blue', mileage: 8200, price: 959900, cost_price: 880000, condition: 'demo',
        stock_number: 'TA-002', vin: 'WVW22233344455566', status: 'available', days_in_stock: 45,
        images: ['https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&q=80&w=800'],
        features: ['Navigation', 'LED Matrix', '20" Alloys'], description: 'Manager demo. Balance of plan.'
    },
    {
        id: 3, tenant_id: 1, make: 'Ford', model: 'Ranger', year: 2021, variant: '2.0 Bi-Turbo Wildtrak 4x4',
        colour: 'Orange', mileage: 65000, price: 679900, cost_price: 620000, condition: 'used',
        stock_number: 'TA-003', vin: 'AFR33344455566677', status: 'available', days_in_stock: 75,
        images: ['https://images.unsplash.com/photo-1553152531-ee0d1bdac8bf?auto=format&fit=crop&q=80&w=800'],
        features: ['Roller Shutter', 'Sync 3', 'Adaptive Cruise'], description: 'Pristine, 1 owner.'
    }
];

// Helper: update days passed since creation (for mock mainly, but DB can do this too if a cron runs)
function updateDaysInStock(list) {
    // Basic mock update if we were storing dates. For now we use the static property.
    return list;
}

/* ─────────────────────────────────────────────────────────────
   GET /api/stock — List inventory
   ───────────────────────────────────────────────────────────── */
router.get('/', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { status, aged } = req.query;

    const vehicles = await tryDB(
        async () => {
            let q = Vehicle.query().where({ tenant_id: tenantId }).orderBy('days_in_stock', 'desc');
            if (status && status !== 'all') q = q.where({ status });
            if (aged === 'true') q = q.where('days_in_stock', '>', 60).andWhere({ status: 'available' });
            return await q;
        },
        () => {
            let list = tenantId === 9999 ? getDemoStock(9999) : updateDaysInStock(mockStock).filter(v => v.tenant_id === tenantId);
            if (status && status !== 'all') list = list.filter(v => v.status === status);
            if (aged === 'true') list = list.filter(v => v.days_in_stock > 60 && v.status === 'available');
            return list;
        }
    );

    return res.json(vehicles);
});

/* ─────────────────────────────────────────────────────────────
   GET /api/stock/:id — Get details
   ───────────────────────────────────────────────────────────── */
router.get('/:id', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const vehicle = await tryDB(
        () => Vehicle.query().findById(id).where({ tenant_id: tenantId }),
        () => mockStock.find(v => v.id === Number(id) && v.tenant_id === tenantId)
    );

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    return res.json(vehicle);
});

/* ─────────────────────────────────────────────────────────────
   POST /api/stock — Add new vehicle
   ───────────────────────────────────────────────────────────── */
router.post('/', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const data = req.body;

    // required fields simple validation
    if (!data.make || !data.model || !data.price || !data.stock_number || !data.vin) {
        return res.status(400).json({ error: 'Missing required vehicle properties.' });
    }

    const newVehicle = await tryDB(
        () => Vehicle.query().insertAndFetch({
            tenant_id: tenantId,
            make: data.make,
            model: data.model,
            year: Number(data.year),
            variant: data.variant,
            colour: data.colour,
            mileage: Number(data.mileage) || 0,
            price: Number(data.price),
            cost_price: Number(data.cost_price) || 0,
            condition: data.condition || 'used',
            stock_number: data.stock_number,
            vin: data.vin,
            status: data.status || 'available',
            images: data.images ? JSON.stringify(data.images) : '[]',
            features: data.features ? JSON.stringify(data.features) : '[]',
            description: data.description || '',
            days_in_stock: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }),
        () => {
            const v = {
                id: Date.now(), tenant_id: tenantId,
                make: data.make, model: data.model, year: Number(data.year), variant: data.variant,
                colour: data.colour, mileage: Number(data.mileage) || 0, price: Number(data.price),
                cost_price: Number(data.cost_price) || 0, condition: data.condition || 'used',
                stock_number: data.stock_number, vin: data.vin, status: data.status || 'available',
                images: data.images || [], features: data.features || [], description: data.description || '',
                days_in_stock: 0
            };
            mockStock.unshift(v);
            return v;
        }
    );

    return res.status(201).json({ ok: true, vehicle: newVehicle });
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/stock/:id — Update vehicle
   ───────────────────────────────────────────────────────────── */
router.patch('/:id', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const updateData = req.body;

    const existing = await tryDB(
        () => Vehicle.query().findById(id).where({ tenant_id: tenantId }),
        () => mockStock.find(v => v.id === Number(id) && v.tenant_id === tenantId)
    );

    if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

    let updated = await tryDB(
        () => {
            const patch = { ...updateData, updated_at: new Date().toISOString() };
            if (patch.images && Array.isArray(patch.images)) patch.images = JSON.stringify(patch.images);
            if (patch.features && Array.isArray(patch.features)) patch.features = JSON.stringify(patch.features);
            return Vehicle.query().patchAndFetchById(id, patch).where({ tenant_id: tenantId });
        },
        () => {
            Object.assign(existing, updateData);
            return existing;
        }
    );

    return res.json({ ok: true, vehicle: updated });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/stock/bulk — Bulk Import
   ───────────────────────────────────────────────────────────── */
router.post('/bulk', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { vehicles } = req.body; // Array of vehicles parsed from CSV by frontend

    if (!Array.isArray(vehicles) || vehicles.length === 0) {
        return res.status(400).json({ error: 'No vehicles provided.' });
    }

    const inserted = [];
    for (let data of vehicles) {
        if (!data.make || !data.model || !data.vin) continue; // skip invalid rows

        try {
            const newV = await tryDB(
                () => Vehicle.query().insertAndFetch({
                    tenant_id: tenantId,
                    make: data.make, model: data.model, year: Number(data.year) || new Date().getFullYear(),
                    variant: data.variant || '', colour: data.colour || '', mileage: Number(data.mileage) || 0,
                    price: Number(data.price) || 0, cost_price: Number(data.cost_price) || 0,
                    condition: data.condition || 'used', stock_number: data.stock_number || `S-${Date.now().toString().slice(-6)}`,
                    vin: data.vin, status: data.status || 'available',
                    images: '[]', features: '[]', description: '', days_in_stock: 0,
                    created_at: new Date().toISOString()
                }),
                () => {
                    const v = {
                        id: Date.now() + Math.floor(Math.random() * 1000), tenant_id: tenantId,
                        make: data.make, model: data.model, year: Number(data.year), variant: data.variant || '',
                        colour: data.colour || '', mileage: Number(data.mileage) || 0, price: Number(data.price) || 0,
                        cost_price: Number(data.cost_price) || 0, condition: data.condition || 'used',
                        stock_number: data.stock_number || `S-${Date.now().toString().slice(-6)}`, vin: data.vin,
                        status: data.status || 'available', images: [], features: [], description: '', days_in_stock: 0
                    };
                    mockStock.unshift(v);
                    return v;
                }
            );
            inserted.push(newV.id);
        } catch (e) {
            // skip row if VIN unique constraint fails
        }
    }

    return res.json({ ok: true, imported_count: inserted.length });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/stock/feed/autotrader — XML Export
   ───────────────────────────────────────────────────────────── */
router.get('/feed/autotrader', async (req, res) => {
    // Generate an XML feed for active stock
    // Using a fake token or checking tenantId logic would be here.
    const tenantId = Number(req.query.tenant_id) || 1;

    const vehicles = await tryDB(
        () => Vehicle.query().where({ tenant_id: tenantId, status: 'available' }),
        () => mockStock.filter(v => v.tenant_id === tenantId && v.status === 'available')
    );

    res.set('Content-Type', 'application/xml');

    // Generate basic XML payload conforming to industry standards
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Stock>\n`;
    for (const v of vehicles) {
        xml += `  <Vehicle>
    <StockNo>${v.stock_number}</StockNo>
    <VIN>${v.vin}</VIN>
    <Make>${v.make}</Make>
    <Model>${v.model}</Model>
    <Variant>${v.variant}</Variant>
    <Year>${v.year}</Year>
    <Price>${v.price}</Price>
    <Mileage>${v.mileage}</Mileage>
    <Colour>${v.colour}</Colour>
    <Condition>${v.condition}</Condition>
    <Description><![CDATA[${v.description || ''}]]></Description>
    <Images>
      ${(v.images && typeof v.images === 'string' ? JSON.parse(v.images) : v.images || []).map(img => `<ImageURL>${img}</ImageURL>`).join('\n      ')}
    </Images>
  </Vehicle>\n`;
    }
    xml += `</Stock>`;

    return res.send(xml);
});

module.exports = {
    router,
    // export mockStock for internal AI access if needed
    getAvailableStock: (tenantId) => mockStock.filter(v => v.tenant_id === tenantId && v.status === 'available')
};
