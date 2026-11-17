import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CreditCard, Crown, Rocket, Shield, Users, Zap } from 'lucide-react';
import { PageShell, Surface } from '../components/PageShell';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PLAN_DETAILS = [
    {
        id: 'starter',
        name: 'Starter',
        price: 'R5,500',
        volume: '500 AI chats per month',
        seats: '2 users',
        feature: 'WhatsApp and web chat basics',
    },
    {
        id: 'growth',
        name: 'Growth',
        price: 'R12,500',
        volume: '2,500 AI chats per month',
        seats: '5 users',
        feature: 'Broader operations and reporting',
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'R22,000',
        volume: '10,000 AI chats per month',
        seats: '20 users',
        feature: 'Database reactivation and advanced automation',
    },
];

export default function Billing() {
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

    const usagePercent = useMemo(() => {
        if (!billingData?.usage?.conversations?.limit) return 0;
        return Math.min(100, Math.round((billingData.usage.conversations.used / billingData.usage.conversations.limit) * 100));
    }, [billingData]);

    if (loading) {
        return <div className="p-8 text-white">Loading billing details...</div>;
    }

    if (!billingData) {
        return <div className="p-8 text-white">Failed to load billing details.</div>;
    }

    const { plan, status, trial_ends_at, usage } = billingData;
    const isTrial = status === 'trialing';

    return (
        <PageShell
            title="Subscription"
            description="Keep pricing simple. Review your current plan, usage, and available upgrades in one place."
            actions={
                status !== 'active' ? (
                    <button
                        onClick={() => handleCheckout(plan)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-4 py-3 text-sm font-semibold text-[#0A0F1E] transition hover:opacity-90 disabled:opacity-60"
                    >
                        <Rocket size={16} />
                        Upgrade now
                    </button>
                ) : (
                    <button
                        onClick={handlePortal}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                    >
                        <CreditCard size={16} />
                        Manage billing
                    </button>
                )
            }
        >
            <div className="grid gap-4 lg:grid-cols-3">
                <Surface className="lg:col-span-2">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-white/58">Current plan</p>
                            <h2 className="mt-2 font-outfit text-3xl font-black text-white">{plan.toUpperCase()}</h2>
                            <p className="mt-2 text-sm leading-7 text-white/66">
                                {isTrial ? `Your 14-day trial ends on ${new Date(trial_ends_at).toLocaleDateString()}.` : 'Your monthly subscription is active.'}
                            </p>
                        </div>
                        <span className="rounded-full bg-[#C9A84C]/12 px-4 py-2 text-sm font-semibold text-[#C9A84C]">
                            {status}
                        </span>
                    </div>
                </Surface>

                <Surface>
                    <p className="text-sm font-medium text-white/58">What you are paying for</p>
                    <div className="mt-4 space-y-3 text-sm leading-7 text-white/66">
                        <p>One monthly subscription.</p>
                        <p>No setup fees.</p>
                        <p>Plan changes happen through Stripe checkout.</p>
                    </div>
                </Surface>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Surface>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white/58">AI conversations</p>
                        <Activity size={16} className="text-[#C9A84C]" />
                    </div>
                    <p className="mt-4 font-outfit text-3xl font-black text-white">
                        {usage.conversations.used}
                        <span className="ml-2 text-lg font-semibold text-white/58">/ {usage.conversations.limit}</span>
                    </p>
                    <div className="mt-4 h-2 rounded-full bg-white/6">
                        <div className={`h-2 rounded-full ${usagePercent > 80 ? 'bg-red-500' : 'bg-[#C9A84C]'}`} style={{ width: `${usagePercent}%` }} />
                    </div>
                </Surface>

                <Surface>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white/58">Available seats</p>
                        <Users size={16} className="text-[#C9A84C]" />
                    </div>
                    <p className="mt-4 font-outfit text-3xl font-black text-white">{usage.users.limit}</p>
                    <p className="mt-2 text-sm text-white/58">Admin and staff seats included in your plan.</p>
                </Surface>

                <Surface>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white/58">Plan type</p>
                        <Shield size={16} className="text-[#C9A84C]" />
                    </div>
                    <p className="mt-4 font-outfit text-3xl font-black text-white">{plan.toUpperCase()}</p>
                    <p className="mt-2 text-sm text-white/58">Simple monthly billing with feature-based plan tiers.</p>
                </Surface>
            </div>

            <section aria-labelledby="plans-heading" className="pt-2">
                <div className="mb-5">
                    <h2 id="plans-heading" className="font-outfit text-2xl font-black text-white">Plans</h2>
                    <p className="mt-2 text-sm leading-7 text-white/66">Choose the plan that matches your team size and automation needs.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {PLAN_DETAILS.map((tier) => (
                        <div
                            key={tier.id}
                            className={`rounded-2xl border p-5 ${plan === tier.id ? 'border-[#C9A84C]/40 bg-white/[0.04]' : 'border-white/10 bg-[#0D1526]'}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-outfit text-xl font-black text-white">{tier.name}</h3>
                                    <p className="mt-2 text-2xl font-black text-[#C9A84C]">
                                        {tier.price}
                                        <span className="ml-1 text-sm font-medium text-white/58">/ month</span>
                                    </p>
                                </div>
                                {tier.id === 'enterprise' ? <Crown size={18} className="text-[#C9A84C]" /> : <Zap size={18} className="text-white/58" />}
                            </div>

                            <div className="mt-5 space-y-2 text-sm leading-7 text-white/66">
                                <p>{tier.volume}</p>
                                <p>{tier.seats}</p>
                                <p>{tier.feature}</p>
                            </div>

                            {plan === tier.id ? (
                                <div className="mt-5 rounded-xl bg-[#C9A84C]/12 px-4 py-3 text-center text-sm font-semibold text-[#C9A84C]">
                                    Current plan
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleCheckout(tier.id)}
                                    disabled={actionLoading}
                                    className="mt-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                                >
                                    Switch to {tier.name}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </PageShell>
    );
}
