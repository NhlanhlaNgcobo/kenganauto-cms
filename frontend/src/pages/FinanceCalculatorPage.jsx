/**
 * Finance Calculator Page — /finance/calculator
 * ═══════════════════════════════════════════════
 * Standalone page in the KenganAuto dashboard.
 * Full-width two-column layout:
 *   Left  — FinanceCalculator component (all inputs + NCA table)
 *   Right — Comparison scenarios, rate info, embed widget code
 */
import React, { useState, useCallback } from 'react';
import {
    Calculator, TrendingUp, Info, Zap, Share2,
    BarChart2, Clock, Shield, ChevronRight, ArrowUpRight
} from 'lucide-react';
import FinanceCalculator from '../components/FinanceCalculator';

/* ── Rate comparison data ── */
const SA_PRIME = 11.25;
const BANKS = [
    { name: 'WesBank', rate: SA_PRIME + 3.0, note: 'Typically 3% above prime' },
    { name: 'ABSA', rate: SA_PRIME + 3.5, note: 'Standard new vehicle rate' },
    { name: 'FNB', rate: SA_PRIME + 3.5, note: 'Subject to NCA linked rate' },
    { name: 'Standard Bank', rate: SA_PRIME + 4.0, note: 'Varies on credit profile' },
    { name: 'Nedbank', rate: SA_PRIME + 3.5, note: 'Green vehicle discount avail.' },
    { name: 'MFC (Nedbank)', rate: SA_PRIME + 2.5, note: 'Dealer preferred partner' },
];

/* ── NCA quick facts ── */
const NCA_FACTS = [
    { title: 'Initiation Fee', value: 'R 1,388.63', desc: 'R1,207.50 + 15% VAT · NCR regulated · one-off' },
    { title: 'Monthly Service Fee', value: 'R 79.35', desc: 'R69.00 + 15% VAT · included every payment' },
    { title: 'Current Prime Rate', value: `${SA_PRIME}%`, desc: 'SARB MPC · March 2026' },
    { title: 'Standard Dealer Rate', value: `${SA_PRIME + 3.5}%`, desc: 'Prime + 3.5% (linked rate)' },
    { title: 'Maximum Balloon', value: '30%', desc: 'NCA section 100A cap' },
    { title: 'Max Term', value: '84 months', desc: 'NCA regulated limit for vehicles' },
];

