/**
 * Finance Calculator Engine — KenganAuto (SA NCA/NCR Compliant)
 * ══════════════════════════════════════════════════════════════
 *
 * Implements the South African National Credit Act (NCA)
 * Cost of Credit disclosure requirements:
 *
 *   ✓ APR (Annual Percentage Rate) — NCR definition
 *   ✓ Initiation fee (R1,207.50 + 15% VAT = R1,388.63)
 *   ✓ Monthly service fee (R69 + 15% VAT = R79.35)
 *   ✓ Finance-linked insurance estimate
 *   ✓ Full cost of credit summary (NCA Section 92)
 *   ✓ Balloon payment with warning
 *   ✓ Prime rate sourced from config (live in future)
 *
 * Formula (balloon-aware):
 *   PMT = [P - B/(1+r)^n] × r / [1 - (1+r)^-n]
 *   where r = monthly rate, B = balloon amount, P = principal
 *
 * Public API:
 *   calc.calculate(inputs)         → full disclosure breakdown
 *   calc.chatbotScenarios(inputs)  → 3 term-comparison scenarios
 *   calc.SA_RATES                  → current rate constants
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   SOUTH AFRICA RATE CONSTANTS (March 2026)
   ══════════════════════════════════════════════════════════════ */
const SA_RATES = {
    // SARB prime lending rate — update when SARB changes it
    prime: 11.25,
    // Standard dealer spread above prime
    dealerSpread: 3.5,
    // Default rate = prime + spread
    get defaultRate() { return this.prime + this.dealerSpread; },

    // NCA-mandated fees (excl. VAT)
    initiationFeeExVat: 1207.50,
    vatRate: 0.15,
    get initiationFee() { return this.initiationFeeExVat * (1 + this.vatRate); }, // 1388.63

    // Monthly admin/service fee (excl. VAT)
    monthlyServiceFeeExVat: 69.00,
    get monthlyServiceFee() { return this.monthlyServiceFeeExVat * (1 + this.vatRate); }, // 79.35

    // Finance-linked credit life insurance: roughly 0.35% of outstanding balance per year
    // Expressed as a monthly rate per R1 of principal
    insuranceMonthlyRatePerRand: 0.0035 / 12,
};

/* ══════════════════════════════════════════════════════════════
   CORE PMT FORMULA (with balloon)
   ══════════════════════════════════════════════════════════════ */

/**
 * Standard annuity PMT formula, balloon-aware.
 *
 * @param {number} principal     - Loan amount (R)
 * @param {number} annualRate    - Annual interest rate (%)
 * @param {number} termMonths    - Loan term (months)
 * @param {number} balloonAmount - Balloon residual value (R), default 0
 * @returns {number} Monthly payment (R)
 */
function pmt(principal, annualRate, termMonths, balloonAmount = 0) {
    if (principal <= 0) return 0;
    const r = (annualRate / 100) / 12;
    if (r === 0) return (principal - balloonAmount) / termMonths;
    const pv = principal - balloonAmount * Math.pow(1 + r, -termMonths);
    return (pv * r) / (1 - Math.pow(1 + r, -termMonths));
}

/**
 * Calculate the APR (Newton-Raphson numerical approximation).
 * APR accounts for all fees included in the loan as required by NCR.
 *
 * @param {number} loanAmount    - Total financed amount incl. fees (R)
 * @param {number} monthlyPayment
 * @param {number} termMonths
 * @returns {number} APR as a percentage
 */
function calculateAPR(loanAmount, monthlyPayment, termMonths) {
    // Solve: PV = PMT × [1 - (1+r)^-n] / r  →  find r
    // Newton-Raphson iteration
    let r = 0.01; // initial guess: 1% per month
    for (let i = 0; i < 100; i++) {
        const f = monthlyPayment * (1 - Math.pow(1 + r, -termMonths)) / r - loanAmount;
        const df = monthlyPayment * (
            (1 - Math.pow(1 + r, -termMonths)) / (-r * r) +
            termMonths * Math.pow(1 + r, -termMonths - 1) / r
        );
        const r2 = r - f / df;
        if (Math.abs(r2 - r) < 1e-10) { r = r2; break; }
        r = r2;
    }
    return r * 12 * 100; // annualise
}

/* ══════════════════════════════════════════════════════════════
   MAIN CALCULATE FUNCTION
   ══════════════════════════════════════════════════════════════ */

