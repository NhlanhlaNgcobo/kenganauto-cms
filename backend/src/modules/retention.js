/**
 * Retention & Sequences Router — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * Endpoints for automation sequences, loyalty points, and NPS scoring.
 */

'use strict';

const express = require('express');
const router = express.Router();
const AutomationSequence = require('../models/AutomationSequence');
const { authenticate } = require('../middleware/auth');

async function tryDB(dbCall, mockCall) {
    try {
        if (!AutomationSequence) return mockCall();
        const res = await dbCall();
        return res || mockCall();
    } catch {
        return mockCall();
    }
}

// In-Memory map defining the 4 stated structural sequences natively 
let mockSequences = [
    {
        id: 1, tenant_id: 1, name: 'NEW BUYER NURTURE', trigger_type: 'deal_delivered', active: true,
        steps: JSON.stringify([
            { day: 1, message: "Congratulations on your new [Vehicle]! We hope you love it. Here's your digital owner's guide: [link]" },
            { day: 7, message: "Hi [Name], how are you enjoying your new [Vehicle]? Is there anything we can help you with?" },
            { day: 30, message: "It's been a month with your [Vehicle]! Did you know we have a fantastic range of accessories? Reply ACCESSORIES to see our catalogue." },
            { day: 60, message: "Your first service is coming up in about 2 months. Would you like to pre-book to get your preferred slot?" },
            { day: 90, message: "[Service interval reminder] Book your first service now" },
            { day: 180, message: "We'd love a Google review if you've been happy!" },
            { day: 365, message: "Happy 1-year anniversary with your [Vehicle]! As a valued customer, here's an exclusive offer..." }
        ])
    },
    {
        id: 2, tenant_id: 1, name: 'COLD LEAD RE-ENGAGEMENT', trigger_type: 'lead_dormant_30_days', active: true,
        steps: JSON.stringify([
            { day: 30, message: "Hi [Name], we noticed you were interested in a [Vehicle] a while back. Are you still in the market?" },
            { day: 37, message: "A relevant vehicle update or price change on the model you liked!" },
            { day: 44, message: "We have some exciting new stock arrivals. Would you like to see what's come in?" }
        ])
    },
    {
        id: 3, tenant_id: 1, name: 'SERVICE RETENTION', trigger_type: 'service_due_1_month', active: false,
        steps: JSON.stringify([
            { day: -30, message: "Your [Vehicle] service is coming up. Book now to get your preferred slot." },
            { day: -14, message: "Reminder: Your [Vehicle] service is fast approaching." },
            { day: -7, message: "Final reminder + easy book button" }
        ])
    },
    {
        id: 4, tenant_id: 1, name: 'WIN-BACK', trigger_type: 'inactive_18_months', active: false,
        steps: JSON.stringify([
            { day: 540, message: "Personal message from the dealer principal's WhatsApp. Exclusive loyalty offer inside!" },
            { day: 545, message: "New model announcement relevant to your profile." }
        ])
    }
];

// NPS Logic: normally captured from a webhook. This handles simple dashboard metrics
let mockNpsData = {
    average_score: 9.1,
    scores: [
        { customer: 'David Zondo', score: 9, comment: 'Great service' },
        { customer: 'Sarah Naidoo', score: 10, comment: 'Loved the delivery' },
        { customer: 'John Doe', score: 8, comment: 'Was good' }
    ]
};

// Loyalty Tiers definition mapping points linearly
function calculateLoyaltyTier(points) {
    if (points >= 1000) return 'Platinum';
    if (points >= 500) return 'Gold';
    if (points >= 200) return 'Silver';
    return 'Bronze';
}

/* ─────────────────────────────────────────────────────────────
   GET /api/retention/sequences
   ───────────────────────────────────────────────────────────── */
router.get('/sequences', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;

    const sequences = await tryDB(
        () => AutomationSequence.query().where({ tenant_id: tenantId }),
        () => mockSequences.filter(s => s.tenant_id === tenantId)
    );

    // Parse steps natively out of DB string
    const parsed = sequences.map(s => ({
        ...s,
        steps: typeof s.steps === 'string' ? JSON.parse(s.steps || '[]') : s.steps
    }));
    res.json(parsed);
});

/* ─────────────────────────────────────────────────────────────
   PATCH /api/retention/sequences/:id/toggle
   ───────────────────────────────────────────────────────────── */
router.patch('/sequences/:id/toggle', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { active } = req.body;

    const updated = await tryDB(
        () => AutomationSequence.query().patchAndFetchById(id, { active: !!active }).where({ tenant_id: tenantId }),
        () => {
            const seq = mockSequences.find(s => s.id === Number(id) && s.tenant_id === tenantId);
            if (seq) { seq.active = !!active; return seq; }
            return null;
        }
    );

    if (!updated) return res.status(404).json({ error: 'Sequence disabled' });
    if (typeof updated.steps === 'string') updated.steps = JSON.parse(updated.steps || '[]');
    res.json(updated);
});

/* ─────────────────────────────────────────────────────────────
   GET /api/retention/loyalty-nps
   ───────────────────────────────────────────────────────────── */
router.get('/loyalty-nps', authenticate, (req, res) => {
    // We would sum total points and get average NPS. Returning mock summary for dashboard
    res.json({
        loyalty_tiers: [
            { tier: 'Platinum', threshold: '1000+ pts', benefits: 'VIP Concierge, Priority Service' },
            { tier: 'Gold', threshold: '500-999 pts', benefits: 'Discount on accessories' },
            { tier: 'Silver', threshold: '200-499 pts', benefits: 'Free wash with service' },
            { tier: 'Bronze', threshold: '0-199 pts', benefits: 'Basic points accumulation' },
        ],
        loyalty_points_awards: [
            { action: 'Vehicle Purchase', points: 500 },
            { action: 'Service Booking', points: 50 },
            { action: 'Customer Referral', points: 200 },
            { action: 'Leave Google Review', points: 100 }
        ],
        nps_data: mockNpsData
    });
});

module.exports = { router, calculateLoyaltyTier };
