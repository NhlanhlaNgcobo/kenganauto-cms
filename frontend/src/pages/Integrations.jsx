import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Globe, Mail, MessageCircle, Facebook, Code,
    CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Integrations() {
    const { user, token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [testStatus, setTestStatus] = useState({});

    useEffect(() => { loadSettings(); }, []);

    const loadSettings = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/integrations/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data.integrations);
        } catch (e) {
            console.error('Error fetching integrations:', e);
        }
        setLoading(false);
    };

    const handleFacebookConnect = async () => {
        try {
            const res = await axios.post(`${API_URL}/api/integrations/facebook/oauth`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                loadSettings();
            }
        } catch (e) { console.error(e); }
    };

    const runGenericTest = async () => {
        setTestStatus({ ...testStatus, generic: 'Testing...' });
        try {
            await axios.post(`${data.webhook_url}`, {
                customer_name: "Test Webhook User",
                customer_phone: "+27820001111",
                vehicle_interest: "Test Polo GTI",
                source: "test_button"
            });
            setTestStatus({ ...testStatus, generic: 'Success!' });
            setTimeout(() => setTestStatus({}), 3000);
        } catch (e) {
            setTestStatus({ ...testStatus, generic: 'Failed' });
        }
    };

    if (loading || !data) {
        return <div className="p-8 text-[#C9A84C] font-black uppercase tracking-widest">Initialising Secure Gateways...</div>;
    }

    const INTEGRATION_CARDS = [
        {
            id: 'autotrader',
            name: 'AutoTrader.co.za',
            icon: <Mail className="text-blue-400" />,
            status: data.autotrader.active ? 'Connected' : 'Offline',
            leads: data.autotrader.leads_this_month,
            desc: 'Automated email parsing for direct marketplace inquiries.',
            instructions: `In your AutoTrader Dealer Portal, set your "Lead Forwarding Email" to:`,
            value: data.inbound_email,
            type: 'email'
        },
        {
            id: 'cars_coza',
            name: 'Cars.co.za',
            icon: <Mail className="text-red-400" />,
            status: data.cars_coza.active ? 'Connected' : 'Offline',
            leads: data.cars_coza.leads_this_month,
            desc: 'Real-time ingestion of portal inquiries via inbound parsing.',
            instructions: `Update your Cars.co.za contact settings with this unique inbound address:`,
            value: data.inbound_email,
            type: 'email'
        },
        {
            id: 'facebook',
            name: 'Facebook Lead Ads',
            icon: <Facebook className="text-blue-600" />,
            status: data.facebook.active ? 'Linked' : 'Not Connected',
            leads: data.facebook.leads_this_month,
            desc: 'Direct API integration for Instant Forms and Discovery ads.',
            instructions: data.facebook.active ? `Connected to: ${data.facebook.page_name}` : 'Connect your Facebook Business Page to sync lead ads instantly.',
            action: !data.facebook.active ?
                <button onClick={handleFacebookConnect} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors">Connect Facebook Page</button> :
                <span className="mt-4 text-[9px] text-green-400 font-bold uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={12} /> Live Sync Active</span>
        },
        {
            id: 'generic',
            name: 'Generic API Webhook',
            icon: <Code className="text-emerald-400" />,
            status: 'Operational',
            leads: data.generic_webhook.leads_this_month,
            desc: 'Connect your own website forms or custom CRM end-points.',
            instructions: 'Send a POST request with JSON payload to your secure URL:',
            value: data.webhook_url,
            type: 'url',
            test: true
        }
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto text-white">
            <header className="mb-12">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1.5" style={{ color: 'rgba(201,168,76,0.6)' }}>Ecosystem</p>
                <h1 className="font-outfit font-black text-3xl text-white tracking-wide">Lead Source Integrations</h1>
                <p className="text-white/40 text-sm mt-2 max-w-2xl">Connect external marketplaces, social ads and your own website directly into the KenganAuto AI pipeline for immediate response automation.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {INTEGRATION_CARDS.map((card, i) => (
                    <div key={i} className="bg-black/30 border border-white/5 rounded-3xl p-8 flex flex-col hover:border-white/10 transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                                {card.icon}
                            </div>
                            <div className="text-right">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${card.status.includes('Connected') || card.status.includes('Live') || card.status === 'Operational' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'}`}>
                                    {card.status}
                                </span>
                                <p className="text-[10px] text-white/40 mt-2 uppercase font-bold tracking-widest">{card.leads} Leads this month</p>
                            </div>
                        </div>

                        <h3 className="font-outfit font-black text-xl mb-2">{card.name}</h3>
                        <p className="text-xs text-white/50 leading-relaxed mb-6">{card.desc}</p>

                        <div className="mt-auto pt-6 border-t border-white/5">
                            <p className="text-[10px] text-[#C9A84C] font-black uppercase tracking-widest mb-3">{card.instructions}</p>

                            {card.value && (
                                <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex items-center justify-between mb-4">
                                    <code className="text-[11px] font-mono text-white/70 truncate mr-4">{card.value}</code>
                                    <button onClick={() => navigator.clipboard.writeText(card.value)} className="text-white/30 hover:text-white transition-colors" title="Copy to Clipboard">
                                        <Code size={14} />
                                    </button>
                                </div>
                            )}

                            {card.action}

                            {card.test && (
                                <button onClick={runGenericTest} className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
                                    {testStatus.generic || <><Send size={12} /> Run Source Test</>}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 bg-[#0A0F1E] border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
                <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400">
                    <Globe size={40} />
                </div>
                <div className="flex-1">
                    <h4 className="font-outfit font-black text-xl mb-1">Web Chat Widget</h4>
                    <p className="text-sm text-white/40">Integrated by default on your primary website. Receives organic traffic leads.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Status: Active</span>
                    <button className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] hover:underline flex items-center gap-1">
                        Deployment Guide <ExternalLink size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
}