/**
 * Full NCR-compliant finance calculation.
 *
 * @param {Object} inputs
 * @param {number} inputs.vehiclePrice    - OTR price (R)
 * @param {number} inputs.deposit         - Customer deposit (R), default 0
 * @param {number} inputs.termMonths      - 24|36|48|60|72|84
 * @param {number} inputs.annualRate      - Interest rate %, default SA_RATES.defaultRate
 * @param {number} inputs.balloonPct      - 0|10|20|30
 * @param {boolean} inputs.includeInsurance - include credit life estimate
 *
 * @returns {Object} Full NCA cost of credit disclosure
 */
function calculate({
    vehiclePrice,
    deposit = 0,
    termMonths = 72,
    annualRate = SA_RATES.defaultRate,
    balloonPct = 0,
    includeInsurance = true,
}) {
    // ── Validate ──
    if (!vehiclePrice || vehiclePrice <= 0) throw new Error('Vehicle price is required.');
    const VALID_TERMS = [24, 36, 48, 60, 72, 84];
    if (!VALID_TERMS.includes(termMonths)) throw new Error(`Term must be one of: ${VALID_TERMS.join(', ')} months.`);
    if (deposit < 0 || deposit >= vehiclePrice) throw new Error('Invalid deposit amount.');
    if (balloonPct < 0 || balloonPct > 30) throw new Error('Balloon % must be 0–30.');

    // ── Principal ──
    const loanPrincipal = vehiclePrice - deposit;              // before fees
    const initiationFee = SA_RATES.initiationFee;              // R1,388.63
    const totalPrincipal = loanPrincipal + initiationFee;      // what the bank finances

    // ── Balloon amount ──
    const balloonAmount = Math.round(vehiclePrice * (balloonPct / 100));

    // ── Monthly insurance estimate (on original principal) ──
    const monthlyInsurance = includeInsurance
        ? Math.round(loanPrincipal * SA_RATES.insuranceMonthlyRatePerRand * 100) / 100
        : 0;

    // ── PMT (finance instalment, excl. service fee & insurance) ──
    const financeInstalment = pmt(totalPrincipal, annualRate, termMonths, balloonAmount);

    // ── Monthly service fee ──
    const monthlyServiceFee = SA_RATES.monthlyServiceFee;     // R79.35

    // ── Total monthly payment ──
    const totalMonthly = financeInstalment + monthlyServiceFee + monthlyInsurance;

    // ── Cost of credit summary ──
    const totalInsurance = Math.round(monthlyInsurance * termMonths * 100) / 100;
    const totalServiceFees = Math.round(monthlyServiceFee * termMonths * 100) / 100;
    const totalFinanceInstalments = Math.round(financeInstalment * termMonths * 100) / 100;
    const totalRepayable = Math.round(totalMonthly * termMonths * 100) / 100 + balloonAmount;
    const totalInterest = Math.round((totalRepayable - vehiclePrice + deposit) * 100) / 100;
    const costOfCredit = Math.round((totalRepayable - loanPrincipal) * 100) / 100;

    // ── APR calculation (includes initiation fee in the loan) ──
    const apr = calculateAPR(totalPrincipal, financeInstalment, termMonths);

    // ── Balloon warning ──
    const balloonWarning = balloonPct > 0
        ? `A balloon payment of R${balloonAmount.toLocaleString('en-ZA')} is due at end of ${termMonths} months. ` +
        `This amount is NOT included in your monthly payment and must be settled in full at contract end. ` +
        `You may refinance the balloon, but this attracts additional interest and fees.`
        : null;

    // ── NCA compliant disclosure ──
    return {
        /* inputs echoed */
        inputs: {
            vehiclePrice,
            deposit,
            depositPct: Math.round((deposit / vehiclePrice) * 100 * 10) / 10,
            termMonths,
            annualRate,
            balloonPct,
            balloonAmount,
        },

        /* primary output — what customer sees */
        monthly: {
            total: Math.round(totalMonthly),
            financeInstalment: Math.round(financeInstalment),
            serviceFee: Math.round(monthlyServiceFee),
            insurance: Math.round(monthlyInsurance),
        },

        /* NCA Section 92 cost of credit disclosure */
        costOfCredit: {
            principalDebt: Math.round(loanPrincipal),
            initiationFee: Math.round(initiationFee),
            totalInterest: Math.round(totalInterest),
            totalServiceFees: Math.round(totalServiceFees),
            totalInsurance: Math.round(totalInsurance),
            totalRepayable: Math.round(totalRepayable),
            costOfCredit: Math.round(costOfCredit),
        },

        /* APR */
        apr: Math.round(apr * 100) / 100,
        nominalRate: annualRate,
        primeRate: SA_RATES.prime,
        rateAbovePrime: Math.round((annualRate - SA_RATES.prime) * 100) / 100,

        /* balloon */
        balloonWarning,

        /* fee breakdown */
        fees: {
            initiation: { exVat: SA_RATES.initiationFeeExVat, incVat: Math.round(initiationFee) },
            monthlyService: { exVat: SA_RATES.monthlyServiceFeeExVat, incVat: Math.round(monthlyServiceFee) },
            insurance: { monthly: Math.round(monthlyInsurance), total: Math.round(totalInsurance), basis: 'Credit life estimate — subject to insurer approval' },
        },

        /* regulatory notes */
        disclaimer: [
            'This is an estimate only and does not constitute a credit offer.',
            `APR of ${Math.round(apr * 100) / 100}% is calculated in accordance with the National Credit Act 34 of 2005.`,
            'Actual rate offered is subject to credit profile, income verification, and bank approval.',
            'Initiation fee: R1,207.50 excl. VAT. Monthly service fee: R69.00 excl. VAT.',
            'Credit life insurance is estimated and will be confirmed by the bank on approval.',
        ],
    };
}

