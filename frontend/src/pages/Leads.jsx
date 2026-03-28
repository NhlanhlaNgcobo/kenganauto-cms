import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
    Users, Filter, Search, Plus, LayoutGrid, List,
    ChevronDown, MessageCircle, Globe, Truck, Facebook,
    Phone, AlertTriangle, Clock, CheckCircle, XCircle,
    MoreHorizontal, Zap, ArrowRight, RefreshCw, Star,
    Trash2, UserCheck, X
} from 'lucide-react';
import { useLeads } from '../hooks/useLeads';
import LeadDetailPanel from '../components/LeadDetailPanel';
import AIScoreBadge, { getTier } from '../components/AIScoreBadge';
import { Skeleton, SkeletonTable } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

/* ════════════════════════════════════════════════════════════
   STAGE CONFIG
   ════════════════════════════════════════════════════════════ */
const STAGES = [
    { id: 'new', label: 'New', color: '#3B7FF5', glow: 'rgba(59,127,245,0.15)' },
    { id: 'contacted', label: 'Contacted', color: '#EAB308', glow: 'rgba(234,179,8,0.15)' },
    { id: 'qualified', label: 'Qualified', color: '#F97316', glow: 'rgba(249,115,22,0.15)' },
    { id: 'test_drive_booked', label: 'Test Drive', color: '#A855F7', glow: 'rgba(168,85,247,0.15)' },
    { id: 'negotiation', label: 'Negotiation', color: '#F59E0B', glow: 'rgba(245,158,11,0.15)' },
    { id: 'won', label: 'Won', color: '#22C55E', glow: 'rgba(34,197,94,0.15)' },
    { id: 'lost', label: 'Lost', color: '#EF4444', glow: 'rgba(239,68,68,0.15)' },
];

const SOURCE_ICONS = {
    whatsapp: { icon: MessageCircle, color: '#25D366', label: 'WhatsApp' },
    website: { icon: Globe, color: '#3B7FF5', label: 'Website' },
    autotrader: { icon: Truck, color: '#F97316', label: 'Autotrader' },
    cars_coza: { icon: Star, color: '#A855F7', label: 'Cars.co.za' },
    facebook: { icon: Facebook, color: '#1877F2', label: 'Facebook' },
    walk_in: { icon: Users, color: '#C9A84C', label: 'Walk-In' },
    phone: { icon: Phone, color: '#6B7280', label: 'Phone' },
};

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */
function scoreColor(score) {
    if (score >= 71) return '#22C55E';
    if (score >= 41) return '#F97316';
    return '#EF4444';
}

function scoreBg(score) {
    if (score >= 71) return 'rgba(34,197,94,0.12)';
    if (score >= 41) return 'rgba(249,115,22,0.12)';
    return 'rgba(239,68,68,0.12)';
}

