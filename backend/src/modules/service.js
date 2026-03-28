/**
 * Service & Workshop Router — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * Endpoints for service bookings, job cards, and KPI analytics.
 */

'use strict';

const express = require('express');
const router = express.Router();
const ServiceBooking = require('../models/ServiceBooking');
const { authenticate } = require('../middleware/auth');
const whatsappSvc = require('../services/whatsapp_service');

function nextBusinessDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1); // skip Sunday
    return d.toISOString().split('T')[0];
}

// In-Memory mock data for demonstration
let mockBookings = [
    {
        id: 1, tenant_id: 1, customer_name: 'David Zondo', customer_phone: '+27821234567',
        vehicle_registration: 'CA 123-456', vehicle_make: 'VW', vehicle_model: 'Polo Vivo',
        service_type: 'minor', description: 'Schedule 60k km service', booking_date: nextBusinessDate(0),
        booking_time: '08:00', advisor_id: 2, status: 'checked_in', job_card_number: 'JC-001',
        invoice_amount: 0, reminder_48h_sent: true, reminder_2h_sent: true,
        advisor: { first_name: 'Sarah', last_name: 'Naidoo' }
    },
    {
        id: 2, tenant_id: 1, customer_name: 'John Doe', customer_phone: '+27712345678',
        vehicle_registration: 'ND 987-654', vehicle_make: 'Toyota', vehicle_model: 'Hilux',
        service_type: 'major', description: 'Brakes squeaking, check engine light', booking_date: nextBusinessDate(0),
        booking_time: '10:00', advisor_id: 2, status: 'in_progress', job_card_number: 'JC-002',
        invoice_amount: 0, reminder_48h_sent: true, reminder_2h_sent: false,
        advisor: { first_name: 'Sarah', last_name: 'Naidoo' }
    },
    {
        id: 3, tenant_id: 1, customer_name: 'Emily Smith', customer_phone: '+27612345679',
        vehicle_registration: 'GP 456-123', vehicle_make: 'Ford', vehicle_model: 'Ranger',
        service_type: 'tyres', description: 'Replace all 4 tyres', booking_date: nextBusinessDate(1),
        booking_time: '14:00', advisor_id: null, status: 'booked', job_card_number: null,
        invoice_amount: 0, reminder_48h_sent: false, reminder_2h_sent: false,
        advisor: null
    }
];

async function tryDB(dbCall, mockCall) {
    try {
        if (!ServiceBooking) return mockCall();
        const res = await dbCall();
        return res || mockCall();
    } catch {
        return mockCall();
    }
}

/* ─────────────────────────────────────────────────────────────
   GET /api/service/bookings — Get all bookings
   ───────────────────────────────────────────────────────────── */
router.get('/bookings', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { start_date, end_date } = req.query;

    const bookings = await tryDB(
        async () => {
            let q = ServiceBooking.query().withGraphFetched('advisor').where({ tenant_id: tenantId });
            if (start_date) q = q.where('booking_date', '>=', start_date);
            if (end_date) q = q.where('booking_date', '<=', end_date);
            return await q.orderBy('booking_date').orderBy('booking_time');
        },
        () => {
            let list = mockBookings.filter(b => b.tenant_id === tenantId);
            if (start_date) list = list.filter(b => b.booking_date >= start_date);
            if (end_date) list = list.filter(b => b.booking_date <= end_date);
            return list.sort((a, b) => a.booking_date.localeCompare(b.booking_date) || a.booking_time.localeCompare(b.booking_time));
        }
    );

    res.json(bookings);
});

/* ─────────────────────────────────────────────────────────────
   POST /api/service/bookings — Create booking (Chat flow / UI)
   ───────────────────────────────────────────────────────────── */