/* ════════════════════════════════════════════════════════════ */
export default function FinanceCalculatorPage() {
    const [applyResult, setApplyResult] = useState(null);

    const handleApply = useCallback((result) => {
        setApplyResult(result);
        // Scroll to top of page
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // In a real app: navigate to /finance/apply or open modal
    }, []);

    return (
        <div className="flex flex-col min-h-screen" style={{ background: 'transparent' }}>

            {/* ── Header ── */}
            <header className="flex-shrink-0 px-8 py-5 flex items-center justify-between sticky top-0 z-40"
                style={{
                    background: 'rgba(10,15,30,0.85)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(201,168,76,0.08)',
                    boxShadow: '0 4px 40px rgba(0,0,0,0.4)',
                }}>
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center font-outfit font-black text-sm"
                        style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.07))', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>
                        KA
                    </div>
                    <div>
                        <h1 className="font-outfit font-black text-xl tracking-tight">
                            <span className="text-white">Finance</span>
                            <span className="ml-2 gold-text">Calculator</span>
                        </h1>
                        <p className="text-[11px] tracking-[0.25em] uppercase mt-0.5" style={{ color: 'rgba(201,168,76,0.8)' }}>
                            NCA · NCR Compliant · South Africa
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold"
                        style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ADE80' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: 'none' }} />
                        NCR Reg. Active
                    </div>
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[12px] uppercase tracking-wider transition-all"
                        style={{
                            background: 'linear-gradient(135deg,#C9A84C,#9A7830)',
                            color: '#0A0F1E',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.35), 0 8px 20px rgba(0,0,0,0.3)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 28px rgba(201,168,76,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(201,168,76,0.25)'; e.currentTarget.style.transform = 'none'; }}>
                        Apply Now <ArrowUpRight size={14} />
                    </button>
                </div>
            </header>

            {/* ── Apply success banner ── */}
            {applyResult && (
                <div className="mx-8 mt-4 p-4 rounded-2xl flex items-center justify-between anim-fade-up"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div>
                        <p className="text-sm font-black text-green-400">Finance Quote Ready!</p>
                        <p className="text-xs text-white/58 mt-0.5">
                            Monthly: R{applyResult.monthly.toLocaleString()} | APR: {applyResult.apr}% | Total: R{applyResult.totalRepayable.toLocaleString()}
                        </p>
                    </div>
                    <button className="px-5 py-2.5 rounded-xl text-sm font-bold"
                        style={{ background: 'rgba(34,197,94,0.15)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.3)' }}>
                        Start Application →
                    </button>
                </div>
            )}

            {/* ── Main Content ── */}
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 anim-fade-up">

                    {/* ══ LEFT: Calculator ══ */}
                    <FinanceCalculator
                        initialPrice={750000}
                        initialDeposit={75000}
                        onApply={handleApply}
                    />

                    {/* ══ RIGHT: Info Panels ══ */}
                    <div className="space-y-6">

                        {/* SA Bank Rate Comparison */}
                        <div className="luxury-card p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2.5 rounded-xl" style={{ background: 'rgba(59,127,245,0.1)', border: '1px solid rgba(59,127,245,0.2)' }}>
                                    <BarChart2 size={16} style={{ color: '#60A5FA' }} />
                                </div>
                                <div>
                                    <h2 className="font-outfit font-bold text-base text-white">SA Bank Rate Comparison</h2>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {BANKS.map((bank, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-default"
                                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.04)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.1)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white">{bank.name}</p>
                                            <p className="text-[12px]" style={{ color: 'rgba(240,237,232,0.62)' }}>{bank.note}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-black" style={{ color: '#C9A84C' }}>{bank.rate.toFixed(2)}%</p>
                                            <p className="text-[12px]" style={{ color: 'rgba(240,237,232,0.62)' }}>
                                                Prime +{(bank.rate - SA_PRIME).toFixed(1)}%
                                            </p>
                                        </div>
                                        {/* Rate bar */}
                                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                            <div className="h-full rounded-full"
                                                style={{
                                                    width: `${((bank.rate - SA_PRIME) / 5) * 100}%`,
                                                    background: bank.rate <= SA_PRIME + 3 ? '#22C55E' : bank.rate <= SA_PRIME + 3.5 ? '#C9A84C' : '#F87171'
                                                }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[12px] mt-4" style={{ color: 'rgba(240,237,232,0.62)' }}>
                                Rates are indicative and vary based on applicant credit profile, vehicle type, age, and value. Prime rate: {SA_PRIME}% (SARB · March 2026).
                            </p>
                        </div>

                        {/* NCA Quick Reference */}
                        <div className="luxury-card p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2.5 rounded-xl" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                                    <Shield size={16} style={{ color: '#4ADE80' }} />
                                </div>
                                <div>
                                    <h2 className="font-outfit font-bold text-base text-white">NCA Quick Reference</h2>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {NCA_FACTS.map((fact, i) => (
                                    <div key={i} className="p-3 rounded-xl"
                                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <p className="text-[11px] font-black uppercase tracking-widest mb-1"
                                            style={{ color: 'rgba(240,237,232,0.62)' }}>{fact.title}</p>
                                        <p className="font-outfit font-black text-lg text-white">{fact.value}</p>
                                        <p className="text-[12px] mt-1" style={{ color: 'rgba(240,237,232,0.62)' }}>{fact.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Finance Tips */}
                        <div className="luxury-card p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2.5 rounded-xl" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                                    <Zap size={16} style={{ color: '#C9A84C' }} />
                                </div>
                                <div>
                                    <h2 className="font-outfit font-bold text-base text-white">Maximise Your Finance Deal</h2>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { tip: 'Increase your deposit to 20%+', impact: 'Reduces rate risk', color: '#22C55E' },
                                    { tip: 'Avoid 30% balloon unless you plan to sell/trade', impact: 'Higher total cost', color: '#F87171' },
                                    { tip: 'Pre-qualify before visiting the dealership', impact: 'Strong negotiating position', color: '#C9A84C' },
                                    { tip: 'Request a linked (variable) rate in a falling market', impact: 'Rate follows prime down', color: '#60A5FA' },
                                    { tip: 'FICA documents ready: ID, 3 months payslips, 3 months bank statements', impact: 'Faster approval', color: '#A855F7' },
                                ].map(({ tip, impact, color }, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-1 h-1 rounded-full flex-shrink-0 mt-2" style={{ background: color }} />
                                        <div>
                                            <p className="text-xs font-bold text-white/70">{tip}</p>
                                            <p className="text-[12px]" style={{ color: 'rgba(240,237,232,0.62)' }}>{impact}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Embed Widget CTA */}
                        <div className="rounded-2xl p-6 relative overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, #060A14, #0D1526)',
                                border: '1px solid rgba(59,127,245,0.2)',
                            }}>
                            <div className="absolute top-0 left-0 right-0 h-px"
                                style={{ background: 'linear-gradient(90deg, transparent, rgba(59,127,245,0.4), transparent)' }} />
                            <div className="flex items-center gap-3 mb-3">
                                <Share2 size={16} style={{ color: '#60A5FA' }} />
                                <h2 className="font-outfit font-bold text-base text-white">Dealership Website Widget</h2>
                            </div>
                            <p className="text-xs leading-relaxed mb-4" style={{ color: 'rgba(240,237,232,0.62)' }}>
                                Add a branded finance calculator to your dealership website with one line of code.
                                Captures leads directly into your KenganAuto CRM.
                            </p>
                            <button className="flex items-center gap-2 text-sm font-bold transition-all"
                                style={{ color: '#60A5FA' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#93C5FD'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#60A5FA'; e.currentTarget.style.transform = 'none'; }}>
                                Get Embed Code <ChevronRight size={15} />
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
