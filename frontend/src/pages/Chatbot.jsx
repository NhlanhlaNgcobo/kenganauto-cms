/**
 * AI Conversations Hub — CRM Page
 * Displays all chatbot conversations for this tenant with:
 *   - Filterable list (intent, channel, sentiment)
 *   - Full message thread view
 *   - Live notifications panel
 *   - API key settings panel (admin only)
 *   - Embedded Chat Widget for live preview / testing
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    MessageSquare, Filter, RefreshCw, Settings, Bell, BellDot,
    ChevronRight, User, Bot, AlertCircle, CheckCircle2, Clock,
    TrendingUp, TrendingDown, Minus, Phone, Mail, Car,
    Key, Save, Eye, EyeOff, X, Maximize2, Minimize2,
    Zap, ArrowUpRight, Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChatWidget from '../components/ChatWidget';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/* ── Intent meta ── */
const INTENT_META = {
    VEHICLE_ENQUIRY: { color: '#C9A84C', label: 'Vehicle', emoji: '🚗' },
    TEST_DRIVE: { color: '#4ADE80', label: 'Test Drive', emoji: '🔑' },
    FINANCE: { color: '#60A5FA', label: 'Finance', emoji: '💳' },
    TRADE_IN: { color: '#FB923C', label: 'Trade-In', emoji: '🔄' },
    SERVICE_BOOKING: { color: '#A78BFA', label: 'Service', emoji: '🔧' },
    PARTS: { color: '#F472B6', label: 'Parts', emoji: '🔩' },
    GENERAL_SUPPORT: { color: '#94A3B8', label: 'Support', emoji: '💬' },
    LEAD_CAPTURE: { color: '#6EE7B7', label: 'Lead', emoji: '📋' },
    HUMAN_HANDOFF: { color: '#F87171', label: 'Handoff', emoji: '👤' },
};

const IntentBadge = ({ intent }) => {
    const m = INTENT_META[intent] || { color: '#94A3B8', label: intent, emoji: '•' };
    return (
        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
            style={{ background: `${m.color}15`, color: m.color, border: `1px solid ${m.color}25` }}>
            {m.emoji} {m.label}
        </span>
    );
};

const SentimentIcon = ({ score }) => {
    if (score > 0.3) return <TrendingUp size={14} style={{ color: '#4ADE80' }} />;
    if (score < -0.3) return <TrendingDown size={14} style={{ color: '#F87171' }} />;
    return <Minus size={14} style={{ color: '#94A3B8' }} />;
};

/* ── Metric Card ── */
const MetricCard = ({ label, value, color, emoji }) => (
    <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
            <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(240,237,232,0.35)' }}>{label}</p>
            <p className="font-outfit font-black text-2xl" style={{ color }}>{value}</p>
        </div>
        <span className="text-3xl">{emoji}</span>
    </div>
);

