import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    CheckCircle2,
    Code,
    ExternalLink,
    Facebook,
    Globe,
    Mail,
    MessageCircle,
    Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageShell, Surface } from '../components/PageShell';
import CollapsibleSection from '../components/CollapsibleSection';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Integrations() {
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [testStatus, setTestStatus] = useState({});

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/integrations/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data.integrations);
        } catch (error) {
            console.error('Error fetching integrations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFacebookConnect = async () => {
        try {
            const res = await axios.post(`${API_URL}/api/integrations/facebook/oauth`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                loadSettings();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const runGenericTest = async () => {
        setTestStatus((current) => ({ ...current, generic: 'Testing...' }));
        try {
            await axios.post(`${data.webhook_url}`, {
                customer_name: 'Test Webhook User',
                customer_phone: '+27820001111',
                vehicle_interest: 'Test Polo GTI',
                source: 'test_button'
            });
            setTestStatus((current) => ({ ...current, generic: 'Success' }));
            setTimeout(() => setTestStatus({}), 3000);
        } catch {
            setTestStatus((current) => ({ ...current, generic: 'Failed' }));
        }
    };

    if (loading) {
        return <div className="p-8 text-white">Loading integrations...</div>;
    }

    if (!data) {
        return <div className="p-8 text-white">Failed to load integrations.</div>;
    }

    const integrationCards = [
        {
            id: 'autotrader',
            name: 'AutoTrader.co.za',
            icon: Mail,
            iconColor: 'text-blue-400',
            status: data.autotrader.active ? 'Connected' : 'Offline',
            leads: data.autotrader.leads_this_month,
            summary: 'Marketplace enquiries flow into the CRM through the inbound parsing address.',
            detail: data.inbound_email,
            detailLabel: 'Lead forwarding email',
        },
        {
            id: 'cars_coza',
            name: 'Cars.co.za',
            icon: Mail,
            iconColor: 'text-red-400',
            status: data.cars_coza.active ? 'Connected' : 'Offline',
            leads: data.cars_coza.leads_this_month,
            summary: 'Direct inbound lead parsing for Cars.co.za enquiries.',
            detail: data.inbound_email,
            detailLabel: 'Lead forwarding email',
        },
        {
            id: 'facebook',
            name: 'Facebook Lead Ads',
            icon: Facebook,
            iconColor: 'text-blue-500',
            status: data.facebook.active ? 'Connected' : 'Not connected',
            leads: data.facebook.leads_this_month,
            summary: data.facebook.active ? `Linked to ${data.facebook.page_name}.` : 'Connect a page to sync Instant Form leads directly into the pipeline.',
            detail: data.facebook.active ? data.facebook.page_name : null,
            detailLabel: data.facebook.active ? 'Connected page' : null,
            action: !data.facebook.active ? (
                <button
                    onClick={handleFacebookConnect}
                    className="rounded-xl bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                    Connect Facebook
                </button>
            ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5 text-sm font-medium text-green-300">
                    <CheckCircle2 size={14} />
                    Live sync active
                </span>
            ),
        },
        {
            id: 'generic',
            name: 'Generic API Webhook',
            icon: Code,
            iconColor: 'text-emerald-400',
            status: 'Operational',
            leads: data.generic_webhook.leads_this_month,
            summary: 'Use this webhook for custom website forms or external lead sources.',
            detail: data.webhook_url,
            detailLabel: 'Webhook URL',
            action: (
                <button
                    onClick={runGenericTest}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                    {testStatus.generic ? testStatus.generic : 'Run test'}
                </button>
            ),
        },
    ];

    return (
        <PageShell
            title="Lead sources"
            description="Connect the places your enquiries come from, then expand each source only when you need its setup details."
        >
            <div className="grid gap-4 lg:grid-cols-3">
                <Surface>
                    <p className="text-sm font-medium text-white/58">Inbound email</p>
                    <p className="mt-3 text-lg font-semibold text-white break-all">{data.inbound_email}</p>
                    <p className="mt-2 text-sm leading-7 text-white/58">Use this for marketplace lead forwarding.</p>
                </Surface>

                <Surface>
                    <p className="text-sm font-medium text-white/58">Webhook endpoint</p>
                    <p className="mt-3 text-lg font-semibold text-white break-all">{data.webhook_url}</p>
                    <p className="mt-2 text-sm leading-7 text-white/58">Use this for custom forms and external systems.</p>
                </Surface>

                <Surface>
                    <p className="text-sm font-medium text-white/58">Website chat widget</p>
                    <div className="mt-3 flex items-center gap-2 text-white">
                        <Globe size={16} className="text-emerald-400" />
                        <span className="text-lg font-semibold">Active</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/58">Your default web chat capture channel is enabled.</p>
                </Surface>
            </div>

            <Surface>
                <div className="mb-5">
                    <h2 className="font-outfit text-2xl font-black text-white">Connected sources</h2>
                    <p className="mt-2 text-sm leading-7 text-white/66">Only the summary is visible at first. Open a source when you want setup details or testing actions.</p>
                </div>

                <div className="space-y-4">
                    {integrationCards.map((card) => {
                        const Icon = card.icon;
                        const isHealthy = card.status === 'Operational' || card.status === 'Connected';

                        return (
                            <CollapsibleSection
                                key={card.id}
                                title={card.name}
                                subtitle={`${card.summary} ${card.leads} leads this month.`}
                                action={
                                    <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${isHealthy ? 'bg-green-500/10 text-green-300' : 'bg-white/8 text-white/66'}`}>
                                        {card.status}
                                    </span>
                                }
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="rounded-2xl bg-white/5 p-3">
                                            <Icon size={18} className={card.iconColor} />
                                        </div>
                                        <div className="max-w-2xl">
                                            <p className="text-sm leading-7 text-white/66">{card.summary}</p>
                                            {card.detail ? (
                                                <div className="mt-4 rounded-2xl bg-white/[0.03] p-4">
                                                    <p className="text-sm font-medium text-white/58">{card.detailLabel}</p>
                                                    <p className="mt-2 break-all text-sm font-semibold text-white">{card.detail}</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        {card.action}
                                        {card.detail ? (
                                            <button
                                                onClick={() => navigator.clipboard.writeText(card.detail)}
                                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                                            >
                                                Copy
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </CollapsibleSection>
                        );
                    })}
                </div>
            </Surface>

            <Surface>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="font-outfit text-2xl font-black text-white">Need deployment help?</h2>
                        <p className="mt-2 text-sm leading-7 text-white/66">Use the deployment guide if you want help placing the web widget or wiring custom forms.</p>
                    </div>
                    <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                        Deployment guide
                        <ExternalLink size={15} />
                    </button>
                </div>
            </Surface>
        </PageShell>
    );
}
