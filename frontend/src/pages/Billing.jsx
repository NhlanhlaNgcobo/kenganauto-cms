import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Rocket, Shield, Activity, CalendarDays, ExternalLink, Zap } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Billing = () => {
    const { user } = useAuth();
    const [billingData, setBillingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchBillingStatus();
    }, []);

    const fetchBillingStatus = async () => {
        try {
            const token = localStorage.getItem('ka_token');
            const res = await fetch(`${API_BASE}/api/billing/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setBillingData(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async (planKey) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('ka_token');
            const res = await fetch(`${API_BASE}/api/billing/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    planKey,
                    successUrl: `${window.location.origin}/billing?success=true`,
                    cancelUrl: `${window.location.origin}/billing?canceled=true`
                })
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } finally {
            setActionLoading(false);
        }
    };

    const handlePortal = async () => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('ka_token');
            const res = await fetch(`${API_BASE}/api/billing/portal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ returnUrl: `${window.location.origin}/billing` })
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-white">Loading billing details...</div>;
    if (!billingData) return <div className="p-8 text-white">Failed to load billing details.</div>;

    const { plan, status, trial_ends_at, usage, setup_fee_paid } = billingData;
    const isTrial = status === 'trialing';

    // Usage Progress
    const pctUsed = Math.min(100, Math.round((usage.conversations.used / usage.conversations.limit) * 100));

    return (
        <div className="flex flex-col min-h-screen">
            <header className="px-8 py-5 flex-shrink-0 sticky top-0 z-40"
                style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-0.5" style={{ color: 'rgba(201,168,76,0.4)' }}>Settings</p>
                <h1 className="font-outfit font-black text-xl text-white">Billing & Subscription</h1>
            </header>

            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-4xl space-y-8">

                    {/* Status Banner */}
                    <div className="rounded-2xl p-6 flex items-center justify-between"
                        style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.02))', border: '1px solid rgba(201,168,76,0.2)' }}>
                        <div>
                            <h2 className="text-white font-outfit font-bold text-2xl mb-1 flex items-center gap-3">
                                {plan.toUpperCase()} PLAN
                                <span className="text-[10px] uppercase font-black px-2 py-1 rounded bg-[#C9A84C] text-[#0A0F1E]">
                                    {status}
                                </span>
                            </h2>
                            <p className="text-white/50 text-sm">
                                {isTrial ? `Your 14-day free trial ends on ${new Date(trial_ends_at).toLocaleDateString()}` : 'Your subscription is active.'}
                            </p>
                        </div>
                        {status !== 'active' ? (
                            <button onClick={() => handleCheckout(plan)} disabled={actionLoading}
                                className="px-6 py-3 rounded-xl bg-[#C9A84C] text-[#0A0F1E] font-bold shadow-lg hover:shadow-xl hover:opacity-90 transition-all flex items-center gap-2">
                                <Rocket size={18} /> Upgrade Now
                            </button>
                        ) : (
                            <button onClick={handlePortal} disabled={actionLoading}
                                className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold shadow-lg hover:bg-white/20 transition-all flex items-center gap-2">
                                <CreditCard size={18} /> Manage Billing
                            </button>
                        )}
                    </div>

                    {/* Usage Limits */}
                    <h3 className="font-outfit font-bold text-lg text-white mb-4">Current Usage</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 rounded-2xl bg-[#111A30] border border-white/5 relative overflow-hidden">
                            <Activity className="absolute top-4 right-4 text-white/10" size={64} />
                            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">AI Conversations</p>
                            <h4 className="text-3xl font-outfit font-black text-white mb-2 leading-none">
                                {usage.conversations.used} <span className="text-base text-white/30 font-bold">/ {usage.conversations.limit}</span>
                            </h4>
                            <div className="w-full h-2 bg-white/5 rounded-full mt-4 overflow-hidden">
                                <div className={`h-full rounded-full ${pctUsed > 80 ? 'bg-red-500' : 'bg-[#C9A84C]'}`} style={{ width: `${pctUsed}%` }} />
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-[#111A30] border border-white/5 relative overflow-hidden">
                            <CalendarDays className="absolute top-4 right-4 text-white/10" size={64} />
                            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Setup Fee</p>
                            <h4 className="text-2xl font-outfit font-black text-white mt-4">
                                {setup_fee_paid ? 'PAID' : 'PENDING'}
                            </h4>
                            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">{setup_fee_paid ? 'Billed once onboarding is complete' : 'Will be charged on upgrade'}</p>
                        </div>

                        <div className="p-6 rounded-2xl bg-[#111A30] border border-white/5 relative overflow-hidden">
                            <Shield className="absolute top-4 right-4 text-[#C9A84C]/10" size={64} />
                            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Available Seats</p>
                            <h4 className="text-3xl font-outfit font-black text-white mb-2 leading-none">
                                {usage.users.limit}
                            </h4>
                            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">Admin & Sales Staff</p>
                        </div>
                    </div>

                    {/* Pricing Tiers visible if they want to switch */}
                    <h3 className="font-outfit font-bold text-lg text-white mb-4 mt-8">Available Plans</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { id: 'starter', name: 'Starter', price: 'R5,500', setup: 'R15,000 setup', vols: '500 AI Chats /mo' },
                            { id: 'growth', name: 'Growth', price: 'R12,500', setup: 'R25,000 setup', vols: '2,500 AI Chats /mo' },
                            { id: 'enterprise', name: 'Enterprise', price: 'R22,000', setup: 'R45,000 setup', vols: '10,000 AI Chats /mo' }
                        ].map((tier) => (
                            <div key={tier.id} className={`p-6 rounded-2xl border ${plan === tier.id ? 'bg-[#C9A84C]/10 border-[#C9A84C]' : 'bg-[#111A30] border-white/5'}`}>
                                <h4 className="text-lg font-outfit font-bold text-white mb-1 uppercase tracking-wider">{tier.name}</h4>
                                <p className="text-[#C9A84C] font-black text-2xl mb-1">{tier.price}<span className="text-sm font-normal text-white/50">/mo</span></p>
                                <p className="text-[10px] text-white/40 mb-6 uppercase tracking-widest">{tier.setup}</p>

                                <ul className="text-sm text-white/70 space-y-2 mb-6">
                                    <li className="flex items-center gap-2"><Zap size={14} className="text-[#C9A84C]" /> {tier.vols}</li>
                                    <li className="flex items-center gap-2"><Zap size={14} className="text-[#C9A84C]" /> WhatsApp Integration</li>
                                    <li className="flex items-center gap-2"><Zap size={14} className="text-[#C9A84C]" /> Support SLA</li>
                                </ul>

                                {plan !== tier.id ? (
                                    <button onClick={() => handleCheckout(tier.id)} disabled={actionLoading}
                                        className="w-full py-2 rounded shadow bg-white/5 text-white hover:bg-white/10 transition-colors text-sm font-bold uppercase tracking-wider">
                                        Switch to {tier.name}
                                    </button>
                                ) : (
                                    <div className="w-full py-2 rounded border border-[#C9A84C]/30 text-[#C9A84C] text-center text-sm font-bold uppercase tracking-wider cursor-default">
                                        Current Plan
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Billing;