router.post('/bookings', async (req, res) => {
    const tenantId = req.user ? req.user.tenant_id : (Number(req.body.tenant_id) || 1);
    const data = req.body;

    const newBooking = await tryDB(
        () => ServiceBooking.query().insertAndFetch({
            tenant_id: tenantId,
            customer_id: data.customer_id || null, // from DB match
            vehicle_registration: data.vehicle_registration,
            vehicle_make: data.vehicle_make,
            vehicle_model: data.vehicle_model,
            service_type: data.service_type || 'minor',
            description: data.description || '',
            booking_date: data.booking_date,
            booking_time: data.booking_time,
            advisor_id: data.advisor_id || null,
            status: 'booked',
            reminder_48h_sent: false,
            reminder_2h_sent: false,
            job_card_number: null,
            invoice_amount: 0
        }),
        () => {
            const b = {
                id: Date.now(), tenant_id: tenantId, ...data,
                status: 'booked', job_card_number: null, advisor: null
            };
            mockBookings.push(b);
            return b;
        }
    );

    // Provide confirmation message string logic for Chatbot use
    const msg = `Booking confirmed for ${newBooking.vehicle_make} ${newBooking.vehicle_model} on ${newBooking.booking_date} at ${newBooking.booking_time}. Job ID: SRV-${newBooking.id}`;

    // Simulate Outbound WhatsApp sending
    if (data.customer_phone) {
        whatsappSvc.sendText(tenantId, data.customer_phone, `Welcome to KenganAuto Service Department!\n\n${msg}\n\nPlease bring your service book. Let us know if you need to reschedule.`)
            .catch(console.error);
    }

    res.status(201).json({ ok: true, booking: newBooking, message: msg });
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/service/bookings/:id — Update status/details
   ───────────────────────────────────────────────────────────── */
router.patch('/bookings/:id', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const patch = req.body;

    // auto generate job card if checked in
    if (patch.status === 'checked_in' && !patch.job_card_number) {
        patch.job_card_number = `JC-${Date.now().toString().slice(-5)}`;
    }

    const updated = await tryDB(
        () => ServiceBooking.query().patchAndFetchById(id, patch).where({ tenant_id: tenantId }),
        () => {
            const b = mockBookings.find(x => x.id === Number(id));
            if (b) Object.assign(b, patch);
            return b;
        }
    );

    if (!updated) return res.status(404).json({ error: 'Not found' });

    // Send WhatsApp if ready for collection
    if (patch.status === 'ready_for_collection' && updated.customer_phone) {
        whatsappSvc.sendText(tenantId, updated.customer_phone, `Good news! Your ${updated.vehicle_make} is ready for collection at KenganAuto. Outstanding balance: R${updated.invoice_amount || '0.00'}. See you soon!`)
            .catch(console.error);
    }

    res.json({ ok: true, booking: updated });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/service/analytics — KPI Data
   ───────────────────────────────────────────────────────────── */
router.get('/analytics', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;

    const bookings = await tryDB(
        () => ServiceBooking.query().where({ tenant_id: tenantId }),
        () => mockBookings.filter(b => b.tenant_id === tenantId)
    );

    const totalThisMonth = bookings.length; // Simplified for mock
    const revenue = bookings.reduce((sum, b) => sum + (Number(b.invoice_amount) || 0), 0);
    const avgValue = totalThisMonth > 0 ? revenue / totalThisMonth : 0;

    // Most common service types
    const typesCount = bookings.reduce((acc, b) => { acc[b.service_type] = (acc[b.service_type] || 0) + 1; return acc; }, {});
    const commonServices = Object.entries(typesCount).sort((a, b) => b[1] - a[1]).map(x => ({ name: x[0], count: x[1] }));

    res.json({
        total_bookings: totalThisMonth,
        revenue_this_month: revenue,
        no_show_rate: 4.5, // Mocked percentage
        average_job_value: avgValue,
        common_services: commonServices
    });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/service/availability — Workshop Slots
   ───────────────────────────────────────────────────────────── */
router.get('/availability', async (req, res) => {
    // Basic logic for Workshop Capacity Management
    const slots = [
        { date: nextBusinessDate(1), time: '08:00', available: true },
        { date: nextBusinessDate(1), time: '10:00', available: true },
        { date: nextBusinessDate(1), time: '14:00', available: false }, // Capacity reached simulated
        { date: nextBusinessDate(2), time: '08:00', available: true },
        { date: nextBusinessDate(2), time: '13:00', available: true }
    ];
    res.json(slots);
});

module.exports = { router };