function timeAgo(isoStr) {
    if (!isoStr) return null;
    const h = Math.floor((Date.now() - new Date(isoStr).getTime()) / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function initials(name = '') {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

/* ════════════════════════════════════════════════════════════
   LEAD CARD (Kanban)
   ════════════════════════════════════════════════════════════ */
const LeadCard = ({ lead, onDragStart, onSelect, teamMap }) => {
    const stage = STAGES.find(s => s.id === lead.status) || STAGES[0];
    const src = SOURCE_ICONS[lead.source] || SOURCE_ICONS.website;
    const SrcIcon = src.icon;
    const lastContact = lead.last_contact_at || lead.created_at;
    const hAgo = Math.floor((Date.now() - new Date(lastContact).getTime()) / 3600000);
    const assignee = teamMap[lead.assigned_to];

    return (
        <div
            draggable
            onDragStart={() => onDragStart(lead)}
            onClick={() => onSelect(lead)}
            className="rounded-2xl p-4 cursor-pointer select-none group transition-all duration-200 hover:-translate-y-0.5"
            style={{
                background: 'linear-gradient(135deg, rgba(17,30,53,0.95) 0%, rgba(13,21,38,0.9) 100%)',
                border: `1px solid rgba(255,255,255,0.06)`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.border = `1px solid ${stage.color}44`;
                e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${stage.color}22`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.06)';
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)';
            }}
        >
            {/* Overdue stripe */}
            {lead.overdue && (
                <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg text-[10px] font-bold"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                    <AlertTriangle size={10} />
                    Overdue — no contact in {hAgo}h
                </div>
            )}

            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{lead.customer_name}</p>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(240,237,232,0.4)' }}>
                        {lead.vehicle_interest || 'Vehicle TBC'}
                    </p>
                </div>
                {/* AI Score ring */}
                <AIScoreBadge score={lead.ai_score ?? 0} size="sm" ring animated className="flex-shrink-0" />
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Source */}
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: `${src.color}18`, color: src.color }}>
                        <SrcIcon size={9} />
                        {src.label}
                    </div>
                    {/* Last contact */}
                    <span className="text-[10px]" style={{ color: 'rgba(240,237,232,0.25)' }}>
                        {timeAgo(lastContact)}
                    </span>
                </div>
                {/* Assignee */}
                {assignee && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.08))', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}>
                        {initials(`${assignee.first_name} ${assignee.last_name}`)}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ════════════════════════════════════════════════════════════
   KANBAN COLUMN
   ════════════════════════════════════════════════════════════ */
const KanbanColumn = ({ stage, leads, onDragStart, onDragOver, onDrop, onSelect, teamMap }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div className="flex-shrink-0 w-72 flex flex-col"
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); onDragOver(stage.id); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={() => { setIsDragOver(false); onDrop(stage.id); }}
        >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: stage.color, boxShadow: `0 0 8px ${stage.color}` }} />
                    <span className="text-sm font-bold text-white">{stage.label}</span>
                </div>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full"
                    style={{ background: `${stage.color}18`, color: stage.color }}>
                    {leads.length}
                </span>
            </div>

            {/* Drop zone */}
            <div className="flex-1 flex flex-col gap-3 rounded-2xl p-3 min-h-[120px] transition-all duration-200"
                style={{
                    background: isDragOver ? stage.glow : 'rgba(255,255,255,0.02)',
                    border: isDragOver ? `1px solid ${stage.color}44` : '1px solid rgba(255,255,255,0.04)',
                }}>
                {leads.length === 0 && !isDragOver && (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-[11px] text-white/20">Drop leads here</p>
                    </div>
                )}
                {leads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onDragStart={onDragStart} onSelect={onSelect} teamMap={teamMap} />
                ))}
            </div>
        </div>
    );
};

/* ════════════════════════════════════════════════════════════
   LIST VIEW ROW
   ════════════════════════════════════════════════════════════ */
const LeadRow = ({ lead, selected, onToggleSelect, onSelect, teamMap }) => {
    const stage = STAGES.find(s => s.id === lead.status) || STAGES[0];
    const src = SOURCE_ICONS[lead.source] || SOURCE_ICONS.website;
    const SrcIcon = src.icon;
    const assignee = teamMap[lead.assigned_to];

    return (
        <tr
            className="transition-colors cursor-pointer group"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={(e) => { if (e.target.tagName !== 'INPUT') onSelect(lead); }}
        >
            <td className="pl-6 py-4 w-10" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={selected} onChange={() => onToggleSelect(lead.id)}
                    className="w-4 h-4 rounded accent-[#C9A84C] cursor-pointer" />
            </td>
            <td className="py-4 pr-4">
                <div className="flex items-center gap-3">
                    {lead.overdue && <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                    <div>
                        <p className="font-bold text-white text-sm">{lead.customer_name}</p>
                        <p className="text-[11px] text-white/35">{lead.customer_phone}</p>
                    </div>
                </div>
            </td>
            <td className="py-4 pr-4">
                <p className="text-sm text-white/70">{lead.vehicle_interest || '—'}</p>
                {lead.budget_max && (
                    <p className="text-[10px] text-white/30">Up to R{(lead.budget_max / 1000).toFixed(0)}k</p>
                )}
            </td>
            <td className="py-4 pr-4">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: `${stage.color}18`, color: stage.color }}>
                    {stage.label}
                </span>
            </td>
            <td className="py-4 pr-4">
                <div className="flex items-center gap-1 text-[11px]" style={{ color: src.color }}>
                    <SrcIcon size={12} />
                    {src.label}
                </div>
            </td>
            <td className="py-4 pr-4">
                <AIScoreBadge score={lead.ai_score ?? 0} size="sm" showLabel animated />
            </td>
            <td className="py-4 pr-4 text-sm text-white/40">
                {timeAgo(lead.last_contact_at || lead.created_at)}
            </td>
            <td className="py-4 pr-6">
                {assignee ? (
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black"
                            style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
                            {initials(`${assignee.first_name} ${assignee.last_name}`)}
                        </div>
                        <span className="text-xs text-white/40">{assignee.first_name}</span>
                    </div>
                ) : <span className="text-xs text-white/20">Unassigned</span>}
            </td>
        </tr>
    );
};

/* ════════════════════════════════════════════════════════════
   NEW LEAD FORM MODAL
   ════════════════════════════════════════════════════════════ */
const NewLeadModal = ({ onClose, onCreate }) => {
    const [form, setForm] = useState({
        customer_name: '', customer_phone: '', customer_email: '',
        source: 'website', vehicle_interest: '', notes: '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try { await onCreate(form); onClose(); }
        catch { /* error shown elsewhere */ }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full max-w-lg rounded-3xl p-8 anim-fade-up"
                style={{ background: 'linear-gradient(135deg, #111E35 0%, #0A0F1E 100%)', border: '1px solid rgba(201,168,76,0.15)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-outfit font-black text-xl text-white">Add New Lead</h2>
                    <button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all">
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1.5">Name *</label>
                            <input className="luxury-input w-full" required value={form.customer_name}
                                onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Thabo Molefe" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1.5">Phone</label>
                            <input className="luxury-input w-full" value={form.customer_phone}
                                onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} placeholder="+27 82 123 4567" type="tel" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1.5">Email</label>
                        <input className="luxury-input w-full" value={form.customer_email}
                            onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))} placeholder="email@example.co.za" type="email" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1.5">Source *</label>
                            <select className="luxury-input w-full" value={form.source}
                                onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                                {Object.entries(SOURCE_ICONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1.5">Vehicle Interest</label>
                            <input className="luxury-input w-full" value={form.vehicle_interest}
                                onChange={e => setForm(p => ({ ...p, vehicle_interest: e.target.value }))} placeholder="BMW X5 M Sport" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1.5">Notes</label>
                        <textarea className="luxury-input w-full" rows={2} value={form.notes}
                            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any initial notes…" style={{ resize: 'none' }} />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold text-white/40 hover:text-white/60 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 btn-gold py-3 rounded-xl justify-center">
                            {saving ? <RefreshCw className="animate-spin" size={16} /> : <><Plus size={16} /> Add Lead</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ════════════════════════════════════════════════════════════
   BULK ACTION BAR
   ════════════════════════════════════════════════════════════ */
const BulkBar = ({ count, onStage, onAssign, onDelete, onClear }) => (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-6 py-3 rounded-2xl"
        style={{ background: 'rgba(17,30,53,0.95)', border: '1px solid rgba(201,168,76,0.2)', backdropFilter: 'blur(20px)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
        <span className="text-sm font-bold text-white">{count} selected</span>
        <div className="w-px h-5 bg-white/10" />
        <button onClick={onStage} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all">
            <ArrowRight size={13} /> Move Stage
        </button>
        <button onClick={onAssign} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all">
            <UserCheck size={13} /> Assign
        </button>
        <button onClick={onDelete} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-all">
            <Trash2 size={13} /> Delete
        </button>
        <button onClick={onClear} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all">
            <X size={14} />
        </button>
    </div>
);

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function LeadsPage() {
    const [view, setView] = useState('kanban'); // 'kanban' | 'list'
    const [search, setSearch] = useState('');
    const [filterSource, setFilterSource] = useState('');
    const [filterStage, setFilterStage] = useState('');
    const [filterAssigned, setFilterAssigned] = useState('');
    const [showNewModal, setShowNewModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showBulkStageMenu, setShowBulkStageMenu] = useState(false);

    const dragLeadRef = useRef(null);

    const filters = useMemo(() => ({
        search: search || undefined,
        source: filterSource || undefined,
        status: filterStage || undefined,
        assigned_to: filterAssigned || undefined,
    }), [search, filterSource, filterStage, filterAssigned]);

    const { leads, stats, team, loading, error, moveStage, addNote, createLead, assignLead, bulkAction, generateAISummary, refresh } = useLeads(filters);

    const teamMap = useMemo(() => Object.fromEntries(team.map(u => [u.id, u])), [team]);

    /* ── Kanban grouping ── */
    const leadsByStage = useMemo(() => {
        const map = {};
        STAGES.forEach(s => { map[s.id] = []; });
        leads.forEach(l => { if (map[l.status]) map[l.status].push(l); });
        return map;
    }, [leads]);

    /* ── Drag ─ */
    const handleDragStart = useCallback((lead) => { dragLeadRef.current = lead; }, []);
    const handleDragOver = useCallback(() => { }, []);
    const handleDrop = useCallback((stageId) => {
        const lead = dragLeadRef.current;
        if (lead && lead.status !== stageId) {
            moveStage(lead.id, stageId);
        }
        dragLeadRef.current = null;
    }, [moveStage]);

    /* ── Selection ── */
    const toggleSelect = useCallback((id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === leads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(leads.map(l => l.id)));
        }
    }, [leads, selectedIds]);

    /* ── Bulk actions ── */
    const handleBulkStage = async (stageId) => {
        await bulkAction([...selectedIds], 'stage', stageId);
        setSelectedIds(new Set());
        setShowBulkStageMenu(false);
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.size} leads? This cannot be undone.`)) return;
        await bulkAction([...selectedIds], 'delete');
        setSelectedIds(new Set());
    };

    return (
        <div className="flex flex-col min-h-screen" style={{ background: '#0A0F1E' }}>
            {/* ── Sticky Header ── */}
            <header className="px-4 md:px-8 pl-14 md:pl-8 py-4 md:py-5 flex-shrink-0 sticky top-0 z-40"
                style={{ background: 'rgba(10,15,30,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-0.5" style={{ color: 'rgba(201,168,76,0.4)' }}>CRM</p>
                        <h1 className="font-outfit font-black text-2xl text-white flex items-center gap-3">
                            Lead Pipeline
                            {stats.overdue > 0 && (
                                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black animate-pulse"
                                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}>
                                    <AlertTriangle size={11} />
                                    {stats.overdue} overdue
                                </span>
                            )}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Kanban / List toggle */}
                        <div className="flex rounded-xl p-1 gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <button onClick={() => setView('kanban')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={view === 'kanban' ? { background: 'rgba(201,168,76,0.12)', color: '#C9A84C' } : { color: 'rgba(240,237,232,0.35)' }}>
                                <LayoutGrid size={13} /> Kanban
                            </button>
                            <button onClick={() => setView('list')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={view === 'list' ? { background: 'rgba(201,168,76,0.12)', color: '#C9A84C' } : { color: 'rgba(240,237,232,0.35)' }}>
                                <List size={13} /> List
                            </button>
                        </div>

                        <button onClick={refresh} className="p-2.5 rounded-xl text-white/30 hover:text-white hover:bg-white/08 transition-all" title="Refresh">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => setShowNewModal(true)} className="btn-gold flex items-center gap-2">
                            <Plus size={16} /> Add Lead
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mt-4 flex-wrap">
                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                        <input
                            className="luxury-input pl-9 py-2 w-56 text-sm"
                            placeholder="Search leads…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Source filter */}
                    <select className="luxury-input py-2 text-sm pr-8" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                        <option value="">All Sources</option>
                        {Object.entries(SOURCE_ICONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>

                    {/* Stage filter (list view only) */}
                    {view === 'list' && (
                        <select className="luxury-input py-2 text-sm pr-8" value={filterStage} onChange={e => setFilterStage(e.target.value)}>
                            <option value="">All Stages</option>
                            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                    )}

                    {/* Assignee filter */}
                    <select className="luxury-input py-2 text-sm pr-8" value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}>
                        <option value="">All Salespeople</option>
                        {team.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                    </select>

                    {/* Active filter tags */}
                    {(filterSource || filterStage || filterAssigned || search) && (
                        <button onClick={() => { setSearch(''); setFilterSource(''); setFilterStage(''); setFilterAssigned(''); }}
                            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors">
                            <X size={12} /> Clear filters
                        </button>
                    )}

                    <div className="ml-auto text-xs text-white/20 font-medium">{stats.total} total leads</div>
                </div>
            </header>

            {/* ── Error ── */}
            {error && (
                <div className="mx-8 mt-4 p-3 rounded-xl text-sm text-red-400 flex items-center gap-2"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <AlertTriangle size={15} /> {error}
                </div>
            )}

            {/* ── KANBAN VIEW ── */}
            {view === 'kanban' && (
                loading ? (
                    <div className="flex-1 overflow-x-auto px-6 py-6 flex gap-4">
                        {Array(5).fill(0).map((_, i) => (
                            <div key={i} className="flex-shrink-0 w-72 flex flex-col gap-3">
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-5 w-8 rounded-full" />
                                </div>
                                <div className="flex flex-col gap-3 rounded-2xl p-3" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                                    {Array(3).fill(0).map((_, j) => (
                                        <Skeleton key={j} className="h-28 w-full rounded-2xl" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : leads.length === 0 && !search && !filterSource && !filterAssigned ? (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <EmptyState
                            icon={Users} title="No leads yet"
                            description="Share your WhatsApp number or embed the chat widget on your website to start capturing leads instantly."
                            actionLabel="Connect WhatsApp" onAction={() => window.location.href = '/settings/whatsapp'}
                        />
                    </div>
                ) : (
                    <div className="flex-1 overflow-x-auto px-4 md:px-6 py-6 snap-x snap-mandatory">
                        <div className="flex gap-4 min-w-max pb-6">
                            {STAGES.map(stage => (
                                <div className="snap-center md:snap-align-none w-72 md:w-auto" key={stage.id}>
                                    <KanbanColumn
                                        stage={stage}
                                        leads={leadsByStage[stage.id] || []}
                                        onDragStart={handleDragStart}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        onSelect={setSelectedLead}
                                        teamMap={teamMap}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )
            )}

            {/* ── LIST VIEW ── */}
            {view === 'list' && (
                <div className="flex-1 overflow-auto p-6">
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(13,21,38,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th className="pl-6 py-4 w-10">
                                        <input type="checkbox" className="w-4 h-4 rounded accent-[#C9A84C] cursor-pointer"
                                            checked={selectedIds.size === leads.length && leads.length > 0}
                                            onChange={toggleSelectAll} />
                                    </th>
                                    {['Customer', 'Vehicle', 'Stage', 'Source', 'AI Score', 'Last Contact', 'Assigned'].map(h => (
                                        <th key={h} className="py-4 pr-4 text-left text-[10px] font-black uppercase tracking-widest"
                                            style={{ color: 'rgba(240,237,232,0.25)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={8} className="p-0 border-none"><SkeletonTable columns={8} rows={6} /></td></tr>
                                ) : leads.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-16">
                                            <EmptyState icon={Search} title="No leads found" description="Try adjusting your filters or add a new lead manually." />
                                        </td>
                                    </tr>
                                ) : (
                                    leads.map(lead => (
                                        <LeadRow key={lead.id} lead={lead} teamMap={teamMap}
                                            selected={selectedIds.has(lead.id)}
                                            onToggleSelect={toggleSelect}
                                            onSelect={setSelectedLead} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Modals & Panels ── */}
            {showNewModal && <NewLeadModal onClose={() => setShowNewModal(false)} onCreate={createLead} />}

            {/* Lead Detail Side Panel */}
            {selectedLead && (
                <LeadDetailPanel
                    leadId={selectedLead.id}
                    team={team}
                    teamMap={teamMap}
                    onClose={() => setSelectedLead(null)}
                    onStageChange={(id, stage) => { moveStage(id, stage); setSelectedLead(prev => ({ ...prev, status: stage })); }}
                    onAddNote={addNote}
                    onAssign={assignLead}
                    onAISummary={generateAISummary}
                />
            )}

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <>
                    <BulkBar
                        count={selectedIds.size}
                        onStage={() => setShowBulkStageMenu(p => !p)}
                        onAssign={() => { }}
                        onDelete={handleBulkDelete}
                        onClear={() => setSelectedIds(new Set())}
                    />
                    {showBulkStageMenu && (
                        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-2xl p-2"
                            style={{ background: '#111E35', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
                            {STAGES.map(s => (
                                <button key={s.id} onClick={() => handleBulkStage(s.id)}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm hover:bg-white/05 transition-all text-left">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                                    <span className="text-white/80 font-medium">{s.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