/* ══════════════════════════════════════════════════════════════
   CHATBOT SCENARIOS (3-in-1 comparison)
   ══════════════════════════════════════════════════════════════ */

/**
 * Generate 3 term-comparison scenarios for chatbot display.
 * Returns a plain-text summary and structured data.
 *
 * @param {Object} inputs - Same as calculate()
 * @param {string} vehicleLabel - e.g. "Toyota Hilux 2.8 GD-6"
 * @returns {{ text, scenarios, primaryScenario }}
 */
function chatbotScenarios(inputs, vehicleLabel = 'this vehicle') {
    const terms = [48, 60, 72];
    const scenarios = terms.map(t => {
        const result = calculate({ ...inputs, termMonths: t });
        return {
            term: t,
            monthly: result.monthly.total,
            totalRepayable: result.costOfCredit.totalRepayable,
            totalInterest: result.costOfCredit.totalInterest,
            apr: result.apr,
        };
    });

    const primary = scenarios.find(s => s.term === (inputs.termMonths || 72)) || scenarios[2];
    const fmt = n => `R${Math.round(n).toLocaleString('en-ZA')}`;
    const depositStr = inputs.deposit > 0 ? ` with a ${fmt(inputs.deposit)} deposit` : ' with no deposit';
    const balloonStr = inputs.balloonPct > 0 ? ` (${inputs.balloonPct}% balloon)` : '';

    const text = [
        `💰 *Finance Estimate for ${vehicleLabel}*${depositStr}${balloonStr}\n`,
        ...scenarios.map(s =>
            `• *${s.term} months* → *${fmt(s.monthly)}/month* (Total: ${fmt(s.totalRepayable)} | Interest: ${fmt(s.totalInterest)})`
        ),
        `\n_These are estimates only, subject to bank approval and your credit profile. Includes R1,388.63 initiation fee + R79.35/month service fee + credit life insurance._`,
        `_APR: ${primary.apr}% (Prime ${SA_RATES.prime}% + ${Math.round((inputs.annualRate || SA_RATES.defaultRate) - SA_RATES.prime * 100) / 100}%)_`,
    ].join('\n');

    return { text, scenarios, primaryScenario: primary };
}

/* ══════════════════════════════════════════════════════════════
   WIDGET EMBED CODE GENERATOR
   ══════════════════════════════════════════════════════════════ */

/**
 * Generate the HTML embed snippet for external dealership websites.
 * @param {Object} config
 * @param {string} config.tenantId
 * @param {string} config.primaryColor   - hex
 * @param {string} config.dealershipName
 * @param {string} config.apiBase        - e.g. https://api.kenganauto.co.za
 * @returns {string} HTML snippet
 */
function generateEmbedCode({ tenantId, primaryColor = '#C9A84C', dealershipName = 'KenganAuto', apiBase = 'https://api.kenganauto.co.za' }) {
    return `<!-- KenganAuto Finance Calculator Widget -->
<div id="ka-finance-widget"></div>
<script>
  window.KAFinanceConfig = {
    tenantId: "${tenantId}",
    dealershipName: "${dealershipName}",
    primaryColor: "${primaryColor}",
    apiBase: "${apiBase}"
  };
</script>
<script src="${apiBase}/public/finance-widget.js" async></script>`;
}

module.exports = {
    calculate,
    chatbotScenarios,
    generateEmbedCode,
    pmt,
    SA_RATES,
};
