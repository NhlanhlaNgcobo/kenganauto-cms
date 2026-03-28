import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Settings, Key, Globe, Layout, MessageCircle, BarChart, Server, CheckCircle, XCircle, Loader2, Sparkles, Smartphone, Mail, CreditCard, Facebook, MapPin, Database } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const SERVICES = [
    { name: 'Anthropic Claude', logo: Sparkles, color: 'text-amber-400', desc: 'AI LLM for leads automation & scoring' },
    { name: '360dialog WhatsApp', logo: MessageCircle, color: 'text-emerald-400', desc: 'Official WhatsApp Business API integration' },
    { name: 'Resend Email', logo: Mail, color: 'text-sky-400', desc: 'Outbound email for leads & notifications' },
    { name: 'Stripe Billing', logo: CreditCard, color: 'text-indigo-400', desc: 'Subscription processing & checkout handling' },
    { name: 'Clickatell SMS', logo: Smartphone, color: 'text-pink-400', desc: 'Direct SMS fallback for instant alerts' },
    { name: 'Facebook API', logo: Facebook, color: 'text-blue-600', desc: 'Ad leads & Facebook Messenger connection' },
    { name: 'Google Maps', logo: MapPin, color: 'text-red-400', desc: 'Dealer location & logistics mapping' },
    { name: 'TransUnion', logo: Database, color: 'text-orange-400', desc: 'Credit check & vehicle history validation' },
    { name: 'Twilio', logo: Smartphone, color: 'text-red-500', desc: 'Cloud voice & global SMS fallback' },
];

export default function SuperAdminApiSettings() {
    const { token } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({});
    const [testing, setTesting] = useState({}); // Stores 'loading', 'success', 'fail' per service

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/superadmin/api-settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data.services);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async (serviceName) => {
        const key = form[serviceName];
        if (!key) return;

        setTesting(prev => ({ ...prev, [serviceName]: 'loading' }));
        try {
            const res = await axios.post(`${API_BASE}/api/superadmin/api-settings/test`,
                { service_name: serviceName, api_key: key },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.success) {
                setTesting(prev => ({ ...prev, [serviceName]: 'success' }));
            }
        } catch (err) {
            setTesting(prev => ({ ...prev, [serviceName]: 'fail' }));
        }
    };

    const handleSave = async (serviceName) => {
        const key = form[serviceName];
        if (!key) return;

        try {
            await axios.post(`${API_BASE}/api/superadmin/api-settings/save`,
                { service_name: serviceName, api_key: key },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert(`${serviceName} saved successfully.`);
            fetchSettings();
        } catch (err) {
            alert('Failed to save key.');
        }
    };

    if (loading) return <div className="p-8 text-white">Accessing Secure Vault...</div>;

    return (
        <div className="flex flex-col min-h-screen">
            <header className="px-8 py-5 flex-shrink-0 sticky top-0 z-40"
                style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-0.5 text-[#C9A84C]">Vault Control</p>
                <h1 className="font-outfit font-black text-xl text-white flex items-center gap-2">
                    <Key className="text-[#C9A84C]" size={20} /> Secure Service Integrations
                </h1>
            </header>

            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-4">
                    <div className="p-6 mb-8 rounded-2xl bg-amber-400/5 border border-amber-400/20 text-amber-200/60 text-xs leading-relaxed">
                        <Shield size={14} className="inline mr-2 text-amber-400" />
                        <span className="font-bold text-amber-400">Security Notice:</span> All API keys provided below are stored using **AES-256-GCM** encryption.
                        Once saved, they are never transmitted back to the browser in plain-text. They can only be used by the background AI engine for authenticated operations.
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                        {SERVICES.map((srv, i) => {
                            const live = data.find(d => d.name === srv.name) || {};
                            const sStatus = testing[srv.name];
                            const Icon = srv.logo;

                            return (
                                <div key={i} className="bg-[#111A30] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`p-3 rounded-xl bg-white/5 ${srv.color}`}>
                                            <Icon size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-outfit font-black text-white">{srv.name}</h3>
                                            <p className="text-[10px] text-white/40 leading-none mt-0.5">{srv.desc}</p>
                                        </div>
                                        {live.isConfigured && (
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-400/10 text-emerald-400 text-[10px] font-black uppercase">
                                                <CheckCircle size={10} /> Active
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="relative">
                                            <input
                                                type="password"
                                                placeholder={live.isConfigured ? '••••••••••••••••' : `Enter ${srv.name} Secret Key`}
                                                className="w-full bg-[#080D1A] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#C9A84C]/50 transition-all outline-none text-white"
                                                onChange={(e) => setForm(prev => ({ ...prev, [srv.name]: e.target.value }))}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleTest(srv.name)}
                                                className={`flex-1 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                          ${sStatus === 'loading' ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-50' :
                                                        sStatus === 'success' ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400' :
                                                            sStatus === 'fail' ? 'bg-red-400/10 border-red-400/30 text-red-400' :
                                                                'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                                disabled={sStatus === 'loading'}
                                            >
                                                {sStatus === 'loading' ? <Loader2 size={12} className="animate-spin" /> :
                                                    sStatus === 'success' ? <CheckCircle size={12} /> :
                                                        sStatus === 'fail' ? <XCircle size={12} /> : null}
                                                {sStatus === 'success' ? 'Connection Verified' :
                                                    sStatus === 'fail' ? 'Verification Failed' : 'Test Connection'}
                                            </button>

                                            <button
                                                onClick={() => handleSave(srv.name)}
                                                className="p-2.5 rounded-xl bg-[#C9A84C] text-[#0A0F1E] hover:opacity-90 transition-opacity"
                                                title="Securely Save"
                                            >
                                                <Server size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