/* ══════════════════════════════════════════════════ */
const Chatbot = () => {
    const { token, user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [activeConv, setActiveConv] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterIntent, setFilterIntent] = useState('ALL');
    const [showSettings, setShowSettings] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [savingKey, setSavingKey] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const [polling, setPolling] = useState(true);
    const pollRef = useRef(null);

    /* ── Fetch conversations ── */
    const fetchConversations = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/chat/conversations`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversations || []);
            }
        } catch { /* network hiccup — keep old data */ }
        finally { setLoading(false); }
    }, [token]);

    /* ── Fetch notifications ── */
    const fetchNotifications = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/chat/notifications`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch { }
    }, [token]);

    /* ── Polling ── */
    useEffect(() => {
        fetchConversations();
        fetchNotifications();
        if (polling) {
            pollRef.current = setInterval(() => {
                fetchConversations();
                fetchNotifications();
            }, 8000);
        }
        return () => clearInterval(pollRef.current);
    }, [fetchConversations, fetchNotifications, polling]);

    /* ── Mark notification read ── */
    const markRead = async (id) => {
        await fetch(`${API_BASE}/chat/notifications/${id}/read`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    /* ── Save API key ── */
    const saveApiKey = async () => {
        if (!apiKey.trim()) return;
        setSavingKey(true);
        try {
            const res = await fetch(`${API_BASE}/chat/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ anthropic_api_key: apiKey }),
            });
            const data = await res.json();
            setSaveMsg(res.ok ? '✓ API key saved and active' : data.error);
        } catch { setSaveMsg('Network error — please try again.'); }
        finally { setSavingKey(false); setTimeout(() => setSaveMsg(''), 4000); }
    };

    /* ── Filtered conversations ── */
    const filtered = conversations.filter(c =>
        filterIntent === 'ALL' || c.intent === filterIntent
    );

    /* ── Statistics ── */
    const stats = {
        total: conversations.length,
        handoffs: conversations.filter(c => c.intent === 'HUMAN_HANDOFF').length,
        qualified: conversations.filter(c => ['TEST_DRIVE', 'FINANCE', 'SERVICE_BOOKING', 'TRADE_IN'].includes(c.intent)).length,
        avgSentiment: conversations.length
            ? (conversations.reduce((sum, c) => sum + (c.sentiment || 0), 0) / conversations.length).toFixed(2)
            : '0.00',
    };

    const unreadCount = notifications.length;

    return (
        <div className="flex flex-col min-h-screen" style={{ background: '#0A0F1E' }}>

            {/* ── Header ── */}
            <header className="px-8 py-5 flex-shrink-0 sticky top-0 z-40"
                style={{ background: 'rgba(10,15,30,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-0.5" style={{ color: 'rgba(201,168,76,0.4)' }}>Module</p>
                        <h1 className="font-outfit font-black text-xl text-white">AI Conversations Hub</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Live indicator */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer"
                            onClick={() => setPolling(p => !p)}
                            style={{ background: polling ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)', color: polling ? '#4ADE80' : 'rgba(240,237,232,0.3)', border: `1px solid ${polling ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: polling ? '#4ADE80' : 'rgba(255,255,255,0.2)', boxShadow: polling ? '0 0 6px #4ADE80' : 'none', animation: polling ? 'pulse 2s infinite' : 'none' }} />
                            {polling ? 'Live' : 'Paused'}
                        </div>

                        {/* Notifications */}
                        <button onClick={() => setShowNotifications(p => !p)}
                            className="relative p-2.5 rounded-xl transition-all"
                            style={{ background: unreadCount ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${unreadCount ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
                            {unreadCount ? <BellDot size={18} style={{ color: '#C9A84C' }} /> : <Bell size={18} style={{ color: 'rgba(240,237,232,0.4)' }} />}
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full text-[9px] font-black"
                                    style={{ background: '#C9A84C', color: '#0A0F1E' }}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Preview widget */}
                        <button onClick={() => setShowPreview(p => !p)}
                            className="px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2 transition-all"
                            style={{ background: 'rgba(59,127,245,0.1)', border: '1px solid rgba(59,127,245,0.2)', color: '#60A5FA' }}>
                            <Zap size={13} /> Preview Chat
                        </button>

                        {/* Settings */}
                        {user?.role === 'admin' && (
                            <button onClick={() => setShowSettings(p => !p)}
                                className="p-2.5 rounded-xl transition-all"
                                style={{ background: showSettings ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showSettings ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
                                <Settings size={18} style={{ color: showSettings ? '#C9A84C' : 'rgba(240,237,232,0.4)' }} />
                            </button>
                        )}

                        <button onClick={fetchConversations}
                            className="p-2.5 rounded-xl transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <RefreshCw size={16} style={{ color: 'rgba(240,237,232,0.4)' }} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">

                {/* ── Left: List + Filters ── */}
                <div className="flex flex-col border-r" style={{ width: 340, flexShrink: 0, borderColor: 'rgba(255,255,255,0.05)' }}>

                    {/* Stats strip */}
                    <div className="grid grid-cols-4 gap-px flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {[
                            { v: stats.total, l: 'Total', c: '#C9A84C' },
                            { v: stats.qualified, l: 'Qualified', c: '#4ADE80' },
                            { v: stats.handoffs, l: 'Handoffs', c: '#F87171' },
                            { v: (parseFloat(stats.avgSentiment) > 0 ? '+' : '') + stats.avgSentiment, l: 'Sentiment', c: parseFloat(stats.avgSentiment) > 0 ? '#4ADE80' : parseFloat(stats.avgSentiment) < 0 ? '#F87171' : '#94A3B8' },
                        ].map(s => (
                            <div key={s.l} className="px-3 py-3 text-center" style={{ background: '#0A0F1E' }}>
                                <p className="font-outfit font-black text-lg" style={{ color: s.c }}>{s.v}</p>
                                <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: 'rgba(240,237,232,0.3)' }}>{s.l}</p>
                            </div>
                        ))}
                    </div>

                    {/* Intent filter */}
                    <div className="px-4 py-3 flex-shrink-0 flex gap-2 overflow-x-auto"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {['ALL', ...Object.keys(INTENT_META)].map(k => {
                            const m = INTENT_META[k];
                            const active = filterIntent === k;
                            return (
                                <button key={k}
                                    onClick={() => setFilterIntent(k)}
                                    className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 transition-all"
                                    style={{
                                        background: active ? (m ? `${m.color}20` : 'rgba(201,168,76,0.15)') : 'rgba(255,255,255,0.04)',
                                        color: active ? (m ? m.color : '#C9A84C') : 'rgba(240,237,232,0.3)',
                                        border: `1px solid ${active ? (m ? `${m.color}35` : 'rgba(201,168,76,0.3)') : 'rgba(255,255,255,0.07)'}`,
                                    }}>
                                    {k === 'ALL' ? '⬜ All' : `${m.emoji} ${m.label}`}
                                </button>
                            );
                        })}
                    </div>

                    {/* Conversation list */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-40">
                                <RefreshCw size={20} style={{ color: 'rgba(201,168,76,0.4)' }} className="animate-spin" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                                <MessageSquare size={32} style={{ color: 'rgba(201,168,76,0.15)' }} className="mb-3" />
                                <p className="text-sm font-bold" style={{ color: 'rgba(240,237,232,0.3)' }}>No conversations yet</p>
                                <p className="text-[11px] mt-1" style={{ color: 'rgba(240,237,232,0.2)' }}>Open the chat widget to start a test conversation</p>
                            </div>
                        ) : (
                            filtered.map(conv => (
                                <button key={conv.id}
                                    onClick={() => setActiveConv(conv)}
                                    className="w-full text-left px-4 py-4 border-b transition-all hover:bg-white/[0.02]"
                                    style={{
                                        borderColor: 'rgba(255,255,255,0.04)',
                                        background: activeConv?.id === conv.id ? 'rgba(201,168,76,0.06)' : 'transparent',
                                    }}>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ background: 'rgba(255,255,255,0.05)', fontSize: '14px' }}>
                                                {conv.channel === 'whatsapp' ? '💬' : '🌐'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white leading-none truncate">
                                                    {conv.lead?.customer_name || 'Anonymous Visitor'}
                                                </p>
                                                <p className="text-[9px] mt-0.5" style={{ color: 'rgba(240,237,232,0.3)' }}>
                                                    {conv.message_count} messages · {conv.channel}
                                                </p>
                                            </div>
                                        </div>
                                        <SentimentIcon score={conv.sentiment} />
                                    </div>

                                    <p className="text-[11px] mb-2 line-clamp-2 leading-relaxed" style={{ color: 'rgba(240,237,232,0.4)' }}>
                                        {conv.last_message || '—'}
                                    </p>

                                    <div className="flex items-center justify-between">
                                        <IntentBadge intent={conv.intent} />
                                        <span className="text-[9px]" style={{ color: 'rgba(240,237,232,0.2)' }}>
                                            {new Date(conv.updated_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Right: Conversation detail or splash ── */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {activeConv ? (
                        <ConversationDetail conv={activeConv} token={token} />
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center anim-fade-up">
                                <div className="h-20 w-20 mx-auto mb-6 rounded-3xl flex items-center justify-center text-3xl"
                                    style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}>
                                    💬
                                </div>
                                <p className="font-outfit font-black text-xl text-white mb-2">Select a conversation</p>
                                <p className="text-sm" style={{ color: 'rgba(240,237,232,0.35)' }}>
                                    Click any conversation to view the full transcript and lead details.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Notifications panel (slide-in) ── */}
            {showNotifications && (
                <div className="fixed top-0 right-0 h-full z-50 flex"
                    style={{ width: 380 }}>
                    <div className="flex-1 overflow-y-auto"
                        style={{ background: 'rgba(10,15,30,0.98)', borderLeft: '1px solid rgba(201,168,76,0.15)', backdropFilter: 'blur(20px)' }}>
                        <div className="px-6 py-5 flex items-center justify-between sticky top-0"
                            style={{ background: 'rgba(10,15,30,0.95)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 className="font-outfit font-black text-base text-white">Alerts</h3>
                            <button onClick={() => setShowNotifications(false)}>
                                <X size={16} style={{ color: 'rgba(240,237,232,0.4)' }} />
                            </button>
                        </div>
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                                <CheckCircle2 size={28} style={{ color: 'rgba(74,222,128,0.3)' }} className="mb-3" />
                                <p className="text-sm font-bold" style={{ color: 'rgba(240,237,232,0.3)' }}>All clear!</p>
                            </div>
                        ) : notifications.map(n => (
                            <div key={n.id} className="px-6 py-4 border-b flex gap-3 items-start"
                                style={{ borderColor: 'rgba(255,255,255,0.05)', background: n.urgent ? 'rgba(248,113,113,0.04)' : 'transparent' }}>
                                <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                                    {n.type === 'HUMAN_HANDOFF' ? '🚨' : n.type === 'TEST_DRIVE_BOOKED' ? '🔑' : n.type === 'SERVICE_BOOKED' ? '🔧' : '🎯'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-white mb-1">{n.type.replace(/_/g, ' ')}</p>
                                    <p className="text-[10px] leading-relaxed whitespace-pre-line" style={{ color: 'rgba(240,237,232,0.4)' }}>
                                        {n.message.slice(0, 200)}
                                    </p>
                                    <button onClick={() => markRead(n.id)}
                                        className="mt-2 text-[9px] font-bold px-2 py-1 rounded-full"
                                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(240,237,232,0.4)' }}>
                                        Mark read
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="w-full h-full absolute inset-0 -z-10" onClick={() => setShowNotifications(false)} />
                </div>
            )}

            {/* ── Settings panel ── */}
            {showSettings && (
                <div className="fixed top-0 right-0 h-full z-50" style={{ width: 400 }}>
                    <div className="h-full overflow-y-auto px-8 py-8 space-y-6"
                        style={{ background: 'rgba(10,15,30,0.98)', borderLeft: '1px solid rgba(201,168,76,0.15)', backdropFilter: 'blur(20px)' }}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-outfit font-black text-base text-white">AI Settings</h3>
                            <button onClick={() => setShowSettings(false)}>
                                <X size={16} style={{ color: 'rgba(240,237,232,0.4)' }} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(201,168,76,0.5)' }}>
                                Anthropic API Key
                            </p>
                            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(240,237,232,0.4)' }}>
                                Enter your claude API key from <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="underline" style={{ color: '#60A5FA' }}>console.anthropic.com</a>.
                                The chatbot will start using real Claude responses immediately.
                            </p>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2" size={15} style={{ color: 'rgba(201,168,76,0.4)' }} />
                                <input
                                    type={showApiKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                    placeholder="sk-ant-api03-…"
                                    className="lux-input pl-11 pr-12 text-sm font-mono"
                                />
                                <button type="button" onClick={() => setShowApiKey(p => !p)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2"
                                    style={{ color: 'rgba(240,237,232,0.25)' }}>
                                    {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            <button onClick={saveApiKey} disabled={savingKey || !apiKey.trim()}
                                className="w-full py-3.5 font-outfit font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 rounded-2xl disabled:opacity-50 transition-all"
                                style={{ background: 'linear-gradient(135deg, #C9A84C, #9A7830)', color: '#0A0F1E' }}>
                                {savingKey ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                                {savingKey ? 'Saving…' : 'Activate Key'}
                            </button>
                            {saveMsg && (
                                <p className="text-[11px] text-center font-bold" style={{ color: saveMsg.startsWith('✓') ? '#4ADE80' : '#F87171' }}>
                                    {saveMsg}
                                </p>
                            )}
                        </div>

                        <div className="pt-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(240,237,232,0.3)' }}>
                                Model
                            </p>
                            <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <p className="text-sm font-bold text-white">claude-sonnet-4-5</p>
                                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(240,237,232,0.35)' }}>Latest Claude model — intent + conversation</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Embeddable preview widget ── */}
            {showPreview && (
                <div className="fixed bottom-6 right-6 z-50" style={{ width: 380, height: 580, borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
                            style={{ background: 'rgba(6,10,20,0.9)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(201,168,76,0.5)' }}>Live Preview</span>
                            <button onClick={() => setShowPreview(false)}>
                                <X size={14} style={{ color: 'rgba(240,237,232,0.4)' }} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <ChatWidget embedded tenantId={user?.tenant_id} tenantName="KenganAuto Demo" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── Conversation detail panel ── */
const ConversationDetail = ({ conv, token }) => {
    const [fullConv, setFullConv] = useState(null);

    useEffect(() => {
        if (!conv?.id || !token) return;
        fetch(`${API_BASE}/chat/conversation/${conv.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setFullConv(data); })
            .catch(() => { });
    }, [conv?.id, token]);

    const display = fullConv || conv;

    return (
        <div className="flex h-full">
            {/* Messages */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-8 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-outfit font-black text-lg text-white">
                                {display.lead?.customer_name || 'Anonymous Visitor'}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                                <IntentBadge intent={display.intent} />
                                <span className="text-[10px]" style={{ color: 'rgba(240,237,232,0.3)' }}>
                                    {display.channel} · {display.message_count || (display.messages?.length)} messages
                                </span>
                            </div>
                        </div>
                        <SentimentIcon score={display.sentiment} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                    {(fullConv?.messages || []).map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed`}
                                style={{
                                    background: msg.role === 'user'
                                        ? 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.12))'
                                        : 'rgba(255,255,255,0.04)',
                                    color: '#F0EDE8',
                                    border: `1px solid ${msg.role === 'user' ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                }}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    {msg.role === 'user'
                                        ? <User size={11} style={{ color: '#C9A84C' }} />
                                        : <div className="text-[10px] font-bold" style={{ color: 'rgba(201,168,76,0.6)' }}>Kengan AI</div>
                                    }
                                    <span className="text-[9px]" style={{ color: 'rgba(240,237,232,0.25)' }}>
                                        {new Date(msg.timestamp).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {(!fullConv?.messages || fullConv.messages.length === 0) && (
                        <div className="text-center py-12" style={{ color: 'rgba(240,237,232,0.25)' }}>
                            <p className="text-sm">Loading conversation…</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Lead sidebar */}
            <div className="w-64 flex-shrink-0 border-l overflow-y-auto px-6 py-6 space-y-6"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(201,168,76,0.4)' }}>Lead Details</p>
                    {[
                        [<User size={12} />, display.lead?.customer_name || '—'],
                        [<Phone size={12} />, display.lead?.customer_phone || '—'],
                        [<Mail size={12} />, display.lead?.customer_email || '—'],
                        [<Car size={12} />, display.lead?.vehicle_interest || '—'],
                    ].map(([icon, val], i) => (
                        <div key={i} className="flex items-center gap-2.5 py-2.5"
                            style={{ borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <span style={{ color: 'rgba(201,168,76,0.4)' }}>{icon}</span>
                            <span className="text-[11px] font-medium" style={{ color: 'rgba(240,237,232,0.6)' }}>{val}</span>
                        </div>
                    ))}
                </div>

                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(240,237,232,0.3)' }}>Conversation</p>
                    {[
                        ['ID', (display.id || '').slice(-8)],
                        ['Channel', display.channel || '—'],
                        ['Intent', display.intent?.replace(/_/g, ' ') || '—'],
                        ['Sentiment', display.sentiment?.toFixed(2) || '0.00'],
                        ['Started', new Date(display.created_at).toLocaleDateString('en-ZA')],
                    ].map(([k, v], i) => (
                        <div key={i} className="flex justify-between py-2"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <span className="text-[10px]" style={{ color: 'rgba(240,237,232,0.3)' }}>{k}</span>
                            <span className="text-[10px] font-bold" style={{ color: 'rgba(240,237,232,0.7)' }}>{v}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Chatbot;
