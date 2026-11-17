import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    AlertTriangle,
    Facebook,
    Globe,
    LayoutGrid,
    List,
    MessageCircle,
    Phone,
    Plus,
    RefreshCw,
    Search,
    Star,
    Truck,
    Users,
    X,
} from 'lucide-react';
import { useLeads } from '../hooks/useLeads';
import LeadDetailPanel from '../components/LeadDetailPanel';
import AIScoreBadge from '../components/AIScoreBadge';
import { Skeleton, SkeletonTable } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { PageShell, Surface } from '../components/PageShell';
import CollapsibleSection from '../components/CollapsibleSection';

const STAGES = [
    { id: 'new', label: 'New', color: '#60A5FA', glow: 'rgba(59,127,245,0.15)' },
    { id: 'contacted', label: 'Contacted', color: '#EAB308', glow: 'rgba(234,179,8,0.15)' },
    { id: 'qualified', label: 'Qualified', color: '#F97316', glow: 'rgba(249,115,22,0.15)' },
    { id: 'test_drive_booked', label: 'Test Drive', color: '#C084FC', glow: 'rgba(168,85,247,0.15)' },
    { id: 'negotiation', label: 'Negotiation', color: '#F59E0B', glow: 'rgba(245,158,11,0.15)' },
    { id: 'won', label: 'Won', color: '#22C55E', glow: 'rgba(34,197,94,0.15)' },
    { id: 'lost', label: 'Lost', color: '#F87171', glow: 'rgba(239,68,68,0.15)' },
];

const SOURCE_ICONS = {
    whatsapp: { icon: MessageCircle, color: '#25D366', label: 'WhatsApp' },
    website: { icon: Globe, color: '#60A5FA', label: 'Website' },
    autotrader: { icon: Truck, color: '#F97316', label: 'Autotrader' },
    cars_coza: { icon: Star, color: '#C084FC', label: 'Cars.co.za' },
    facebook: { icon: Facebook, color: '#5B9BF8', label: 'Facebook' },
    walk_in: { icon: Users, color: '#C9A84C', label: 'Walk-In' },
    phone: { icon: Phone, color: '#9CA3AF', label: 'Phone' },
};

function timeAgo(isoStr) {
    if (!isoStr) return null;
    const hours = Math.floor((Date.now() - new Date(isoStr).getTime()) / 3600000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function initials(name = '') {
    return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

function LeadCard({ lead, onDragStart, onSelect, teamMap }) {
    const source = SOURCE_ICONS[lead.source] || SOURCE_ICONS.website;
    const SourceIcon = source.icon;
    const assignee = teamMap[lead.assigned_to];
    const lastContact = lead.last_contact_at || lead.created_at;

    return (
        <button
            type="button"
            draggable
            onDragStart={() => onDragStart(lead)}
            onClick={() => onSelect(lead)}
            className="w-full rounded-2xl border border-white/8 bg-[#0D1526] p-4 text-left transition hover:border-[#C9A84C]/18 hover:bg-[#111B30]"
        >
            {lead.overdue ? (
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300">
                    <AlertTriangle size={12} />
                    Overdue
                </div>
            ) : null}

            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{lead.customer_name}</p>
                    <p className="mt-1 truncate text-sm text-white/58">{lead.vehicle_interest || 'Vehicle to be confirmed'}</p>
                </div>
                <AIScoreBadge score={lead.ai_score ?? 0} size="sm" ring animated className="shrink-0" />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold" style={{ backgroundColor: `${source.color}18`, color: source.color }}>
                        <SourceIcon size={11} />
                        {source.label}
                    </span>
                    <span className="truncate text-xs text-white/58">{timeAgo(lastContact)}</span>
                </div>
                {assignee ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C9A84C]/12 text-[12px] font-black text-[#F7D774]">
                        {initials(`${assignee.first_name} ${assignee.last_name}`)}
                    </span>
                ) : null}
            </div>
        </button>
    );
}

function KanbanColumn({ stage, leads, onDragStart, onDragOver, onDrop, onSelect, teamMap }) {
    const [dragOver, setDragOver] = useState(false);

    return (
        <div
            className="flex w-72 flex-shrink-0 flex-col"
            onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
                onDragOver(stage.id);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={() => {
                setDragOver(false);
                onDrop(stage.id);
            }}
        >
            <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-semibold text-white">{stage.label}</span>
                </div>
                <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: `${stage.color}18`, color: stage.color }}>
                    {leads.length}
                </span>
            </div>

            <div
                className="flex min-h-[180px] flex-1 flex-col gap-3 rounded-2xl p-3 transition"
                style={{
                    background: dragOver ? stage.glow : 'rgba(255,255,255,0.025)',
                    outline: dragOver ? `1px dashed ${stage.color}88` : 'none',
                    outlineOffset: -1,
                }}
            >
                {leads.length === 0 && !dragOver ? (
                    <div className="flex flex-1 items-center justify-center text-sm text-white/58">Drop leads here</div>
                ) : null}
                {leads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} onDragStart={onDragStart} onSelect={onSelect} teamMap={teamMap} />
                ))}
            </div>
        </div>
    );
}

