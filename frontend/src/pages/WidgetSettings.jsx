import React, { useState, useEffect, useRef } from 'react';
import {
    Code, Copy, Check, Settings, Palette, MessageSquare,
    Globe, Smartphone, Zap, ChevronRight, ExternalLink,
    RefreshCw, AlertCircle, BookOpen, Webhook,
    Monitor, Layout, ArrowRight
} from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/* ── Colour Picker Swatch Component ── */
const ColorSwatch = ({ value, onChange, label }) => (
    <div className="flex items-center gap-3">
        <div className="relative">
            <input
                type="color"
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0.5"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}
            />
        </div>
        <div>
            <p className="text-xs font-bold text-white">{label}</p>
            <p className="text-[10px] text-white/30 font-mono">{value}</p>
        </div>
    </div>
);

/* ── Copy-to-clipboard utility ── */
function useCopy(text, timeout = 2000) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), timeout);
        });
    };
    return [copied, copy];
}

/* ── Live Widget Preview ── */
const WidgetPreview = ({ cfg }) => {
    const initials = cfg.dealership_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return (
        <div className="relative w-[320px] h-[460px] rounded-2xl overflow-hidden shadow-2xl select-none"
            style={{ background: '#0D1526', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Header */}
            <div className="flex items-center gap-3 p-4"
                style={{ background: `linear-gradient(135deg, ${cfg.bubble_color} 0%, ${cfg.bubble_color}BB 100%)` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                    style={{ background: cfg.accent_color, color: '#0A0F1E' }}>
                    {initials}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-white leading-none">{cfg.widget_title}</p>
                    <p className="text-[10px] text-white/50 mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
                        Online · AI-powered
                    </p>
                </div>
                <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-white/50 text-xs">✕</div>
            </div>

            {/* Messages */}
            <div className="p-4 flex flex-col gap-3 flex-1">
                <div className="max-w-[85%]">
                    <div className="px-3 py-2.5 rounded-2xl rounded-tl-none text-[12px] leading-relaxed"
                        style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.85)' }}>
                        {cfg.greeting.slice(0, 80)}{cfg.greeting.length > 80 ? '…' : ''}
                    </div>
                    <div className="text-[9px] text-white/20 mt-1">14:32</div>
                </div>
                <div className="max-w-[75%] self-end">
                    <div className="px-3 py-2.5 rounded-2xl rounded-br-none text-[12px] font-medium"
                        style={{ background: cfg.accent_color, color: '#0A0F1E' }}>
                        Tell me more about your SUVs
                    </div>
                    <div className="text-[9px] text-white/20 mt-1 text-right">14:33</div>
                </div>
                <div className="max-w-[85%]">
                    <div className="px-3 py-2.5 rounded-2xl rounded-tl-none text-[12px] leading-relaxed"
                        style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.85)' }}>
                        Absolutely! We have 3 stunning SUV models in stock right now…
                    </div>
                    <div className="text-[9px] text-white/20 mt-1">14:33</div>
                </div>
            </div>

            {/* Input bar preview */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-3"
                style={{ background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex-1 rounded-xl px-3 py-2 text-[11px] text-white/30"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Type a message…
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: cfg.accent_color }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A0F1E">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </div>
            </div>

            {/* Bubble overlay */}
            <div className="absolute bottom-[-28px] right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: cfg.bubble_color }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════ */
const WidgetSettingsPage = () => {
    const [cfg, setCfg] = useState({
        bubble_color: '#1B2A4A',
        accent_color: '#C9A84C',
        greeting: "Hi! I'm the KenganAuto AI assistant. How can I help you today?",
        dealership_name: 'KenganAuto Motors',
        logo_url: '',
        position: 'bottom-right',
        show_lead_form: true,
        whatsapp_number: '',
        widget_title: 'AI Assistant',
        offline_message: "We're offline right now, but leave a message and we'll respond shortly!",
        business_hours: 'Mon–Fri 08:00–17:30 | Sat 08:00–13:00',
        auto_open_delay: 0,
    });
    const [tenantId, setTenantId] = useState('YOUR_TENANT_ID');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [activeTab, setActiveTab] = useState('appearance');

    const embedCode = `<script src="https://cdn.kenganauto.co.za/widget.js" data-tenant="${tenantId}"></script>`;
    const localEmbedCode = `<script src="http://localhost:3000/widget.js" data-tenant="${tenantId}"></script>`;
    const webhookUrl = `${API_BASE}/api/widget/autotrader-webhook`;

    const [copiedEmbed, copyEmbed] = useCopy(embedCode);
    const [copiedLocal, copyLocal] = useCopy(localEmbedCode);
    const [copiedWebhook, copyWebhook] = useCopy(webhookUrl);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('ka_token') || localStorage.getItem('token');
            const res = await axios.get(`${API_BASE}/api/widget/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCfg(res.data);
            setTenantId(res.data.tenant_id || 'YOUR_TENANT_ID');
        } catch (err) {
            // Use defaults if no config saved yet
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);
            const token = localStorage.getItem('ka_token') || localStorage.getItem('token');
            await axios.post(`${API_BASE}/api/widget/settings`, cfg, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess('Widget settings saved successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const updateCfg = (key, val) => setCfg(prev => ({ ...prev, [key]: val }));

    const tabs = [
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'behaviour', label: 'Behaviour', icon: Settings },
        { id: 'embed', label: 'Embed Code', icon: Code },
        { id: 'autotrader', label: 'Autotrader', icon: Webhook },
    ];

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <RefreshCw className="animate-spin text-[#C9A84C]" size={32} />
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto anim-fade-up">
            {/* Header */}
            <div className="mb-10 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(59,127,245,0.1)', border: '1px solid rgba(59,127,245,0.2)' }}>
                            <Globe size={20} className="text-[#3B7FF5]" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: 'rgba(201,168,76,0.5)' }}>Integration</p>
                    </div>
                    <h1 className="font-outfit font-black text-3xl text-white">Website <span className="gold-text">Chat Widget</span></h1>
                    <p className="text-sm mt-2" style={{ color: 'rgba(240,237,232,0.45)' }}>
                        One line of code. Your AI chatbot live on any dealership website.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-gold flex items-center gap-2"
                >
                    {saving ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                    Save Changes
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                    <AlertCircle size={18} /><p className="text-sm font-medium">{error}</p>
                </div>
            )}
            {success && (
                <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ADE80' }}>
                    <Check size={18} /><p className="text-sm font-medium">{success}</p>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                {/* Left: Config Panel */}
                <div className="xl:col-span-3 space-y-6">
                    {/* Tabs */}
                    <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                                style={activeTab === tab.id ? {
                                    background: 'rgba(201,168,76,0.1)',
                                    color: '#C9A84C',
                                    border: '1px solid rgba(201,168,76,0.2)'
                                } : { color: 'rgba(240,237,232,0.35)' }}
                            >
                                <tab.icon size={14} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* ── APPEARANCE TAB ── */}
                    {activeTab === 'appearance' && (
                        <div className="luxury-card p-8 space-y-8">
                            <div>
                                <h3 className="font-outfit font-bold text-lg text-white mb-6">Colours & Branding</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <ColorSwatch value={cfg.bubble_color} onChange={v => updateCfg('bubble_color', v)} label="Bubble Colour" />
                                    <ColorSwatch value={cfg.accent_color} onChange={v => updateCfg('accent_color', v)} label="Accent Colour" />
                                </div>
                            </div>

                            <div className="gold-divider" />

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-white/40 block">Dealership Name</label>
                                    <input
                                        className="luxury-input w-full"
                                        value={cfg.dealership_name}
                                        onChange={e => updateCfg('dealership_name', e.target.value)}
                                        placeholder="e.g. AutoNation Sandton"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-white/40 block">Widget Title</label>
                                    <input
                                        className="luxury-input w-full"
                                        value={cfg.widget_title}
                                        onChange={e => updateCfg('widget_title', e.target.value)}
                                        placeholder="e.g. AI Assistant"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-white/40 block">Logo URL (optional)</label>
                                    <input
                                        className="luxury-input w-full"
                                        value={cfg.logo_url || ''}
                                        onChange={e => updateCfg('logo_url', e.target.value)}
                                        placeholder="https://yoursite.co.za/logo.png"
                                    />
                                </div>
                            </div>

                            <div className="gold-divider" />

                            <div className="space-y-3">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-white/40 block">Position</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['bottom-right', 'bottom-left'].map(pos => (
                                        <button
                                            key={pos}
                                            onClick={() => updateCfg('position', pos)}
                                            className="flex items-center gap-3 p-4 rounded-xl transition-all font-medium text-sm"
                                            style={cfg.position === pos ? {
                                                background: 'rgba(201,168,76,0.1)',
                                                border: '1px solid rgba(201,168,76,0.3)',
                                                color: '#C9A84C'
                                            } : {
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                color: 'rgba(240,237,232,0.5)'
                                            }}
                                        >
                                            <Layout size={16} />
                                            {pos === 'bottom-right' ? 'Bottom Right' : 'Bottom Left'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── BEHAVIOUR TAB ── */}
                    {activeTab === 'behaviour' && (
                        <div className="luxury-card p-8 space-y-6">
                            <h3 className="font-outfit font-bold text-lg text-white">Chatbot Behaviour</h3>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-white/40 block">Opening Greeting</label>
                                <textarea
                                    className="luxury-input w-full"
                                    rows={3}
                                    value={cfg.greeting}
                                    onChange={e => updateCfg('greeting', e.target.value)}
                                    placeholder="Hi! I'm your AI assistant…"
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-white/40 block">Offline Message</label>
                                <textarea
                                    className="luxury-input w-full"
                                    rows={2}
                                    value={cfg.offline_message}
                                    onChange={e => updateCfg('offline_message', e.target.value)}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-white/40 block">Business Hours</label>
                                <input
                                    className="luxury-input w-full"
                                    value={cfg.business_hours}
                                    onChange={e => updateCfg('business_hours', e.target.value)}
                                    placeholder="Mon–Fri 08:00–17:30 | Sat 08:00–13:00"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-white/40 block">WhatsApp Number (for CTA)</label>
                                <input
                                    className="luxury-input w-full"
                                    value={cfg.whatsapp_number || ''}
                                    onChange={e => updateCfg('whatsapp_number', e.target.value)}
                                    placeholder="+27 82 000 1234"
                                    type="tel"
                                />
                                <p className="text-[10px] text-white/25">After 2 AI messages, a "Continue on WhatsApp" button appears.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-white/40 block">Auto-Open Delay (seconds, 0 = disabled)</label>
                                <input
                                    className="luxury-input w-full"
                                    type="number"
                                    min={0}
                                    max={60}
                                    value={cfg.auto_open_delay}
                                    onChange={e => updateCfg('auto_open_delay', Number(e.target.value))}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div>
                                    <p className="text-sm font-bold text-white">Collect Name & Phone</p>
                                    <p className="text-xs text-white/35 mt-0.5">Show lead capture form before first message</p>
                                </div>
                                <button
                                    onClick={() => updateCfg('show_lead_form', !cfg.show_lead_form)}
                                    className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                                    style={{ background: cfg.show_lead_form ? '#C9A84C' : 'rgba(255,255,255,0.1)' }}
                                >
                                    <span className="absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all"
                                        style={{ left: cfg.show_lead_form ? '26px' : '2px' }} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── EMBED CODE TAB ── */}
                    {activeTab === 'embed' && (
                        <div className="space-y-6">
                            {/* Production Embed */}
                            <div className="luxury-card p-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-xl" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                                        <Globe size={16} className="text-green-400" />
                                    </div>
                                    <h3 className="font-outfit font-bold text-lg text-white">Production Embed Code</h3>
                                </div>
                                <p className="text-sm text-white/40 mb-4">Copy this single line and paste it before the <code className="text-[#C9A84C]">&lt;/body&gt;</code> tag on any webpage.</p>
                                <div className="relative p-4 rounded-xl font-mono text-xs break-all"
                                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.15)', color: '#4ADE80' }}>
                                    {embedCode}
                                    <button onClick={copyEmbed}
                                        className="absolute top-3 right-3 p-2 rounded-lg transition-all"
                                        style={{ background: copiedEmbed ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)' }}>
                                        {copiedEmbed ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-white/40" />}
                                    </button>
                                </div>
                            </div>

                            {/* Local Dev Embed */}
                            <div className="luxury-card p-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 rounded-xl" style={{ background: 'rgba(59,127,245,0.1)', border: '1px solid rgba(59,127,245,0.2)' }}>
                                        <Monitor size={16} className="text-[#3B7FF5]" />
                                    </div>
                                    <h3 className="font-outfit font-bold text-lg text-white">Local Development</h3>
                                </div>
                                <p className="text-sm text-white/40 mb-4">Use this for testing on localhost:</p>
                                <div className="relative p-4 rounded-xl font-mono text-xs break-all"
                                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(59,127,245,0.15)', color: '#60A5FA' }}>
                                    {localEmbedCode}
                                    <button onClick={copyLocal}
                                        className="absolute top-3 right-3 p-2 rounded-lg transition-all"
                                        style={{ background: copiedLocal ? 'rgba(59,127,245,0.2)' : 'rgba(255,255,255,0.07)' }}>
                                        {copiedLocal ? <Check size={14} className="text-[#3B7FF5]" /> : <Copy size={14} className="text-white/40" />}
                                    </button>
                                </div>
                            </div>

                            {/* Platform Instructions */}
                            <div className="luxury-card p-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <BookOpen size={18} className="text-[#C9A84C]" />
                                    <h3 className="font-outfit font-bold text-lg text-white">Installation Guides</h3>
                                </div>
                                {[
                                    {
                                        platform: 'WordPress',
                                        icon: '⚡',
                                        steps: [
                                            'Go to Appearance → Theme Editor (or use WPCode plugin)',
                                            'Open your theme\'s footer.php file',
                                            'Paste the embed code before the closing </body> tag',
                                            'Click Update File — the widget appears immediately',
                                        ]
                                    },
                                    {
                                        platform: 'Wix',
                                        icon: '🎨',
                                        steps: [
                                            'Open your Wix Editor',
                                            'Go to Add → Embed → Custom Code (HTML)',
                                            'Place the widget in the footer section',
                                            'Paste the embed code and click Apply',
                                        ]
                                    },
                                    {
                                        platform: 'Custom HTML',
                                        icon: '💻',
                                        steps: [
                                            'Open your HTML file in any editor',
                                            'Find the closing </body> tag near the bottom',
                                            'Paste the embed code just before </body>',
                                            'Save and refresh — done!',
                                        ]
                                    },
                                ].map(({ platform, icon, steps }) => (
                                    <div key={platform} className="mb-6 last:mb-0">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-lg">{icon}</span>
                                            <h4 className="font-bold text-white text-sm">{platform}</h4>
                                        </div>
                                        <ol className="space-y-2">
                                            {steps.map((step, i) => (
                                                <li key={i} className="flex items-start gap-3 text-xs text-white/45">
                                                    <span className="font-black text-[#C9A84C] flex-shrink-0 mt-0.5">{i + 1}.</span>
                                                    {step}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── AUTOTRADER TAB ── */}
                    {activeTab === 'autotrader' && (
                        <div className="space-y-6">
                            <div className="luxury-card p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 rounded-xl" style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)' }}>
                                        <Webhook size={18} className="text-orange-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-outfit font-bold text-lg text-white">Autotrader / Cars.co.za Integration</h3>
                                        <p className="text-xs text-white/35 mt-0.5">Auto-reply to enquiries within 60 seconds via WhatsApp AI</p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl mb-6" style={{ background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.15)' }}>
                                    <p className="text-xs text-orange-300/70 font-medium">How it works</p>
                                    <div className="flex items-stretch gap-2 mt-3 flex-wrap">
                                        {['Buyer enquires on Autotrader', 'Email forwarded to webhook', 'AI parses lead details', 'WhatsApp reply sent in &lt;60s'].map((step, i) => (
                                            <React.Fragment key={i}>
                                                <div className="flex-1 min-w-[100px] p-3 rounded-lg text-center text-[11px] text-white/70 font-medium"
                                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                                                    dangerouslySetInnerHTML={{ __html: step }} />
                                                {i < 3 && <div className="flex items-center text-white/20"><ArrowRight size={14} /></div>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-white/40 block">Your Webhook URL</label>
                                        <p className="text-xs text-white/30 mb-2">Configure your email forwarder (Zapier, Make, etc.) to POST parsed lead data to this URL:</p>
                                        <div className="relative p-4 rounded-xl font-mono text-xs break-all"
                                            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(251,146,60,0.2)', color: '#FB923C' }}>
                                            {webhookUrl}
                                            <button onClick={copyWebhook}
                                                className="absolute top-3 right-3 p-2 rounded-lg"
                                                style={{ background: copiedWebhook ? 'rgba(251,146,60,0.2)' : 'rgba(255,255,255,0.07)' }}>
                                                {copiedWebhook ? <Check size={14} className="text-orange-400" /> : <Copy size={14} className="text-white/40" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-white/40 block">Expected JSON Payload</label>
                                        <pre className="p-4 rounded-xl text-[11px] overflow-x-auto leading-relaxed"
                                            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(240,237,232,0.6)' }}>
                                            {`{
  "tenant_id": "${tenantId}",
  "buyer_name": "Thabo Molefe",
  "buyer_phone": "0821234567",
  "buyer_email": "thabo@example.com",
  "vehicle_make": "BMW",
  "vehicle_model": "X5",
  "vehicle_year": 2023,
  "vehicle_price": 1200000,
  "message": "I am interested in this vehicle.",
  "source": "autotrader"
}`}
                                        </pre>
                                    </div>

                                    <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <p className="text-xs font-bold text-white mb-2">🔒 Security Header Required</p>
                                        <p className="text-xs text-white/40">Include the header: <code className="text-[#C9A84C]">x-webhook-secret: at-webhook-secret</code></p>
                                        <p className="text-[10px] text-white/25 mt-1">Set a strong secret via the <code>AUTOTRADER_WEBHOOK_SECRET</code> env variable on the server.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Live Preview */}
                <div className="xl:col-span-2">
                    <div className="sticky top-8 space-y-4">
                        <div className="luxury-card p-6">
                            <div className="flex items-center gap-2 mb-5">
                                <Smartphone size={16} className="text-[#C9A84C]" />
                                <h3 className="font-outfit font-bold text-base text-white">Live Preview</h3>
                            </div>
                            <div className="flex justify-center">
                                <WidgetPreview cfg={cfg} />
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="luxury-card p-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Widget Info</p>
                            <ul className="space-y-3">
                                {[
                                    ['Bundle Size', '< 50kb'],
                                    ['Load Strategy', 'Async (non-blocking)'],
                                    ['Dependencies', 'None (pure JS)'],
                                    ['Mobile Support', '✓ Responsive'],
                                    ['Photo Upload', '✓ Trade-in'],
                                    ['WhatsApp CTA', cfg.whatsapp_number ? '✓ Configured' : '⚠ Not set'],
                                ].map(([k, v]) => (
                                    <li key={k} className="flex items-center justify-between">
                                        <span className="text-xs text-white/35">{k}</span>
                                        <span className="text-xs font-bold text-white">{v}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WidgetSettingsPage;
