import React, { useState, useEffect, useRef } from 'react';
import {
    X, Phone, Mail, MessageCircle, Calendar, DollarSign,
    ArrowLeftRight, CheckCircle, XCircle, RefreshCw, Zap,
    ChevronDown, ChevronUp, Send, User, Clock, Star,
    AlertTriangle, FileText, Activity, ExternalLink
} from 'lucide-react';
import { useLeadDetail } from '../hooks/useLeads';
import KenganInsightsPanel from './KenganInsightsPanel';
import AIScoreBadge from './AIScoreBadge';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STAGES = [
    { id: 'new', label: 'New', color: '#3B7FF5' },
    { id: 'contacted', label: 'Contacted', color: '#EAB308' },
    { id: 'qualified', label: 'Qualified', color: '#F97316' },
    { id: 'test_drive_booked', label: 'Test Drive', color: '#A855F7' },
    { id: 'negotiation', label: 'Negotiation', color: '#F59E0B' },
    { id: 'won', label: 'Won', color: '#22C55E' },
    { id: 'lost', label: 'Lost', color: '#EF4444' },
];

function scoreColor(s) { return s >= 71 ? '#22C55E' : s >= 41 ? '#F97316' : '#EF4444'; }
function scoreBg(s) { return s >= 71 ? 'rgba(34,197,94,0.12)' : s >= 41 ? 'rgba(249,115,22,0.12)' : 'rgba(239,68,68,0.12)'; }
function timeAgo(iso) {
    if (!iso) return '—';
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'yesterday' : `${d}d ago`;
}
function initials(name = '') { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function fmt(isoStr) {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ── Activity type icon mapping ── */
const ACT_ICONS = {
    created: { icon: Star, color: '#C9A84C' },
    stage_change: { icon: ArrowLeftRight, color: '#3B7FF5' },
    note: { icon: FileText, color: '#A855F7' },
    assigned: { icon: User, color: '#22C55E' },
    whatsapp: { icon: MessageCircle, color: '#25D366' },
};

/* ── Section collapsible wrapper ── */
const Section = ({ title, icon: Icon, defaultOpen = true, children, badge }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <button className="w-full flex items-center justify-between py-4 px-6 hover:bg-white/[0.02] transition-colors"
                onClick={() => setOpen(p => !p)}>
                <div className="flex items-center gap-2">
                    <Icon size={14} style={{ color: 'rgba(201,168,76,0.6)' }} />
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'rgba(240,237,232,0.4)' }}>{title}</span>
                    {badge !== undefined && badge !== null && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: 'rgba(59,127,245,0.15)', color: '#60A5FA' }}>{badge}</span>
                    )}
                </div>
                {open ? <ChevronUp size={14} className="text-white/20" /> : <ChevronDown size={14} className="text-white/20" />}
            </button>
            {open && <div className="px-6 pb-5">{children}</div>}
        </div>
    );
};

/* ════════════════════════════════════════════════════════════
   LEAD DETAIL PANEL
   ════════════════════════════════════════════════════════════ */
