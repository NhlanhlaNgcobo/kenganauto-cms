/**
 * FinanceCalculator — KenganAuto (Full SA NCR/NCA Compliant)
 * ══════════════════════════════════════════════════════════
 * Reusable component used in:
 *   1. Finance Console page (existing /finance)
 *   2. Standalone /finance/calculator page
 *   3. Chatbot embed trigger (compact mode)
 *
 * Props:
 *   initialPrice    {number}  - pre-fill vehicle price from stock
 *   initialDeposit  {number}  - pre-fill deposit
 *   compact         {boolean} - compact chatbot mode (hides NCA table)
 *   onApply         {fn}      - callback when "Apply" is clicked, receives result
 *   className       {string}  - extra classes
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Calculator, Info, ChevronDown, AlertTriangle,
    ShieldCheck, ArrowUpRight, RefreshCw, Copy, Check,
    TrendingUp, DollarSign, Percent
} from 'lucide-react';

/* ── SA rate constants (mirrors backend SA_RATES) ── */
const SA_RATES = {
    prime: 11.25,
    dealerSpread: 3.5,
    get defaultRate() { return this.prime + this.dealerSpread; },
    initiationFee: 1388.63,    // R1,207.50 + 15% VAT
    monthlyServiceFee: 79.35,  // R69 + 15% VAT
    insuranceRate: 0.0035 / 12,
};

const VALID_TERMS = [24, 36, 48, 60, 72, 84];
const BALLOON_OPTIONS = [0, 10, 20, 30];

/* ── Pure JS calculation (mirrors backend engine) ── */
function pmtCalc(principal, annualRate, termMonths, balloonAmount = 0) {
    if (principal <= 0) return 0;
    const r = (annualRate / 100) / 12;
    if (r === 0) return (principal - balloonAmount) / termMonths;
    const pv = principal - balloonAmount * Math.pow(1 + r, -termMonths);
    return (pv * r) / (1 - Math.pow(1 + r, -termMonths));
}

function calcAll({ vehiclePrice, deposit, termMonths, annualRate, balloonPct, includeInsurance }) {
    const loanPrincipal = vehiclePrice - deposit;
    const totalPrincipal = loanPrincipal + SA_RATES.initiationFee;
    const balloonAmount = Math.round(vehiclePrice * (balloonPct / 100));
    const monthlyInsurance = includeInsurance
        ? Math.round(loanPrincipal * SA_RATES.insuranceRate * 100) / 100 : 0;
    const financeInstalment = pmtCalc(totalPrincipal, annualRate, termMonths, balloonAmount);
    const totalMonthly = financeInstalment + SA_RATES.monthlyServiceFee + monthlyInsurance;
    const totalRepayable = Math.round(totalMonthly * termMonths) + balloonAmount;
    const totalInterest = totalRepayable - vehiclePrice + deposit;
    const costOfCredit = totalRepayable - loanPrincipal;

    // APR (Newton-Raphson)
    let r = 0.01;
    for (let i = 0; i < 80; i++) {
        const f = financeInstalment * (1 - Math.pow(1 + r, -termMonths)) / r - totalPrincipal;
        const df = financeInstalment * ((1 - Math.pow(1 + r, -termMonths)) / (-r * r) + termMonths * Math.pow(1 + r, -termMonths - 1) / r);
        const r2 = r - f / df;
        if (Math.abs(r2 - r) < 1e-10) { r = r2; break; }
        r = Math.max(0.0001, r2);
    }
    const apr = Math.round(r * 12 * 100 * 100) / 100;

    return {
        monthly: Math.round(totalMonthly),
        financeInstalment: Math.round(financeInstalment),
        serviceFee: Math.round(SA_RATES.monthlyServiceFee),
        insurance: Math.round(monthlyInsurance),
        totalRepayable: Math.round(totalRepayable),
        totalInterest: Math.round(totalInterest),
        costOfCredit: Math.round(costOfCredit),
        balloonAmount,
        apr,
        depositPct: vehiclePrice > 0 ? Math.round((deposit / vehiclePrice) * 1000) / 10 : 0,
    };
}

