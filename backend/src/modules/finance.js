/**
 * Finance API Router — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * POST /api/finance/calculate        → full NCR-compliant calculation
 * GET  /api/finance/rates            → current SA prime rate + fees
 * POST /api/finance/chatbot          → chatbot 3-scenario comparison text
 * GET  /api/finance/embed-code       → embeddable widget HTML snippet
 */

'use strict';

const express = require('express');
const router = express.Router();
const calc = require('../services/finance_calculator');

/* ── optional auth (chatbot endpoint is public for external widget) ── */
let authenticate;
try {
    ({ authenticate } = require('../middleware/auth'));
} catch {
    authenticate = (req, res, next) => next(); // fallback if auth not available
}

/* ─────────────────────────────────────────────────────────────
   GET /api/finance/rates  — current SA prime rate + fee schedule
   ───────────────────────────────────────────────────────────── */
router.get('/rates', (req, res) => {
    const { SA_RATES } = calc;
    res.json({
        prime_rate: SA_RATES.prime,
        default_rate: SA_RATES.defaultRate,
        dealer_spread: SA_RATES.dealerSpread,
        vat_rate: SA_RATES.vatRate * 100,
        initiation_fee: {
            ex_vat: SA_RATES.initiationFeeExVat,
            inc_vat: Math.round(SA_RATES.initiationFee * 100) / 100,
        },
        monthly_service_fee: {
            ex_vat: SA_RATES.monthlyServiceFeeExVat,
            inc_vat: Math.round(SA_RATES.monthlyServiceFee * 100) / 100,
        },
        valid_terms: [24, 36, 48, 60, 72, 84],
        balloon_options: [0, 10, 20, 30],
        updated_at: '2026-03-20', // update when SARB changes prime
        source: 'SARB MPC decision · March 2026',
    });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/finance/calculate  — full NCR-compliant breakdown
   ───────────────────────────────────────────────────────────── */
router.post('/calculate', (req, res) => {
    try {
        const {
            vehiclePrice,
            deposit = 0,
            termMonths = 72,
            annualRate,
            balloonPct = 0,
            includeInsurance = true,
        } = req.body;

        if (!vehiclePrice) {
            return res.status(400).json({ error: 'vehiclePrice is required.' });
        }

        const result = calc.calculate({
            vehiclePrice: Number(vehiclePrice),
            deposit: Number(deposit),
            termMonths: Number(termMonths),
            annualRate: Number(annualRate) || calc.SA_RATES.defaultRate,
            balloonPct: Number(balloonPct),
            includeInsurance: Boolean(includeInsurance),
        });

        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/finance/chatbot  — 3-scenario text for chatbot
   ───────────────────────────────────────────────────────────── */
router.post('/chatbot', (req, res) => {
    try {
        const {
            vehiclePrice,
            deposit = 0,
            annualRate,
            balloonPct = 0,
            vehicleLabel = 'this vehicle',
        } = req.body;

        if (!vehiclePrice) {
            return res.status(400).json({ error: 'vehiclePrice is required.' });
        }

        const result = calc.chatbotScenarios({
            vehiclePrice: Number(vehiclePrice),
            deposit: Number(deposit),
            annualRate: Number(annualRate) || calc.SA_RATES.defaultRate,
            balloonPct: Number(balloonPct),
        }, vehicleLabel);

        return res.json(result);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/finance/embed-code  — dealership website embed snippet
   ───────────────────────────────────────────────────────────── */
router.get('/embed-code', authenticate, (req, res) => {
    const tenantId = req.user?.tenant_id || 'demo';
    const { primaryColor, dealershipName } = req.query;

    const html = calc.generateEmbedCode({
        tenantId,
        primaryColor: primaryColor || '#C9A84C',
        dealershipName: dealershipName || 'KenganAuto',
        apiBase: process.env.API_BASE_URL || 'https://api.kenganauto.co.za',
    });

    return res.json({ html, tenantId });
});

module.exports = router;