function LeadRow({ lead, onSelect, teamMap }) {
    const stage = STAGES.find((item) => item.id === lead.status) || STAGES[0];
    const source = SOURCE_ICONS[lead.source] || SOURCE_ICONS.website;
    const SourceIcon = source.icon;
    const assignee = teamMap[lead.assigned_to];

    return (
        <tr
            className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.03]"
            onClick={() => onSelect(lead)}
        >
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    {lead.overdue ? <AlertTriangle size={14} className="text-red-300" /> : null}
                    <div>
                        <p className="text-sm font-semibold text-white">{lead.customer_name}</p>
                        <p className="mt-1 text-xs text-white/58">{lead.customer_phone || lead.customer_email || 'No contact details'}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4 text-sm text-white/72">{lead.vehicle_interest || 'Vehicle to be confirmed'}</td>
            <td className="px-4 py-4">
                <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: `${stage.color}18`, color: stage.color }}>
                    {stage.label}
                </span>
            </td>
            <td className="px-4 py-4">
                <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: source.color }}>
                    <SourceIcon size={12} />
                    {source.label}
                </span>
            </td>
            <td className="px-4 py-4">
                <AIScoreBadge score={lead.ai_score ?? 0} size="sm" showLabel animated />
            </td>
            <td className="px-4 py-4 text-sm text-white/58">{timeAgo(lead.last_contact_at || lead.created_at)}</td>
            <td className="px-6 py-4 text-sm text-white/66">
                {assignee ? `${assignee.first_name} ${assignee.last_name}` : 'Unassigned'}
            </td>
        </tr>
    );
}