function fmt(n) {
    return `R ${Math.round(n).toLocaleString('en-ZA')}`;
}

/* ── Slider component ── */
function LuxSlider({ label, value, min, max, step, onChange, display, hint }) {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em]"
                    style={{ color: 'rgba(240,237,232,0.35)' }}>{label}</label>
                <span className="text-sm font-outfit font-black" style={{ color: '#C9A84C' }}>{display}</span>
            </div>
            <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="absolute left-0 top-0 h-full rounded-full"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #9A7830, #C9A84C)' }} />
                <input type="range" min={min} max={max} step={step} value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 pointer-events-none"
                    style={{ left: `${pct}%`, transform: `translate(-50%, -50%)`, background: '#C9A84C', borderColor: '#0A0F1E' }} />
            </div>
            {hint && <div className="flex justify-between text-[9px] font-bold" style={{ color: 'rgba(240,237,232,0.2)' }}>
                {hint}
            </div>}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
export default function FinanceCalculator({
    initialPrice = 750000,
    initialDeposit = 75000,
    compact = false,
    onApply = null,
    className = '',
}) {
    const [vehiclePrice, setVehiclePrice] = useState(initialPrice);
    const [deposit, setDeposit] = useState(initialDeposit);
    const [term, setTerm] = useState(72);
    const [rate, setRate] = useState(SA_RATES.defaultRate);
    const [balloonPct, setBalloonPct] = useState(0);
    const [includeInsurance, setIncludeInsurance] = useState(true);
    const [showNCA, setShowNCA] = useState(!compact);
    const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);
    const [copied, setCopied] = useState(false);

    /* input mode: slider | manual */
    const [depositMode, setDepositMode] = useState('pct'); // 'pct' | 'amount'
    const [depositPctInput, setDepositPctInput] = useState(10);

    const result = calcAll({ vehiclePrice, deposit, termMonths: term, annualRate: rate, balloonPct, includeInsurance });

    /* Sync deposit pct slider with deposit amount */
    useEffect(() => {
        if (depositMode === 'pct') {
            setDeposit(Math.round(vehiclePrice * depositPctInput / 100));
        }
    }, [vehiclePrice, depositPctInput, depositMode]);

    const handleDepositAmountChange = (val) => {
        setDeposit(val);
        setDepositPctInput(vehiclePrice > 0 ? Math.round((val / vehiclePrice) * 100) : 0);
    };

    /* Copy embed code */
    const handleCopyEmbed = async () => {
        const snippet = `<!-- KenganAuto Finance Calculator -->
<div id="ka-finance-widget"></div>
<script src="https://api.kenganauto.co.za/public/finance-widget.js" data-tenant="YOUR_TENANT_ID" async></script>`;
        await navigator.clipboard.writeText(snippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    /* ── Term selector pills ── */
    const TermPills = () => (
        <div className="flex gap-2 flex-wrap">
            {VALID_TERMS.map(t => (
                <button key={t}
                    onClick={() => setTerm(t)}
                    className="flex-1 min-w-fit py-2 rounded-xl text-xs font-black transition-all"
                    style={{
                        background: term === t ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${term === t ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.07)'}`,
                        color: term === t ? '#C9A84C' : 'rgba(240,237,232,0.4)',
                    }}>
                    {t}m
                </button>
            ))}
        </div>
    );

    /* ── Balloon selector pills ── */
    const BalloonPills = () => (
        <div className="flex gap-2">
            {BALLOON_OPTIONS.map(b => (
                <button key={b}
                    onClick={() => setBalloonPct(b)}
                    className="flex-1 py-2 rounded-xl text-xs font-black transition-all"
                    style={{
                        background: balloonPct === b ? (b > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(201,168,76,0.15)') : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${balloonPct === b ? (b > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(201,168,76,0.4)') : 'rgba(255,255,255,0.07)'}`,
                        color: balloonPct === b ? (b > 0 ? '#F87171' : '#C9A84C') : 'rgba(240,237,232,0.4)',
                    }}>
                    {b}%
                </button>
            ))}
        </div>
    );

    return (
        <div className={`luxury-card p-7 ${className}`}>
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-7">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                        <Calculator size={20} style={{ color: '#C9A84C' }} />
                    </div>
                    <div>
                        <h3 className="font-outfit font-black text-xl text-white">Finance Calculator</h3>
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5" style={{ color: 'rgba(201,168,76,0.4)' }}>
                            NCA Compliant · ZAR · Prime {SA_RATES.prime}%
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold"
                    style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ADE80' }}>
                    <ShieldCheck size={11} /> NCR Compliant
                </div>
            </div>

            <div className="space-y-6">
                {/* ── Vehicle Price ── */}
                <LuxSlider
                    label="Vehicle Price (OTR)"
                    value={vehiclePrice}
                    min={100000} max={3000000} step={25000}
                    onChange={setVehiclePrice}
                    display={`R ${vehiclePrice.toLocaleString('en-ZA')}`}
                    hint={<><span>R 100k</span><span>R 3M</span></>}
                />

                <div className="h-px" style={{ background: 'rgba(201,168,76,0.08)' }} />

                {/* ── Deposit ── */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]"
                            style={{ color: 'rgba(240,237,232,0.35)' }}>Deposit</span>
                        <div className="flex gap-1">
                            {['pct', 'amount'].map(mode => (
                                <button key={mode} onClick={() => setDepositMode(mode)}
                                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all"
                                    style={{
                                        background: depositMode === mode ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                                        color: depositMode === mode ? '#C9A84C' : 'rgba(240,237,232,0.3)',
                                    }}>
                                    {mode === 'pct' ? '%' : 'R'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {depositMode === 'pct' ? (
                        <LuxSlider
                            label="" value={depositPctInput}
                            min={0} max={30} step={1}
                            onChange={setDepositPctInput}
                            display={`${depositPctInput}% · ${fmt(deposit)}`}
                            hint={<><span>0%</span><span>30%</span></>}
                        />
                    ) : (
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                                style={{ color: '#C9A84C' }}>R</span>
                            <input type="number" value={deposit}
                                onChange={e => handleDepositAmountChange(Math.min(vehiclePrice * 0.5, Math.max(0, Number(e.target.value))))}
                                className="lux-input text-sm pl-8 w-full"
                                step={5000} min={0} max={vehiclePrice * 0.5} />
                        </div>
                    )}
                    <p className="text-[10px]" style={{ color: 'rgba(240,237,232,0.25)' }}>
                        Loan principal: {fmt(vehiclePrice - deposit)} · Incl. initiation fee: {fmt(vehiclePrice - deposit + SA_RATES.initiationFee)}
                    </p>
                </div>

                <div className="h-px" style={{ background: 'rgba(201,168,76,0.08)' }} />

                {/* ── Term, Rate, Balloon ── */}
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2"
                            style={{ color: 'rgba(240,237,232,0.35)' }}>Loan Term</p>
                        <TermPills />
                    </div>

                    {/* Interest rate — editable */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]"
                                style={{ color: 'rgba(240,237,232,0.35)' }}>Interest Rate (APR est.)</p>
                            <span className="text-[10px]" style={{ color: 'rgba(240,237,232,0.25)' }}>
                                Prime {SA_RATES.prime}% + {Math.round((rate - SA_RATES.prime) * 10) / 10}%
                            </span>
                        </div>
                        <div className="flex gap-2 items-center">
                            <input type="number" value={rate} min={8} max={28} step={0.25}
                                onChange={e => setRate(Math.max(8, Math.min(28, Number(e.target.value))))}
                                className="lux-input text-sm flex-1" />
                            <span className="text-sm font-black" style={{ color: '#C9A84C' }}>%</span>
                            <button onClick={() => setRate(SA_RATES.defaultRate)}
                                className="px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all"
                                style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.15)', color: 'rgba(201,168,76,0.6)' }}>
                                Reset
                            </button>
                        </div>
                    </div>

                    {/* Balloon */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]"
                                style={{ color: 'rgba(240,237,232,0.35)' }}>Balloon Payment</p>
                            {balloonPct > 0 && (
                                <span className="text-[10px] font-bold" style={{ color: '#F87171' }}>
                                    ⚠ {fmt(result.balloonAmount)} due at end
                                </span>
                            )}
                        </div>
                        <BalloonPills />
                    </div>
                </div>

                {/* ── Insurance toggle ── */}
                <div className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                        <p className="text-xs font-bold text-white/70">Include Credit Life Insurance</p>
                        <p className="text-[10px]" style={{ color: 'rgba(240,237,232,0.25)' }}>
                            ≈ {fmt(result.insurance)}/month estimate
                        </p>
                    </div>
                    <button onClick={() => setIncludeInsurance(p => !p)}
                        className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
                        style={{ background: includeInsurance ? '#C9A84C' : 'rgba(255,255,255,0.1)' }}>
                        <span className="absolute top-0.5 transition-all w-5 h-5 rounded-full bg-white shadow"
                            style={{ left: includeInsurance ? '1.375rem' : '0.125rem' }} />
                    </button>
                </div>

                <div className="h-px" style={{ background: 'rgba(201,168,76,0.08)' }} />

                {/* ══ RESULT PANEL ══ */}
                <div className="rounded-2xl p-6 relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, #070C1A 0%, #0D1F3C 100%)',
                        border: '1px solid rgba(201,168,76,0.25)',
                        boxShadow: '0 0 60px rgba(201,168,76,0.04)',
                    }}>
                    {/* Top shine */}
                    <div className="absolute top-0 left-0 right-0 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)' }} />

                    <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1"
                        style={{ color: 'rgba(201,168,76,0.45)' }}>
                        Estimated Monthly Repayment
                    </p>
                    <div className="flex items-end gap-3 mb-5">
                        <h2 className="font-outfit font-black text-5xl text-white">
                            R{result.monthly.toLocaleString('en-ZA')}
                        </h2>
                        <span className="text-sm mb-2" style={{ color: 'rgba(240,237,232,0.3)' }}>/month</span>
                    </div>

                    {/* Monthly breakdown */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                            { label: 'Finance', value: result.financeInstalment },
                            { label: 'Service Fee', value: result.serviceFee },
                            { label: 'Insurance', value: result.insurance },
                        ].map(({ label, value }) => (
                            <div key={label} className="p-2 rounded-xl text-center"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <p className="text-[9px] font-bold uppercase tracking-widest mb-1"
                                    style={{ color: 'rgba(240,237,232,0.3)' }}>{label}</p>
                                <p className="text-xs font-black text-white">R{value.toLocaleString('en-ZA')}</p>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl p-3"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <p className="text-[9px] font-bold uppercase tracking-widest mb-1"
                                style={{ color: 'rgba(240,237,232,0.3)' }}>Total Repayable</p>
                            <p className="font-outfit font-bold text-base text-white">
                                R{result.totalRepayable.toLocaleString('en-ZA')}
                            </p>
                        </div>
                        <div className="rounded-xl p-3"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <p className="text-[9px] font-bold uppercase tracking-widest mb-1"
                                style={{ color: 'rgba(240,237,232,0.3)' }}>Total Interest</p>
                            <p className="font-outfit font-bold text-base" style={{ color: '#F87171' }}>
                                R{result.totalInterest.toLocaleString('en-ZA')}
                            </p>
                        </div>
                    </div>

                    {/* APR badge */}
                    <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-xl w-fit"
                        style={{ background: 'rgba(59,127,245,0.08)', border: '1px solid rgba(59,127,245,0.15)' }}>
                        <Percent size={11} style={{ color: '#60A5FA' }} />
                        <p className="text-[10px] font-bold" style={{ color: 'rgba(240,237,232,0.5)' }}>
                            APR <span className="text-white">{result.apr}%</span> · Prime {SA_RATES.prime}% + {Math.round((rate - SA_RATES.prime) * 10) / 10}% · Subject to bank approval
                        </p>
                    </div>
                </div>

                {/* ── Balloon Warning ── */}
                {balloonPct > 0 && (
                    <div className="p-4 rounded-xl"
                        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-black text-red-400 mb-1">Balloon Payment Warning</p>
                                <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(248,113,113,0.7)' }}>
                                    A lump sum of <strong>{fmt(result.balloonAmount)}</strong> is due at the end of Month {term}.
                                    This is NOT included in your monthly payment and must be settled in full, refinanced, or the vehicle must be sold.
                                    Balloon loans carry higher total cost of credit.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── NCA Section 92 Cost of Credit Disclosure ── */}
                {!compact && (
                    <div>
                        <button onClick={() => setShowNCA(p => !p)}
                            className="flex items-center gap-2 w-full text-[10px] font-black uppercase tracking-widest mb-3 hover:opacity-70 transition-opacity"
                            style={{ color: 'rgba(240,237,232,0.3)' }}>
                            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                            <span className="flex-shrink-0 flex items-center gap-1.5">
                                <ShieldCheck size={10} />
                                {showNCA ? 'Hide' : 'Show'} NCA Cost of Credit Summary
                                <ChevronDown size={10} style={{ transform: showNCA ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </span>
                            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        </button>

                        {showNCA && (
                            <div className="rounded-2xl overflow-hidden"
                                style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="px-4 py-3"
                                    style={{ background: 'rgba(74,222,128,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={12} style={{ color: '#4ADE80' }} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#4ADE80' }}>
                                            NCA Section 92 — Pre-Agreement Cost of Credit
                                        </p>
                                    </div>
                                </div>
                                <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
                                    {[
                                        { label: 'Principal Debt', value: fmt(vehiclePrice - deposit), note: 'Vehicle price less deposit' },
                                        { label: 'Initiation Fee', value: `R 1,388.63`, note: 'R1,207.50 + 15% VAT (NCA-regulated)' },
                                        { label: 'Total Interest', value: fmt(result.totalInterest), note: `At ${rate}% p.a. over ${term} months`, warn: true },
                                        { label: 'Monthly Service Fees', value: fmt(SA_RATES.monthlyServiceFee * term), note: `R79.35/month × ${term} months (R69 + VAT)` },
                                        { label: 'Credit Life Insurance', value: fmt(result.insurance * term), note: 'Estimate — confirmed on approval' },
                                        ...(balloonPct > 0 ? [{ label: 'Balloon Payment', value: fmt(result.balloonAmount), note: `Due at Month ${term}`, warn: true }] : []),
                                        { label: 'Total Cost of Credit', value: fmt(result.costOfCredit), note: 'Everything above the principal', bold: true },
                                        { label: 'Total Amount Repayable', value: fmt(result.totalRepayable), note: 'All payments including balloon', bold: true },
                                    ].map(({ label, value, note, warn, bold }) => (
                                        <div key={label} className="flex items-start justify-between gap-4 px-4 py-3"
                                            style={{ background: bold ? 'rgba(201,168,76,0.04)' : 'transparent' }}>
                                            <div>
                                                <p className={`text-xs ${bold ? 'font-black text-white' : 'text-white/70'}`}>{label}</p>
                                                <p className="text-[9px] mt-0.5" style={{ color: 'rgba(240,237,232,0.25)' }}>{note}</p>
                                            </div>
                                            <span className={`text-sm flex-shrink-0 ${bold ? 'font-black text-white' : warn ? 'font-bold text-red-400' : 'font-bold text-white/70'}`}>
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="px-4 py-3 text-[9px] leading-relaxed"
                                    style={{ background: 'rgba(255,255,255,0.02)', color: 'rgba(240,237,232,0.25)' }}>
                                    This disclosure is provided in terms of Section 92 of the National Credit Act 34 of 2005. APR: {result.apr}%.
                                    These figures are estimates only and do not constitute a credit offer. Actual rates subject to FICA, credit check, and bank approval.
                                    National Credit Regulator registration number on file.
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Fee Breakdown toggle ── */}
                {!compact && (
                    <div>
                        <button onClick={() => setShowFeeBreakdown(p => !p)}
                            className="flex items-center gap-2 text-[10px] text-white/20 hover:text-white/40 transition-colors">
                            <Info size={11} />
                            {showFeeBreakdown ? 'Hide' : 'Show'} fee details (NCA-regulated)
                            <ChevronDown size={10} style={{ transform: showFeeBreakdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                        {showFeeBreakdown && (
                            <div className="mt-3 p-4 rounded-xl space-y-2 text-[11px]"
                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="flex justify-between"><span className="text-white/40">Initiation fee (ex VAT)</span><span className="text-white/60">R 1,207.50</span></div>
                                <div className="flex justify-between"><span className="text-white/40">VAT at 15%</span><span className="text-white/60">R 181.13</span></div>
                                <div className="flex justify-between font-bold"><span className="text-white/60">Total Initiation (incl. VAT)</span><span className="text-white">R 1,388.63</span></div>
                                <div className="h-px my-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                <div className="flex justify-between"><span className="text-white/40">Monthly service fee (ex VAT)</span><span className="text-white/60">R 69.00</span></div>
                                <div className="flex justify-between"><span className="text-white/40">VAT at 15%</span><span className="text-white/60">R 10.35</span></div>
                                <div className="flex justify-between font-bold"><span className="text-white/60">Monthly service (incl. VAT)</span><span className="text-white">R 79.35</span></div>
                                <div className="h-px my-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                <p className="text-[10px] text-white/20">Fees are regulated by the National Credit Act and may not be altered by the dealership.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── CTA ── */}
                <button
                    onClick={() => onApply ? onApply(result) : undefined}
                    className="w-full py-4 font-outfit font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 rounded-2xl transition-all group"
                    style={{
                        background: 'linear-gradient(135deg, #C9A84C 0%, #9A7830 100%)',
                        color: '#0A0F1E',
                        boxShadow: '0 8px 32px rgba(201,168,76,0.2)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(201,168,76,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(201,168,76,0.2)'; e.currentTarget.style.transform = 'none'; }}>
                    Start Finance Pre-Qualification
                    <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>

                {/* ── Embed Widget ── */}
                {!compact && (
                    <div className="p-4 rounded-xl"
                        style={{ background: 'rgba(59,127,245,0.05)', border: '1px solid rgba(59,127,245,0.12)' }}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(96,165,250,0.7)' }}>
                                Embed on Your Website
                            </p>
                            <button onClick={handleCopyEmbed}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                                style={{ background: 'rgba(59,127,245,0.12)', color: '#60A5FA' }}>
                                {copied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy Snippet</>}
                            </button>
                        </div>
                        <pre className="text-[9px] leading-relaxed overflow-x-auto rounded-lg p-2"
                            style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(240,237,232,0.35)', fontFamily: 'monospace' }}>
                            {`<div id="ka-finance-widget"></div>
<script src="https://api.kenganauto.co.za/
  public/finance-widget.js"
  data-tenant="YOUR_TENANT_ID" async>
</script>`}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