export default function LeadDetailPanel({ leadId, team, teamMap, onClose, onStageChange, onAddNote, onAssign, onAISummary }) {
    const { lead, loading, error, refresh } = useLeadDetail(leadId);

    const [noteText, setNoteText] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const [aiSummary, setAISummary] = useState(null);
    const [gettingAI, setGettingAI] = useState(false);
    const [stageMenuOpen, setStageMenuOpen] = useState(false);
    const [assignMenuOpen, setAssignMenuOpen] = useState(false);
    const [activeConvIdx, setActiveConvIdx] = useState(0);

    const panelRef = useRef(null);

    /* Close on Escape */
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        setAddingNote(true);
        try {
            await onAddNote(leadId, noteText);
            setNoteText('');
            refresh();
        } finally {
            setAddingNote(false);
        }
    };

    const handleGetAISummary = async () => {
        setGettingAI(true);
        try {
            const summary = await onAISummary(leadId);
            setAISummary(summary);
        } finally {
            setGettingAI(false);
        }
    };

    const handleStageChange = (stageId) => {
        onStageChange(leadId, stageId);
        setStageMenuOpen(false);
    };

    const handleAssign = (userId) => {
        onAssign(leadId, userId);
        setAssignMenuOpen(false);
    };

    const currentStage = STAGES.find(s => s.id === lead?.status) || STAGES[0];
    const assignee = teamMap?.[lead?.assigned_to];
    const whatsappLink = lead?.customer_phone
        ? `https://wa.me/${lead.customer_phone.replace(/\D/g, '').replace(/^0/, '27')}?text=Hi ${encodeURIComponent(lead.customer_name || '')}, thanks for your interest in ${encodeURIComponent(lead.vehicle_interest || 'a vehicle')} at KenganAuto.`
        : null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                onClick={onClose} />

            {/* Slide-over panel */}
            <div ref={panelRef}
                className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden anim-slide-right"
                style={{
                    width: 'min(520px, 95vw)',
                    background: 'linear-gradient(180deg, #0D1526 0%, #0A0F1E 100%)',
                    borderLeft: '1px solid rgba(201,168,76,0.12)',
                    boxShadow: '-32px 0 80px rgba(0,0,0,0.6)',
                }}>

                {/* ── Panel Header ── */}
                <div className="flex items-center justify-between px-6 py-5 flex-shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: 'rgba(201,168,76,0.4)' }}>Lead #{lead?.id}</p>
                        <h2 className="font-outfit font-black text-xl text-white">
                            {loading ? '…' : lead?.customer_name}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={refresh} className="p-2.5 rounded-xl text-white/30 hover:text-white hover:bg-white/08 transition-all">
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={onClose} className="p-2.5 rounded-xl text-white/30 hover:text-white hover:bg-white/08 transition-all">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {loading && (
                    <div className="flex-1 flex items-center justify-center">
                        <RefreshCw className="animate-spin text-[#C9A84C]" size={28} />
                    </div>
                )}

                {error && (
                    <div className="m-6 p-4 rounded-xl text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)' }}>
                        {error}
                    </div>
                )}

                {lead && (
                    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(201,168,76,0.15) transparent' }}>

                        {/* ── Stage + Overdue banner (score now in KenganInsightsPanel) ── */}
                        <div className="px-6 py-4 flex items-center gap-3 flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {/* Stage pill with dropdown */}
                            <div className="relative">
                                <button onClick={() => setStageMenuOpen(p => !p)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-all"
                                    style={{ background: `${currentStage.color}18`, color: currentStage.color, border: `1px solid ${currentStage.color}30` }}>
                                    <span className="w-2 h-2 rounded-full" style={{ background: currentStage.color }} />
                                    {currentStage.label}
                                    <ChevronDown size={12} />
                                </button>
                                {stageMenuOpen && (
                                    <div className="absolute top-full left-0 mt-1 z-10 w-48 rounded-2xl p-1.5 shadow-xl"
                                        style={{ background: '#111E35', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        {STAGES.map(s => (
                                            <button key={s.id} onClick={() => handleStageChange(s.id)}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-white/05 transition-all text-left">
                                                <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                                                <span className="text-white/70">{s.label}</span>
                                                {s.id === lead.status && <CheckCircle size={12} className="ml-auto text-white/30" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Small score badge */}
                            <AIScoreBadge score={lead.ai_score ?? 0} size="sm" showLabel animated />

                            {/* Overdue */}
                            {lead.overdue && (
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    <AlertTriangle size={11} /> Overdue
                                </div>
                            )}
                        </div>

                        {/* ── Quick Actions ── */}
                        <div className="px-6 py-4 flex flex-wrap gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {whatsappLink && (
                                <a href={whatsappLink} target="_blank" rel="noopener"
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                                    style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.2)' }}>
                                    <MessageCircle size={13} /> WhatsApp
                                </a>
                            )}
                            <button onClick={() => handleStageChange('test_drive_booked')}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                                style={{ background: 'rgba(168,85,247,0.12)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.2)' }}>
                                <Calendar size={13} /> Book Test Drive
                            </button>
                            <button onClick={() => handleStageChange('won')}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                                style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
                                <CheckCircle size={13} /> Mark Won
                            </button>
                            <button onClick={() => handleStageChange('lost')}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                                style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <XCircle size={13} /> Mark Lost
                            </button>
                            <button onClick={() => handleStageChange('negotiation')}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                                style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <DollarSign size={13} /> Start Finance
                            </button>
                        </div>

                        {/* ── Customer Info ── */}
                        <Section title="Customer Info" icon={User} defaultOpen={true}>
                            <div className="space-y-3">
                                {[
                                    { label: 'Name', value: lead.customer_name },
                                    { label: 'Phone', value: lead.customer_phone, href: `tel:${lead.customer_phone}` },
                                    { label: 'Email', value: lead.customer_email, href: `mailto:${lead.customer_email}` },
                                    { label: 'Source', value: lead.source?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) },
                                    { label: 'Created', value: fmt(lead.created_at) },
                                    { label: 'Last Contact', value: timeAgo(lead.last_contact_at) },
                                ].map(({ label, value, href }) => value && (
                                    <div key={label} className="flex items-center justify-between gap-4">
                                        <span className="text-xs text-white/30 flex-shrink-0 w-28">{label}</span>
                                        {href ? (
                                            <a href={href} className="text-sm font-medium text-[#3B7FF5] hover:text-[#60A5FA] transition-colors truncate">{value}</a>
                                        ) : (
                                            <span className="text-sm text-white/80 flex-1 text-right">{value}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* ── Vehicle & Finance ── */}
                        <Section title="Vehicle & Finance" icon={DollarSign} defaultOpen={true}>
                            <div className="space-y-3">
                                {lead.vehicle_interest && (
                                    <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <p className="text-xs text-white/30 mb-1">Vehicle Interest</p>
                                        <p className="text-sm font-bold text-white">{lead.vehicle_interest}</p>
                                    </div>
                                )}
                                {(lead.budget_min || lead.budget_max) && (
                                    <div className="flex gap-3">
                                        {lead.budget_min && (
                                            <div className="flex-1 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <p className="text-[10px] text-white/30 mb-0.5">Budget Min</p>
                                                <p className="text-sm font-bold text-white">R {(lead.budget_min / 1000).toFixed(0)}k</p>
                                            </div>
                                        )}
                                        {lead.budget_max && (
                                            <div className="flex-1 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <p className="text-[10px] text-white/30 mb-0.5">Budget Max</p>
                                                <p className="text-sm font-bold text-white">R {(lead.budget_max / 1000).toFixed(0)}k</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* ── Kengan AI Scoring Panel (replaces flat summary) ── */}
                        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <KenganInsightsPanel
                                lead={lead}
                                onRescoreComplete={refresh}
                            />
                        </div>

                        {/* ── Conversation History ── */}
                        {lead.conversations?.length > 0 && (
                            <Section title="Conversation History" icon={MessageCircle} badge={lead.conversations.length} defaultOpen={false}>
                                {lead.conversations.map((conv, ci) => (
                                    <div key={ci} className="mb-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                style={{ background: 'rgba(59,127,245,0.12)', color: '#60A5FA' }}>
                                                {conv.channel}
                                            </span>
                                            {conv.intent_detected && (
                                                <span className="text-[10px] text-white/25">{conv.intent_detected}</span>
                                            )}
                                        </div>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {(conv.messages || []).map((msg, mi) => (
                                                <div key={mi} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className="max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed"
                                                        style={msg.role === 'user'
                                                            ? { background: '#C9A84C', color: '#0A0F1E' }
                                                            : { background: 'rgba(255,255,255,0.07)', color: 'rgba(240,237,232,0.8)' }}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </Section>
                        )}

                        {/* ── Notes ── */}
                        <Section title="Notes" icon={FileText} defaultOpen={true}>
                            {lead.notes && (
                                <div className="mb-3 p-3 rounded-xl text-sm text-white/70 leading-relaxed"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    {lead.notes}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <textarea
                                    className="luxury-input flex-1 text-sm"
                                    rows={2}
                                    value={noteText}
                                    onChange={e => setNoteText(e.target.value)}
                                    placeholder="Add a note…"
                                    style={{ resize: 'none' }}
                                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleAddNote(); }}
                                />
                                <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()}
                                    className="px-3 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                                    style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
                                    {addingNote ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                                </button>
                            </div>
                        </Section>

                        {/* ── Assign ── */}
                        <Section title="Assigned Salesperson" icon={User} defaultOpen={false}>
                            <div className="relative">
                                <button onClick={() => setAssignMenuOpen(p => !p)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl text-sm hover:bg-white/05 transition-all"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                                        style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
                                        {assignee ? initials(`${assignee.first_name} ${assignee.last_name}`) : '?'}
                                    </div>
                                    <span className="text-white/70">
                                        {assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Unassigned'}
                                    </span>
                                    <ChevronDown size={14} className="ml-auto text-white/20" />
                                </button>
                                {assignMenuOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 z-10 rounded-2xl p-1.5 shadow-xl"
                                        style={{ background: '#111E35', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        {team.map(u => (
                                            <button key={u.id} onClick={() => handleAssign(u.id)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/05 transition-all text-left">
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black"
                                                    style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
                                                    {initials(`${u.first_name} ${u.last_name}`)}
                                                </div>
                                                <div>
                                                    <p className="text-sm text-white/80">{u.first_name} {u.last_name}</p>
                                                    <p className="text-[10px] text-white/30">{u.role?.replace(/_/g, ' ')}</p>
                                                </div>
                                                {u.id === lead.assigned_to && <CheckCircle size={13} className="ml-auto text-[#C9A84C]" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* ── Activity Timeline ── */}
                        <Section title="Activity Timeline" icon={Activity} badge={lead.activity_log?.length} defaultOpen={false}>
                            {!lead.activity_log?.length ? (
                                <p className="text-xs text-white/25">No activity logged yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {[...(lead.activity_log || [])].reverse().map((act, i) => {
                                        const cfg = ACT_ICONS[act.type] || ACT_ICONS.created;
                                        const Icon = cfg.icon;
                                        return (
                                            <div key={i} className="flex items-start gap-3">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                                                    style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}>
                                                    <Icon size={10} style={{ color: cfg.color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-white/70 leading-relaxed">{act.message}</p>
                                                    {act.actor && <p className="text-[10px] text-white/25 mt-0.5">by {act.actor}</p>}
                                                </div>
                                                <span className="text-[10px] text-white/20 flex-shrink-0">
                                                    {timeAgo(act.timestamp)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Section>

                        {/* Bottom padding */}
                        <div className="h-8" />
                    </div>
                )}
            </div>
        </>
    );
}
