import React, { useState, useEffect } from 'react';
import {
    MessageCircle, Settings, Shield, Zap,
    CheckCircle2, AlertCircle, RefreshCw, Smartphone,
    Key, Link as LinkIcon, Activity
} from 'lucide-react';

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const WhatsappSettings = () => {
    const [config, setConfig] = useState({
        whatsapp_number: '',
        api_key: '',
        webhook_secret: '',
    });
    const [status, setStatus] = useState({
        configured: false,
        api_key_masked: '',
        webhook_registered: false,
        webhook_url: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token') || localStorage.getItem('ka_token');
            const res = await axios.get(`${API_BASE}/api/whatsapp/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus(res.data);
            if (res.data.configured) {
                setConfig(prev => ({
                    ...prev,
                    whatsapp_number: res.data.whatsapp_number || ''
                }));
            }
        } catch {
            setError('Failed to load WhatsApp settings.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);
            const token = localStorage.getItem('token') || localStorage.getItem('ka_token');
            await axios.post(`${API_BASE}/api/whatsapp/settings`, config, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess('Settings saved successfully!');
            fetchSettings();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        try {
            setTesting(true);
            setError(null);
            const token = localStorage.getItem('token') || localStorage.getItem('ka_token');
            const res = await axios.post(`${API_BASE}/api/whatsapp/settings/test`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess(res.data.message);
        } catch (err) {
            setError(err.response?.data?.error || 'Connection test failed.');
        } finally {
            setTesting(false);
        }
    };

    const handleRegisterWebhook = async () => {
        try {
            setRegistering(true);
            setError(null);
            const token = localStorage.getItem('token') || localStorage.getItem('ka_token');
            const res = await axios.post(`${API_BASE}/api/whatsapp/settings/register-webhook`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess(res.data.message);
            fetchSettings();
        } catch (err) {
            setError(err.response?.data?.error || 'Webhook registration failed.');
        } finally {
            setRegistering(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <RefreshCw className="animate-spin text-[#C9A84C]" size={32} />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto anim-fade-up">
            <header className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                        <MessageCircle size={20} style={{ color: '#C9A84C' }} />
                    </div>
                </div>
                <h1 className="font-outfit font-black text-3xl text-white">WhatsApp <span className="gold-text">Business</span></h1>
                <p className="text-sm mt-3" style={{ color: 'rgba(240,237,232,0.62)' }}>Connect your 360dialog API to enable AI-powered customer conversations.</p>
            </header>

            {error && (
                <div className="mb-6 p-4 rounded-xl flex items-center gap-3 anim-shake"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                    <AlertCircle size={18} />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 rounded-xl flex items-center gap-3 anim-fade-in"
                    style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ADE80' }}>
                    <CheckCircle2 size={18} />
                    <p className="text-sm font-medium">{success}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Configuration Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="luxury-card p-8">
                        <div className="flex items-center gap-2 mb-6">
                            <Settings size={18} className="text-[#C9A84C]" />
                            <h2 className="font-outfit font-bold text-lg text-white">API Configuration</h2>
                        </div>

                        <form onSubmit={handleSave} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-white/58 block">WhatsApp Number</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/58" size={16} />
                                    <input
                                        type="text"
                                        placeholder="e.g. +27 82 123 4567"
                                        className="luxury-input w-full pl-12"
                                        value={config.whatsapp_number}
                                        onChange={e => setConfig({ ...config, whatsapp_number: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-white/58 block">360dialog API Key</label>
                                <div className="relative">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-white/58" size={16} />
                                    <input
                                        type="password"
                                        placeholder={status.api_key_masked || "Enter your API key"}
                                        className="luxury-input w-full pl-12"
                                        value={config.api_key}
                                        onChange={e => setConfig({ ...config, api_key: e.target.value })}
                                        required={!status.configured}
                                    />
                                </div>
                                {status.configured && <p className="text-[12px] text-white/58 italic mt-1">Leave blank to keep current key ({status.api_key_masked})</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-white/58 block">Webhook Secret (Optional)</label>
                                <div className="relative">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-white/58" size={16} />
                                    <input
                                        type="password"
                                        placeholder="For extra security validation"
                                        className="luxury-input w-full pl-12"
                                        value={config.webhook_secret}
                                        onChange={e => setConfig({ ...config, webhook_secret: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-gold w-full py-3.5 mt-4"
                            >
                                {saving ? <RefreshCw className="animate-spin" size={18} /> : 'Save WhatsApp Configuration'}
                            </button>
                        </form>
                    </div>

                    <div className="luxury-card p-8">
                        <div className="flex items-center gap-2 mb-6">
                            <LinkIcon size={18} className="text-[#3B7FF5]" />
                            <h2 className="font-outfit font-bold text-lg text-white">Webhook Registration</h2>
                        </div>
                        <p className="text-sm mb-6" style={{ color: 'rgba(240,237,232,0.62)' }}>
                            Automatically register your endpoint with 360dialog to start receiving messages.
                        </p>

                        <div className="flex items-center justify-between p-4 rounded-xl mb-6"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-white/58">Webhook URL</p>
                                <p className="text-xs font-mono text-[#C9A84C] mt-0.5 truncate max-w-xs">{status.webhook_url || 'N/A'}</p>
                            </div>
                            <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest ${status.webhook_registered ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {status.webhook_registered ? 'Registered' : 'Disconnected'}
                            </div>
                        </div>

                        <button
                            onClick={handleRegisterWebhook}
                            disabled={registering || !status.configured}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all text-sm"
                            style={{
                                background: 'rgba(59,127,245,0.1)',
                                border: '1px solid rgba(59,127,245,0.25)',
                                color: '#60A5FA',
                                opacity: status.configured ? 1 : 0.5,
                                cursor: status.configured ? 'pointer' : 'not-allowed'
                            }}
                        >
                            {registering ? <RefreshCw className="animate-spin" size={18} /> : 'Register Webhook with 360dialog'}
                        </button>
                    </div>
                </div>

                {/* Right: Status & Actions */}
                <div className="space-y-6">
                    <div className="luxury-card p-7">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl" style={{ background: 'rgba(59,127,245,0.1)', border: '1px solid rgba(59,127,245,0.2)' }}>
                                <Activity size={18} className="text-[#3B7FF5]" />
                            </div>
                            <h2 className="font-outfit font-bold text-lg text-white">System Status</h2>
                        </div>

                        <ul className="space-y-4">
                            <li className="flex items-center justify-between">
                                <span className="text-xs text-white/58">API Credentials</span>
                                <span className={`text-[11px] font-bold uppercase ${status.configured ? 'text-green-400' : 'text-red-400'}`}>
                                    {status.configured ? 'Active' : 'Missing'}
                                </span>
                            </li>
                            <li className="flex items-center justify-between">
                                <span className="text-xs text-white/58">360dialog Connection</span>
                                <span className="text-[11px] font-bold uppercase text-white/66">Idle</span>
                            </li>
                            <li className="flex items-center justify-between">
                                <span className="text-xs text-white/58">Message Queue</span>
                                <span className="text-[11px] font-bold uppercase text-green-400">Ready</span>
                            </li>
                        </ul>

                        <button
                            onClick={handleTest}
                            disabled={testing || !status.configured}
                            className="w-full py-3 mt-8 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                color: 'rgba(240,237,232,0.7)',
                                opacity: status.configured ? 1 : 0.5
                            }}
                        >
                            {testing ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                            Test API Connection
                        </button>
                    </div>

                    <div className="luxury-card p-7" style={{ border: '1px solid rgba(201,168,76,0.15)' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle2 size={16} className="text-[#C9A84C]" />
                            <p className="text-xs font-bold text-white uppercase tracking-widest">Next Steps</p>
                        </div>
                        <ul className="space-y-3">
                            <li className="text-[12px] leading-relaxed text-white/58">
                                1. Obtain your API Key from 360dialog Hub.
                            </li>
                            <li className="text-[12px] leading-relaxed text-white/58">
                                2. Save your Config & WhatsApp number.
                            </li>
                            <li className="text-[12px] leading-relaxed text-white/58">
                                3. Register the Webhook Endpoint.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsappSettings;
