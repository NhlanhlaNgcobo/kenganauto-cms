/**
 * KenganAuto — Chat Widget
 * Embeds on any website page or the CRM preview.
 *
 * Props:
 *   tenantName    — Dealership name
 *   tenantId      — Tenant ID (sent with each message)
 *   channel       — 'website' | 'whatsapp'
 *   position      — 'bottom-right' | 'bottom-left'
 *   open          — controlled open state (optional)
 *   onClose       — callback when widget is closed (optional)
 *   embedded      — if true, renders as a full block (no FAB)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    X, Send, Minimize2, MessageCircle, Wifi, WifiOff,
    ChevronDown, User, Bot, AlertCircle, RefreshCw,
    Phone, Car, Calculator, Wrench, ArrowUpRight
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/* ── Intent badge colours ── */
const INTENT_STYLES = {
    VEHICLE_ENQUIRY: { color: '#C9A84C', label: '🚗 Vehicle Interest' },
    TEST_DRIVE: { color: '#4ADE80', label: '🔑 Test Drive' },
    FINANCE: { color: '#60A5FA', label: '💳 Finance' },
    TRADE_IN: { color: '#FB923C', label: '🔄 Trade-In' },
    SERVICE_BOOKING: { color: '#A78BFA', label: '🔧 Service' },
    PARTS: { color: '#F472B6', label: '🔩 Parts' },
    GENERAL_SUPPORT: { color: '#94A3B8', label: '💬 Support' },
    LEAD_CAPTURE: { color: '#6EE7B7', label: '📋 Lead' },
    HUMAN_HANDOFF: { color: '#F87171', label: '👤 Human Needed' },
};

/* ── Typing indicator ── */
const TypingDots = () => (
    <div className="flex items-center gap-1 px-4 py-3">
        {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full"
                style={{
                    background: 'rgba(201,168,76,0.6)',
                    animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
        ))}
        <style>{`
      @keyframes typing-bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30%           { transform: translateY(-6px); }
      }
    `}</style>
    </div>
);