function NewLeadModal({ onClose, onCreate }) {
    const [form, setForm] = useState({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        source: 'website',
        vehicle_interest: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            await onCreate(form);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-md"
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#111B30] p-8 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="font-outfit text-2xl font-black text-white">Add lead</h2>
                        <p className="mt-2 text-sm leading-6 text-white/58">Keep the form short so users can capture leads quickly.</p>
                    </div>
                    <button onClick={onClose} className="rounded-2xl p-2 text-white/58 transition hover:bg-white/8 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-white/70">Customer name</span>
                            <input
                                required
                                className="luxury-input w-full"
                                value={form.customer_name}
                                onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))}
                                placeholder="Thabo Molefe"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-white/70">Phone</span>
                            <input
                                className="luxury-input w-full"
                                value={form.customer_phone}
                                onChange={(event) => setForm((current) => ({ ...current, customer_phone: event.target.value }))}
                                placeholder="+27 82 123 4567"
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-white/70">Email</span>
                            <input
                                type="email"
                                className="luxury-input w-full"
                                value={form.customer_email}
                                onChange={(event) => setForm((current) => ({ ...current, customer_email: event.target.value }))}
                                placeholder="customer@example.co.za"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-white/70">Source</span>
                            <select
                                className="luxury-input w-full"
                                value={form.source}
                                onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
                            >
                                {Object.entries(SOURCE_ICONS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
                            </select>
                        </label>
                    </div>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-white/70">Vehicle interest</span>
                        <input
                            className="luxury-input w-full"
                            value={form.vehicle_interest}
                            onChange={(event) => setForm((current) => ({ ...current, vehicle_interest: event.target.value }))}
                            placeholder="BMW X5 M Sport"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-white/70">Notes</span>
                        <textarea
                            rows={4}
                            className="luxury-input w-full resize-none"
                            value={form.notes}
                            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                            placeholder="Key context for the sales team"
                        />
                    </label>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:text-white">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="btn-gold">
                            {saving ? 'Saving...' : 'Create lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function LeadsPage() {
    const [view, setView] = useState('kanban');
    const [search, setSearch] = useState('');
    const [filterSource, setFilterSource] = useState('');
    const [filterStage, setFilterStage] = useState('');
    const [filterAssigned, setFilterAssigned] = useState('');
    const [showNewModal, setShowNewModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const dragLeadRef = useRef(null);

    const filters = useMemo(() => ({
        search: search || undefined,
        source: filterSource || undefined,
        status: filterStage || undefined,
        assigned_to: filterAssigned || undefined,
    }), [search, filterAssigned, filterSource, filterStage]);

    const {
        leads,
        stats,
        team,
        loading,
        error,
        moveStage,
        addNote,
        createLead,
        assignLead,
        generateAISummary,
        refresh,
    } = useLeads(filters);

    const teamMap = useMemo(() => Object.fromEntries(team.map((user) => [user.id, user])), [team]);
    const activeFilterCount = [search, filterSource, view === 'list' ? filterStage : '', filterAssigned].filter(Boolean).length;

    const leadsByStage = useMemo(() => {
        const grouped = {};
        STAGES.forEach((stage) => {
            grouped[stage.id] = [];
        });
        leads.forEach((lead) => {
            if (grouped[lead.status]) {
                grouped[lead.status].push(lead);
            }
        });
        return grouped;
    }, [leads]);

    const clearFilters = useCallback(() => {
        setSearch('');
        setFilterSource('');
        setFilterStage('');
        setFilterAssigned('');
    }, []);

    const handleDragStart = useCallback((lead) => {
        dragLeadRef.current = lead;
    }, []);

    const handleDrop = useCallback((stageId) => {
        const lead = dragLeadRef.current;
        if (lead && lead.status !== stageId) {
            moveStage(lead.id, stageId);
        }
        dragLeadRef.current = null;
    }, [moveStage]);

    const summaryCards = [
        { label: 'Total leads', value: stats.total ?? leads.length, helper: 'Current workspace total' },
        { label: 'Overdue follow-ups', value: stats.overdue ?? 0, helper: 'Needs attention first' },
        { label: 'Open pipeline', value: (leadsByStage.new?.length || 0) + (leadsByStage.contacted?.length || 0) + (leadsByStage.qualified?.length || 0) + (leadsByStage.test_drive_booked?.length || 0) + (leadsByStage.negotiation?.length || 0), helper: 'Active deals in motion' },
        { label: 'Won deals', value: leadsByStage.won?.length || 0, helper: 'Closed successfully' },
    ];

    return (
        <PageShell
            title="Lead pipeline"
            description="The layout keeps the pipeline centered, the main actions visible, and the extra filters tucked away until they are needed."
            actions={(
                <>
                    <div className="flex rounded-2xl border border-white/10 bg-[#0D1526] p-1">
                        <button
                            onClick={() => setView('kanban')}
                            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${view === 'kanban' ? 'bg-[#C9A84C]/14 text-[#F7D774]' : 'text-white/66 hover:text-white'}`}
                        >
                            <LayoutGrid size={15} />
                            Kanban
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${view === 'list' ? 'bg-[#C9A84C]/14 text-[#F7D774]' : 'text-white/66 hover:text-white'}`}
                        >
                            <List size={15} />
                            List
                        </button>
                    </div>
                    <button onClick={refresh} className="rounded-2xl border border-white/10 bg-[#0D1526] p-3 text-white/66 transition hover:text-white" title="Refresh">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setShowNewModal(true)} className="btn-gold flex items-center gap-2">
                        <Plus size={16} />
                        Add lead
                    </button>
                </>
            )}
            maxWidth="max-w-[1600px]"
        >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                    <Surface key={card.label} className="rounded-2xl p-5">
                        <p className="text-sm text-white/66">{card.label}</p>
                        <p className="mt-2 font-outfit text-3xl font-black text-white">{card.value}</p>
                        <p className="mt-2 text-sm text-white/58">{card.helper}</p>
                    </Surface>
                ))}
            </div>

            <Surface className="overflow-hidden rounded-3xl p-0">
                <div className="border-b border-white/8 px-6 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="max-w-2xl">
                            <h2 className="font-outfit text-2xl font-black text-white">Pipeline view</h2>
                            <p className="mt-2 text-sm leading-6 text-white/66">
                                Search stays in the open because it is used most. Source, stage, and salesperson filters are collapsed by default.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {stats.overdue > 0 ? (
                                <span className="inline-flex items-center gap-2 rounded-full bg-red-500/12 px-3 py-1.5 text-sm font-semibold text-red-300">
                                    <AlertTriangle size={14} />
                                    {stats.overdue} overdue
                                </span>
                            ) : null}
                            <span className="text-sm text-white/58">{stats.total ?? leads.length} leads</span>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[260px] max-w-md flex-1">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/58" />
                            <input
                                className="luxury-input w-full py-2.5 pl-10 pr-10 text-sm"
                                placeholder="Search by customer, phone, or vehicle"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                            {search ? (
                                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/58 hover:text-white/66">
                                    <X size={13} />
                                </button>
                            ) : null}
                        </div>

                        {activeFilterCount > 0 ? (
                            <button onClick={clearFilters} className="rounded-2xl border border-white/10 bg-[#0D1526] px-4 py-2.5 text-sm font-semibold text-white/72 transition hover:text-white">
                                Clear filters
                            </button>
                        ) : null}
                    </div>
                </div>

                <CollapsibleSection
                    title="Filters"
                    subtitle={activeFilterCount > 0 ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}` : 'Open this only when you need source, stage, or salesperson filtering.'}
                    defaultOpen={activeFilterCount > 0}
                    action={<span className="text-xs font-medium text-white/58">{view === 'list' ? 'List filters' : 'Kanban filters'}</span>}
                >
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <select className="luxury-input py-2.5 text-sm" value={filterSource} onChange={(event) => setFilterSource(event.target.value)}>
                            <option value="">All sources</option>
                            {Object.entries(SOURCE_ICONS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
                        </select>

                        <select className="luxury-input py-2.5 text-sm" value={filterAssigned} onChange={(event) => setFilterAssigned(event.target.value)}>
                            <option value="">All salespeople</option>
                            {team.map((user) => <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>)}
                        </select>

                        {view === 'list' ? (
                            <select className="luxury-input py-2.5 text-sm" value={filterStage} onChange={(event) => setFilterStage(event.target.value)}>
                                <option value="">All stages</option>
                                {STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                            </select>
                        ) : (
                            <div className="rounded-2xl border border-white/8 bg-[#0D1526] px-4 py-2.5 text-sm text-white/58">
                                Stage filtering appears in list view.
                            </div>
                        )}
                    </div>
                </CollapsibleSection>

                {error ? (
                    <div className="border-t border-white/8 px-6 py-4">
                        <div className="rounded-2xl border border-red-500/18 bg-red-500/8 px-4 py-3 text-sm text-red-300">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={15} />
                                {error}
                            </div>
                        </div>
                    </div>
                ) : null}

                {view === 'kanban' ? (
                    loading ? (
                        <div className="flex gap-4 overflow-x-auto px-6 py-6">
                            {Array(5).fill(0).map((_, index) => (
                                <div key={index} className="flex w-72 flex-shrink-0 flex-col gap-3">
                                    <div className="flex items-center justify-between px-1">
                                        <Skeleton className="h-5 w-24" />
                                        <Skeleton className="h-5 w-8 rounded-full" />
                                    </div>
                                    <div className="rounded-2xl bg-white/[0.025] p-3">
                                        <Skeleton className="h-28 w-full rounded-2xl" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : leads.length === 0 && !search && !filterSource && !filterAssigned ? (
                        <div className="flex items-center justify-center p-10">
                            <EmptyState
                                icon={Users}
                                title="No leads yet"
                                description="Connect WhatsApp or your web widget to start capturing leads."
                                actionLabel="Connect WhatsApp"
                                onAction={() => {
                                    window.location.href = '/settings/whatsapp';
                                }}
                            />
                        </div>
                    ) : (
                        <div className="overflow-x-auto px-4 py-6 md:px-6">
                            <div className="flex min-w-max gap-4 pb-6">
                                {STAGES.map((stage) => (
                                    <KanbanColumn
                                        key={stage.id}
                                        stage={stage}
                                        leads={leadsByStage[stage.id] || []}
                                        onDragStart={handleDragStart}
                                        onDragOver={() => {}}
                                        onDrop={handleDrop}
                                        onSelect={setSelectedLead}
                                        teamMap={teamMap}
                                    />
                                ))}
                            </div>
                        </div>
                    )
                ) : (
                    <div className="overflow-auto p-6">
                        <div className="overflow-hidden rounded-[20px] border border-white/6 bg-[rgba(13,21,38,0.7)]">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/6">
                                        {['Customer', 'Vehicle', 'Stage', 'Source', 'AI score', 'Last contact', 'Assigned'].map((heading) => (
                                            <th key={heading} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
                                                {heading}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="p-0">
                                                <SkeletonTable columns={7} rows={6} />
                                            </td>
                                        </tr>
                                    ) : leads.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-16">
                                                <EmptyState icon={Search} title="No leads found" description="Try a different filter or add a lead manually." />
                                            </td>
                                        </tr>
                                    ) : (
                                        leads.map((lead) => (
                                            <LeadRow key={lead.id} lead={lead} onSelect={setSelectedLead} teamMap={teamMap} />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Surface>

            {showNewModal ? <NewLeadModal onClose={() => setShowNewModal(false)} onCreate={createLead} /> : null}

            {selectedLead ? (
                <LeadDetailPanel
                    leadId={selectedLead.id}
                    team={team}
                    teamMap={teamMap}
                    onClose={() => setSelectedLead(null)}
                    onStageChange={(id, stage) => {
                        moveStage(id, stage);
                        setSelectedLead((current) => ({ ...current, status: stage }));
                    }}
                    onAddNote={addNote}
                    onAssign={assignLead}
                    onAISummary={generateAISummary}
                />
            ) : null}
        </PageShell>
    );
}
