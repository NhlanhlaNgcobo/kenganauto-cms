/**
 * Customer Support & AI Manuals Router — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * Endpoints for PDF Manual management, FAQs, and support query logs.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// In-Memory Databases (Mocking Vector DB for Manuals & NLP DB for FAQs)
let mockManuals = [
    {
        id: 1, tenant_id: 1, file_name: 'Toyota Hilux 2022 Owner Manual.pdf',
        make: 'Toyota', model: 'Hilux', year: 2022, upload_date: new Date().toISOString(),
        status: 'Processed (Vectorized)', size: '4.2 MB', queries_count: 142,
        top_questions: ['What oil does it use?', 'How to reset service light?', 'What is the warning light?']
    },
    {
        id: 2, tenant_id: 1, file_name: 'Ford Ranger 2021 Manual.pdf',
        make: 'Ford', model: 'Ranger', year: 2021, upload_date: new Date().toISOString(),
        status: 'Processed (Vectorized)', size: '5.1 MB', queries_count: 85,
        top_questions: ['4x4 Engagement', 'Tyre pressure']
    }
];

let mockFaqs = [
    {
        id: 1, tenant_id: 1, make: 'Toyota', model: 'Hilux',
        question: 'What oil does my Hilux use?', answer: 'Toyota Genuine Motor Oil 5W-30 or equivalent is recommended.'
    },
    {
        id: 2, tenant_id: 1, make: 'Toyota', model: 'Hilux',
        question: 'How do I reset the service light?', answer: 'Hold the trip meter reset button while turning the ignition ON. Wait 5 seconds until the light goes off.'
    },
    {
        id: 3, tenant_id: 1, make: 'Ford', model: 'Ranger',
        question: 'What is the standard tyre pressure?', answer: 'Unloaded: 2.4 bar (35 psi) front and rear. Loaded: 2.6 bar (38 psi) front, 3.0 bar (44 psi) rear.'
    }
];

let mockQueries = [
    {
        id: 1, tenant_id: 1, customer_name: 'David Zondo', customer_phone: '+27821234567',
        query: 'Yellow warning light on Hilux dashboard', vehicle: 'Toyota Hilux 2022',
        resolution_status: 'Resolved by AI (Manual Page 47)', created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: 2, tenant_id: 1, customer_name: 'Sarah Naidoo', customer_phone: '+27712345678',
        query: 'Strange noise when braking hard', vehicle: 'Ford Ranger 2021',
        resolution_status: 'Escalated to Service Advisor', created_at: new Date().toISOString()
    }
];

/* ─────────────────────────────────────────────────────────────
   GET /api/support/manuals
   ───────────────────────────────────────────────────────────── */
router.get('/manuals', authenticate, (req, res) => {
    const tenantId = req.user.tenant_id;
    res.json(mockManuals.filter(m => m.tenant_id === tenantId));
});

/* ─────────────────────────────────────────────────────────────
   POST /api/support/manuals — Upload mapping abstraction
   ───────────────────────────────────────────────────────────── */
router.post('/manuals', authenticate, (req, res) => {
    const tenantId = req.user.tenant_id;
    const { file_name, make, model, year } = req.body;

    const newManual = {
        id: Date.now(), tenant_id: tenantId, file_name, make, model, year: Number(year),
        upload_date: new Date().toISOString(), status: 'Processing...', size: 'Unknown',
        queries_count: 0, top_questions: []
    };
    mockManuals.unshift(newManual);

    // Simulate background vectorization
    setTimeout(() => {
        newManual.status = 'Processed (Vectorized)';
    }, 5000);

    res.status(201).json(newManual);
});

/* ─────────────────────────────────────────────────────────────
   GET /api/support/faqs
   ───────────────────────────────────────────────────────────── */
router.get('/faqs', authenticate, (req, res) => {
    const tenantId = req.user.tenant_id;
    res.json(mockFaqs.filter(f => f.tenant_id === tenantId));
});

/* ─────────────────────────────────────────────────────────────
   POST /api/support/faqs — Add FAQ
   ───────────────────────────────────────────────────────────── */
router.post('/faqs', authenticate, (req, res) => {
    const tenantId = req.user.tenant_id;
    const { make, model, question, answer } = req.body;
    const newFaq = { id: Date.now(), tenant_id: tenantId, make, model, question, answer };
    mockFaqs.unshift(newFaq);
    res.status(201).json(newFaq);
});

/* ─────────────────────────────────────────────────────────────
   GET /api/support/queries — Support History
   ───────────────────────────────────────────────────────────── */
router.get('/queries', authenticate, (req, res) => {
    const tenantId = req.user.tenant_id;
    res.json(mockQueries.filter(q => q.tenant_id === tenantId));
});

module.exports = {
    router,
    // Used directly by chat_flows.js to mock RAG (Retrieval-Augmented Generation) lookup natively
    searchSupportKnowledge: (make, model, query) => {
        // 1. Check FAQs first (cheaper/faster mock)
        const faqMatch = mockFaqs.find(f =>
            (f.make.toLowerCase() === make?.toLowerCase() || !make) &&
            f.question.toLowerCase().includes(query.toLowerCase())
        );
        if (faqMatch) return { source: 'FAQ', text: faqMatch.answer };

        // 2. Check Manuals (Mocking Vector semantic space)
        const manualMatch = mockManuals.find(m => m.make.toLowerCase() === make?.toLowerCase() && m.model.toLowerCase() === model?.toLowerCase());

        if (manualMatch && query.toLowerCase().includes('warning light')) {
            return { source: `Manual Page 47 (${manualMatch.file_name})`, text: 'Yellow indicator is engine warning light. Could indicate loose fuel cap, sensor issue, or emission system problem.' };
        } else if (manualMatch && query.toLowerCase().includes('bluetooth')) {
            return { source: `Manual Page 112 (${manualMatch.file_name})`, text: 'To pair bluetooth, go to Settings > Connections > Add Device. Pin is usually 0000.' };
        }

        return null; // Not found -> escalate
    }
};