/* ── Rich extras display (finance breakdown, trade-in estimate) ── */
const ExtrasPanel = ({ extras }) => {
    if (!extras) return null;

    if (extras.type === 'finance_breakdown') {
        const { scenarios, rate } = extras.data;
        return (
            <div className="mx-3 mb-3 rounded-xl overflow-hidden"
                style={{ border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(10,15,30,0.6)' }}>
                <div className="px-4 py-2.5 flex items-center gap-2"
                    style={{ background: 'rgba(201,168,76,0.08)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
                    <Calculator size={13} style={{ color: '#C9A84C' }} />
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#C9A84C' }}>
                        Finance Scenarios @ {rate}%
                    </span>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    {scenarios.map(s => (
                        <div key={s.term_months} className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-[11px] font-bold" style={{ color: 'rgba(240,237,232,0.5)' }}>
                                {s.term_months} months
                            </span>
                            <div className="text-right">
                                <p className="font-outfit font-black text-sm" style={{ color: '#C9A84C' }}>
                                    R {s.monthly.toLocaleString()} / mo
                                </p>
                                <p className="text-[9px]" style={{ color: 'rgba(240,237,232,0.3)' }}>
                                    Total: R {s.total_repayable.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (extras.type === 'trade_in_estimate') {
        const { low, high, note } = extras.data;
        return (
            <div className="mx-3 mb-3 px-4 py-3 rounded-xl"
                style={{ border: '1px solid rgba(251,146,60,0.2)', background: 'rgba(251,146,60,0.05)' }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#FB923C' }}>
                    Trade-In Estimate
                </p>
                <p className="font-outfit font-black text-lg" style={{ color: '#FB923C' }}>
                    R {low.toLocaleString()} – R {high.toLocaleString()}
                </p>
                <p className="text-[9px] mt-1" style={{ color: 'rgba(240,237,232,0.4)' }}>{note}</p>
            </div>
        );
    }

    return null;
};

/* ══════════════════════════════════════════════ */
const ChatWidget = ({
    tenantName = 'KenganAuto',
    tenantId = null,
    channel = 'website',
    position = 'bottom-right',
    open: controlledOpen,
    onClose,
    embedded = false,
}) => {
    const [isOpen, setIsOpen] = useState(embedded || controlledOpen || false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [intent, setIntent] = useState(null);
    const [sentiment, setSentiment] = useState(0);
    const [extras, setExtras] = useState(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isHandoff, setIsHandoff] = useState(false);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Controlled open state
    useEffect(() => {
        if (controlledOpen !== undefined) setIsOpen(controlledOpen);
    }, [controlledOpen]);

    // Network status
    useEffect(() => {
        const on = () => setIsOnline(true);
        const off = () => setIsOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, extras]);

    // Greeting on open
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                id: 'greeting',
                role: 'assistant',
                content: `👋 Hi there! Welcome to **${tenantName}**. I'm Kengan, your virtual assistant.\n\nI can help you with:\n• 🚗 Vehicle enquiries & availability\n• 💳 Finance calculations\n• 🔑 Test drive bookings\n• 🔄 Trade-in valuations\n• 🔧 Service bookings\n\nWhat can I help you with today?`,
                timestamp: new Date().toISOString(),
            }]);
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, tenantName]);

    /* ── Send message ── */
    const sendMessage = useCallback(async () => {
        const text = inputText.trim();
        if (!text || isTyping) return;

        const userMsg = { id: Date.now(), role: 'user', content: text, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);
        setExtras(null);

        try {
            const res = await fetch(`${API_BASE}/chat/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    conversation_id: conversationId,
                    channel,
                    tenant_id: tenantId,
                }),
            });

            const data = await res.json();

            if (data.conversation_id) setConversationId(data.conversation_id);
            if (data.intent) setIntent(data.intent);
            if (data.sentiment !== undefined) setSentiment(data.sentiment);
            if (data.is_handoff) setIsHandoff(true);
            if (data.extras) setExtras(data.extras);

            const botMsg = {
                id: `bot_${Date.now()}`,
                role: 'assistant',
                content: data.message || data.error || 'Something went wrong.',
                timestamp: new Date().toISOString(),
                degraded: data.degraded,
            };
            setMessages(prev => [...prev, botMsg]);
        } catch {
            setMessages(prev => [...prev, {
                id: `err_${Date.now()}`,
                role: 'assistant',
                content: `I'm having trouble connecting right now. Please try again or call us directly.`,
                timestamp: new Date().toISOString(),
                isError: true,
            }]);
        } finally {
            setIsTyping(false);
        }
    }, [inputText, isTyping, conversationId, channel, tenantId]);

    const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

    const toggle = () => {
        setIsOpen(p => {
            if (p && onClose) onClose();
            return !p;
        });
    };

    /* ── Render message content (handle **bold** and \n) ── */
    const renderContent = (text) => {
        return text.split('\n').map((line, i) => {
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return (
                <p key={i} className={i > 0 ? 'mt-1' : ''}>
                    {parts.map((part, j) =>
                        part.startsWith('**') && part.endsWith('**')
                            ? <strong key={j}>{part.slice(2, -2)}</strong>
                            : part
                    )}
                </p>
            );
        });
    };

    const intentStyle = intent ? INTENT_STYLES[intent] : null;
    const sentimentColor = sentiment > 0.3 ? '#4ADE80' : sentiment < -0.3 ? '#F87171' : '#94A3B8';

    /* ── Widget container ── */
    const widgetStyle = embedded ? {} : {
        position: 'fixed',
        bottom: 24,
        [position === 'bottom-right' ? 'right' : 'left']: 24,
        zIndex: 9999,
    };

    return (
        <div style={widgetStyle}>
            {/* ── FAB button (when not embedded) ── */}
            {!embedded && !isOpen && (
                <button onClick={toggle}
                    className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #C9A84C, #9A7830)',
                        boxShadow: '0 8px 32px rgba(201,168,76,0.4)',
                    }}>
                    <MessageCircle size={26} className="text-[#0A0F1E]" />
                </button>
            )}

            {/* ── Chat window ── */}
            {(isOpen || embedded) && (
                <div className="flex flex-col overflow-hidden"
                    style={{
                        width: embedded ? '100%' : 380,
                        height: embedded ? '100%' : 600,
                        minHeight: embedded ? 400 : undefined,
                        borderRadius: embedded ? 0 : '1.5rem',
                        background: 'linear-gradient(160deg, #0A0F1E, #0D1526)',
                        border: '1px solid rgba(201,168,76,0.18)',
                        boxShadow: embedded ? 'none' : '0 32px 80px rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(20px)',
                    }}>

                    {/* ── Header ── */}
                    <div className="flex-shrink-0 flex items-center justify-between px-5 py-4"
                        style={{ background: 'rgba(10,15,30,0.6)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl flex items-center justify-center font-outfit font-black text-sm flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.08))', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>
                                KA
                            </div>
                            <div>
                                <p className="font-outfit font-black text-sm text-white leading-none">Kengan</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    {isOnline
                                        ? <><div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: '0 0 4px #4ADE80' }} /><span className="text-[9px] font-bold text-green-400">Online</span></>
                                        : <><WifiOff size={10} className="text-red-400" /><span className="text-[9px] text-red-400">Offline</span></>
                                    }
                                    {isHandoff && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171' }}>Transfer in progress</span>}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Intent badge */}
                            {intentStyle && (
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full"
                                    style={{ background: `${intentStyle.color}15`, color: intentStyle.color, border: `1px solid ${intentStyle.color}30` }}>
                                    {intentStyle.label}
                                </span>
                            )}
                            {/* Sentiment */}
                            {intent && (
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: sentimentColor, boxShadow: `0 0 6px ${sentimentColor}` }} />
                            )}
                            {!embedded && (
                                <button onClick={toggle} className="p-1.5 rounded-lg transition-all hover:bg-white/10" style={{ color: 'rgba(240,237,232,0.5)' }}>
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Messages ── */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                        {messages.map(msg => (
                            <div key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} px-4`}>
                                <div className={`max-w-[82%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="flex items-center gap-1.5 mb-1 ml-1">
                                            <div className="w-5 h-5 rounded-lg flex items-center justify-center"
                                                style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                                                <span className="text-[8px] font-black text-[#C9A84C]">KA</span>
                                            </div>
                                            <span className="text-[9px] font-bold" style={{ color: 'rgba(201,168,76,0.5)' }}>Kengan</span>
                                            {msg.degraded && (
                                                <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#FBBF24' }}>offline mode</span>
                                            )}
                                        </div>
                                    )}
                                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed`}
                                        style={{
                                            background: msg.role === 'user'
                                                ? 'linear-gradient(135deg, #C9A84C, #9A7830)'
                                                : msg.isError
                                                    ? 'rgba(239,68,68,0.1)'
                                                    : 'rgba(255,255,255,0.05)',
                                            color: msg.role === 'user'
                                                ? '#0A0F1E'
                                                : msg.isError ? '#FCA5A5' : '#F0EDE8',
                                            border: msg.role === 'user' ? 'none'
                                                : msg.isError
                                                    ? '1px solid rgba(239,68,68,0.25)'
                                                    : '1px solid rgba(255,255,255,0.06)',
                                            fontWeight: msg.role === 'user' ? 700 : 400,
                                        }}>
                                        {renderContent(msg.content)}
                                    </div>
                                    <p className="text-[9px] mt-1 px-1" style={{ color: 'rgba(240,237,232,0.2)', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                                        {new Date(msg.timestamp).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start px-4">
                                <div className="rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <TypingDots />
                                </div>
                            </div>
                        )}

                        {/* Extras panel (finance / trade-in) */}
                        <ExtrasPanel extras={extras} />

                        <div ref={bottomRef} />
                    </div>

                    {/* ── Quick Reply chips ── */}
                    {messages.length <= 1 && (
                        <div className="px-4 pb-3 flex flex-wrap gap-2">
                            {[
                                { label: '🚗 Vehicle Search', text: "I'm looking for a car" },
                                { label: '💳 Finance', text: 'Can I get a finance quote?' },
                                { label: '🔑 Test Drive', text: "I'd like to book a test drive" },
                                { label: '🔄 Trade-In', text: "What is my car worth?" },
                                { label: '🔧 Book Service', text: 'I need to book a service' },
                            ].map(chip => (
                                <button key={chip.text}
                                    onClick={() => { setInputText(chip.text); setTimeout(sendMessage, 0); setInputText(chip.text); }}
                                    className="text-[10px] font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105"
                                    style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.8)' }}>
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ── Input ── */}
                    <div className="flex-shrink-0 p-4 pt-2"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex gap-3 items-center">
                            <textarea
                                ref={inputRef}
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={handleKey}
                                rows={1}
                                placeholder="Type a message…"
                                className="flex-1 resize-none text-sm py-3 px-4 rounded-xl outline-none transition-all"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(201,168,76,0.15)',
                                    color: '#F0EDE8',
                                    fontFamily: 'Inter',
                                    lineHeight: 1.4,
                                    maxHeight: 100,
                                }}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!inputText.trim() || isTyping || !isOnline}
                                className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                                style={{
                                    background: inputText.trim() && !isTyping
                                        ? 'linear-gradient(135deg, #C9A84C, #9A7830)'
                                        : 'rgba(255,255,255,0.06)',
                                    color: inputText.trim() && !isTyping ? '#0A0F1E' : 'rgba(240,237,232,0.3)',
                                }}>
                                <Send size={16} />
                            </button>
                        </div>
                        <p className="text-center text-[9px] mt-2" style={{ color: 'rgba(240,237,232,0.15)' }}>
                            Powered by KenganAuto AI · POPIA compliant
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWidget;
