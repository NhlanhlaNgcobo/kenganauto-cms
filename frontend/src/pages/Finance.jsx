import React from 'react';
import FinanceCalculator from '../components/FinanceCalculator';
import {
    Landmark, FileCheck, ShieldCheck, PhoneCall, ArrowUpRight,
    Bell, HelpCircle, ChevronRight, Search, TrendingUp
} from 'lucide-react';

const FinancePage = () => {
    const banks = ['Absa', 'Nedbank', 'Standard Bank', 'FNB', 'WesBank', 'MFC'];

    const pipeline = [
        { title: 'Credit Score Retrieval (TransUnion)', status: 'Complete', icon: FileCheck, color: '#4ADE80', bg: 'rgba(74,222,128,0.08)' },
        { title: 'Income & Expense Verification', status: 'Pending Upload', icon: Landmark, color: '#C9A84C', bg: 'rgba(201,168,76,0.08)' },
        { title: 'POPIA Multi-dealership Check', status: 'Draft', icon: ShieldCheck, color: '#60A5FA', bg: 'rgba(96,165,250,0.08)' },
    ];

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
                            <span className="ml-2 gold-text">Console</span>
                        </h1>
                        <p className="text-[11px] tracking-[0.25em] uppercase mt-0.5" style={{ color: 'rgba(201,168,76,0.8)' }}>
                            Credit · Banking · Compliance
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold"
                        style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ADE80' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: 'none' }} />
                        POPIA Compliant
                    </div>
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[12px] uppercase tracking-wider transition-all"
                        style={{
                            background: 'linear-gradient(135deg,#C9A84C,#9A7830)',
                            color: '#0A0F1E',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.35), 0 8px 20px rgba(0,0,0,0.3)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 28px rgba(201,168,76,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(201,168,76,0.25)'; e.currentTarget.style.transform = 'none'; }}>
                        New Application <ArrowUpRight size={14} />
                    </button>
                </div>
            </header>

            {/* ── Content ── */}
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8 anim-fade-up">

                    {/* Left: Calculator + Pipeline */}
                    <div className="space-y-8">
                        <FinanceCalculator />

                        {/* Pipeline Workflow */}
                        <div className="luxury-card p-7">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(201,168,76,0.8)' }}>
                                        Workflow
                                    </p>
                                    <h2 className="font-outfit font-bold text-lg text-white">Pipeline Status</h2>
                                </div>
                                <button className="text-[11px] font-bold uppercase tracking-wider transition-colors"
                                    style={{ color: 'rgba(201,168,76,0.8)' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(201,168,76,0.5)'}>
                                    View Queue
                                </button>
                            </div>

                            <div className="space-y-3">
                                {pipeline.map((step, i) => (
                                    <div key={i}
                                        className="flex items-center justify-between p-4 rounded-xl cursor-pointer group transition-all"
                                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = `${step.color}30`; e.currentTarget.style.background = step.bg; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}>
                                        <div className="flex items-center gap-4">
                                            <div className="p-2.5 rounded-xl transition-transform group-hover:scale-110"
                                                style={{ background: step.bg, border: `1px solid ${step.color}25` }}>
                                                <step.icon size={16} style={{ color: step.color }} />
                                            </div>
                                            <span className="font-semibold text-sm text-white">{step.title}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full"
                                                style={{ background: step.bg, color: step.color }}>
                                                {step.status}
                                            </span>
                                            <ChevronRight size={13} style={{ color: 'rgba(240,237,232,0.62)' }} className="group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Banks + POPIA */}
                    <div className="space-y-8 xl:sticky xl:top-6 xl:self-start">

                        {/* Bank Connectivity Hub */}
                        <div className="luxury-card p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-[0.025] pointer-events-none">
                                <Landmark size={220} style={{ color: '#C9A84C' }} />
                            </div>
                            <div className="relative z-10">
                                <h2 className="font-outfit font-black text-2xl text-white mb-1">Bank Connectivity Hub</h2>
                                <p className="text-[12px] mb-8" style={{ color: 'rgba(240,237,232,0.62)' }}>
                                    Secure transmission via KenganAuto Gateway
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    {banks.map((bank, i) => (
                                        <button key={i}
                                            className="py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-center transition-all"
                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(240,237,232,0.62)' }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = 'rgba(201,168,76,0.08)';
                                                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)';
                                                e.currentTarget.style.color = '#C9A84C';
                                                e.currentTarget.style.boxShadow = '0 0 20px rgba(201,168,76,0.08)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                                                e.currentTarget.style.color = 'rgba(240,237,232,0.5)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }}>
                                            {bank}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* POPIA Guardian */}
                        <div className="rounded-3xl p-8 relative overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, #060A14 0%, #0D1526 100%)',
                                border: '1px solid rgba(201,168,76,0.15)',
                                boxShadow: '0 16px 60px rgba(0,0,0,0.5)',
                            }}>
                            {/* Top line */}
                            <div className="absolute top-0 left-0 right-0 h-px"
                                style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)' }} />
                            {/* Watermark */}
                            <div className="absolute bottom-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                <ShieldCheck size={200} style={{ color: '#C9A84C' }} />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 rounded-2xl" style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.25)' }}>
                                        <PhoneCall size={20} style={{ color: '#C9A84C' }} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">POPIA Privacy Guardian</h2>
                                        <p className="text-[11px] uppercase tracking-widest mt-0.5" style={{ color: 'rgba(201,168,76,0.8)' }}>v2.4 Active</p>
                                    </div>
                                </div>
                                <p className="text-sm leading-relaxed mb-8" style={{ color: 'rgba(240,237,232,0.62)', maxWidth: '36ch' }}>
                                    Automated data purging for unsuccessful credit applications. Full audit trail for data access mandated by the Information Regulator of South Africa.
                                </p>
                                <button className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest transition-all"
                                    style={{ color: 'rgba(201,168,76,0.8)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#C9A84C'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(201,168,76,0.6)'; e.currentTarget.style.transform = 'none'; }}>
                                    View Compliance Logs <ArrowUpRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* NPS Card */}
                        <div className="luxury-card p-6 flex items-center gap-5">
                            <div className="h-12 w-12 rounded-2xl flex items-center justify-center font-outfit font-black text-sm flex-shrink-0"
                                style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
                                SD
                            </div>
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(201,168,76,0.8)' }}>
                                    Lead NPS Feedback
                                </p>
                                <p className="font-outfit font-bold text-base text-white">"Excellent service from Siyanda."</p>
                            </div>
                            <div className="ml-auto flex">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <span key={s} className="text-base" style={{ color: s <= 5 ? '#C9A84C' : 'rgba(255,255,255,0.66)' }}>★</span>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancePage;
