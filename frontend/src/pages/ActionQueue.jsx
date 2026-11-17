import React from 'react';
import axios from 'axios';
import {
    AlarmClock, Flame, Clock, Sparkles, Phone, MessageCircle, Check, X,
    Copy, RefreshCw, ArrowUpRight, AlertTriangle, Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageShell, Surface } from '../components/PageShell';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { Reveal, Stagger, StaggerItem, Magnetic } from '../components/motion';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('ka_token') || localStorage.getItem('token')}` });

const BUCKETS = {
    sla_breaches: { key: 'sla_breaches', label: 'Speed-to-lead', icon: AlarmClock, tone: '#F87171', blurb: "New enquiries past the 5-minute window. Answer these first — it's the biggest conversion lever." },
    due_today: { key: 'due_today', label: 'Due today', icon: Clock, tone: '#C9A84C', blurb: 'Cadence follow-ups (day 2 / 5 / 10) that are due. Keep deals warm and moving.' },
    dormant: { key: 'dormant', label: 'Reactivate', icon: Flame, tone: '#A78BFA', blurb: 'Gone quiet for 3+ weeks. A good re-engagement message can revive up to a quarter of these.' },
};

const initials = (n) => (n || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

function Timeago({ lead }) {
    if (lead.minutes_waiting != null) return <span>Waiting {lead.minutes_waiting < 60 ? `${lead.minutes_waiting} min` : `${Math.round(lead.minutes_waiting / 60)}h`}</span>;
    if (lead.days_since != null) return <span>{lead.days_since} days quiet</span>;
    if (lead.hours_since != null) return <span>{lead.hours_since}h since contact</span>;
    return null;
}

export default function ActionQueue() {
    const navigate = useNavigate();
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [tab, setTab] = React.useState('sla_breaches');
    const [draft, setDraft] = React.useState(null); // { lead, text, channel, loading }
    const [busy, setBusy] = React.useState({});

    const load = React.useCallback(async () => {
        try {
            setError(null);
            const res = await axios.get(`${API_BASE}/api/followups/queue`, { headers: authHeaders() });
            setData(res.data);
            // auto-focus the first non-empty bucket
            const order = ['sla_breaches', 'due_today', 'dormant'];
            const firstFull = order.find(k => res.data[k]?.length);
            if (firstFull) setTab(prev => (res.data[prev]?.length ? prev : firstFull));
        } catch (err) {
            setError(err.response?.data?.error || 'Could not load the action queue.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        load();
        const id = setInterval(load, 45_000);
        return () => clearInterval(id);
    }, [load]);

    const intentFor = (bucket) => bucket === 'sla_breaches' ? 'first_response' : bucket === 'dormant' ? 'reactivate' : 'follow_up';

    const openDraft = async (lead) => {
        setDraft({ lead, text: '', channel: lead.channel, loading: true });
        try {
            const res = await axios.post(`${API_BASE}/api/followups/${lead.id}/draft`, { intent: intentFor(tab) }, { headers: authHeaders() });
            setDraft({ lead, text: res.data.draft, channel: res.data.channel, loading: false, degraded: res.data.degraded });
        } catch {
            setDraft({ lead, text: 'Could not generate a draft. Please try again.', channel: lead.channel, loading: false });
        }
    };

    const markContacted = async (lead) => {
        setBusy(b => ({ ...b, [lead.id]: true }));
        try {
            await axios.post(`${API_BASE}/api/followups/${lead.id}/complete`, { note: 'Follow-up logged from Action Queue' }, { headers: authHeaders() });
            await load();
        } catch { /* noop */ } finally {
            setBusy(b => ({ ...b, [lead.id]: false }));
        }
    };

    const sendDraft = async () => {
        if (!draft) return;
        await markContacted(draft.lead);
        setDraft(null);
    };

    const counts = data?.counts || { sla: 0, due_today: 0, dormant: 0, total: 0 };
    const rows = data?.[tab] || [];
    const active = BUCKETS[tab];

    const summary = [
        { key: 'sla_breaches', label: 'Speed-to-lead breaches', value: counts.sla, icon: AlarmClock, tone: '#F87171', sub: 'New & unanswered >5 min' },
        { key: 'due_today', label: 'Follow-ups due today', value: counts.due_today, icon: Clock, tone: '#C9A84C', sub: 'Cadence touches due' },
        { key: 'dormant', label: 'Dormant to reactivate', value: counts.dormant, icon: Flame, tone: '#A78BFA', sub: 'No contact 21+ days' },
    ];

    return (
        <PageShell
            title="Action queue"
            description="Your daily list of who to contact next — ranked by urgency. Fast, consistent follow-up is where deals are won or lost."
            actions={(
                <Magnetic strength={0.35}>
                    <button onClick={() => { setLoading(true); load(); }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/10 px-4 py-2 text-sm font-semibold text-[#F7D774] transition hover:bg-[#C9A84C]/16">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </Magnetic>
            )}
            maxWidth="max-w-[1200px]"
        >
            {loading && !data ? (
                <>
                    <div className="grid gap-4 md:grid-cols-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
                    <Skeleton className="h-96 rounded-3xl" />
                </>
            ) : error ? (
                <Surface className="rounded-3xl">
                    <EmptyState icon={AlertTriangle} title="Couldn't load the queue" description={error} actionLabel="Try again" onAction={() => { setLoading(true); load(); }} />
                </Surface>
            ) : data ? (
                <>
                    {/* Summary tiles double as tabs */}
                    <Stagger className="grid gap-4 md:grid-cols-3" stagger={0.08}>
                        {summary.map((s) => {
                            const Icon = s.icon;
                            const activeTab = tab === s.key;
                            return (
                                <StaggerItem key={s.key}>
                                    <button onClick={() => setTab(s.key)}
                                        className={`w-full rounded-2xl border p-5 text-left transition ${activeTab ? 'border-[#C9A84C]/40 bg-[#C9A84C]/[0.06]' : 'border-white/10 bg-[#121A2B] hover:border-white/20'}`}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                                                style={{ backgroundColor: `${s.tone}14`, borderColor: `${s.tone}35` }}>
                                                <Icon size={18} style={{ color: s.tone }} />
                                            </div>
                                            {s.value > 0 && <span className="rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide" style={{ background: `${s.tone}1f`, color: s.tone }}>Action</span>}
                                        </div>
                                        <p className="mt-4 font-outfit text-3xl font-black text-white">{s.value}</p>
                                        <p className="mt-1 text-sm font-semibold text-white/80">{s.label}</p>
                                        <p className="mt-0.5 text-xs text-white/58">{s.sub}</p>
                                    </button>
                                </StaggerItem>
                            );
                        })}
                    </Stagger>

                    <Reveal as="section" y={24}>
                        <Surface className="rounded-3xl">
                            <div className="flex flex-wrap items-center gap-3">
                                <active.icon size={20} style={{ color: active.tone }} />
                                <h2 className="font-outfit text-xl font-black text-white">{active.label}</h2>
                                <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-xs font-bold text-white/70">{rows.length}</span>
                            </div>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/66">{active.blurb}</p>

                            {rows.length === 0 ? (
                                <div className="mt-4"><EmptyState icon={Check} title="Nothing here — nice work" description="This bucket is clear. Keep responses fast and the pipeline stays healthy." /></div>
                            ) : (
                                <div className="mt-6 divide-y divide-white/8">
                                    {rows.map((lead) => (
                                        <div key={lead.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                                            <div className="flex min-w-0 items-center gap-4">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#C9A84C]/18 bg-[#C9A84C]/10 font-outfit text-sm font-black text-[#F7D774]">
                                                    {initials(lead.name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="truncate text-sm font-semibold text-white">{lead.name}</p>
                                                        <span className="rounded-full bg-white/6 px-2 py-0.5 text-[12px] font-bold text-white/66">★ {lead.ai_score}</span>
                                                        {lead.severity === 'high' && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold uppercase text-red-300">Urgent</span>}
                                                    </div>
                                                    <p className="mt-0.5 truncate text-sm text-white/58">{lead.vehicle}</p>
                                                    <p className="mt-0.5 text-xs text-white/58">
                                                        <Timeago lead={lead} /> · {lead.step} · {lead.assigned_name}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2">
                                                <span className="hidden items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/66 sm:inline-flex">
                                                    {lead.channel === 'Call' ? <Phone size={12} /> : <MessageCircle size={12} />} {lead.channel}
                                                </span>
                                                <button onClick={() => openDraft(lead)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#C9A84C]/25 bg-[#C9A84C]/10 px-3 py-2 text-xs font-bold text-[#F7D774] transition hover:bg-[#C9A84C]/16">
                                                    <Sparkles size={13} /> Draft reply
                                                </button>
                                                <button onClick={() => markContacted(lead)} disabled={busy[lead.id]}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/75 transition hover:bg-white/10 disabled:opacity-50">
                                                    <Check size={13} /> Done
                                                </button>
                                                <button onClick={() => navigate('/leads')} title="Open in pipeline"
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/66 transition hover:bg-white/10">
                                                    <ArrowUpRight size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Surface>
                    </Reveal>
                </>
            ) : null}

            {/* AI Draft modal */}
            {draft && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setDraft(null)}>
                    <div className="w-full max-w-lg rounded-3xl border border-white/12 bg-[#121A2B] p-6 shadow-2xl anim-fade-up" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-[#C9A84C]" />
                                <h3 className="font-outfit text-lg font-black text-white">AI-drafted {draft.channel} message</h3>
                            </div>
                            <button onClick={() => setDraft(null)} className="rounded-lg p-1 text-white/58 hover:bg-white/10 hover:text-white"><X size={18} /></button>
                        </div>
                        <p className="mt-1 text-xs text-white/58">To {draft.lead.name} · about the {draft.lead.vehicle}</p>

                        {draft.loading ? (
                            <div className="mt-4 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-3/4" /></div>
                        ) : (
                            <>
                                <textarea
                                    value={draft.text}
                                    onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                                    rows={6}
                                    className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-[#0D1526] p-4 text-sm leading-6 text-white/85 outline-none focus:border-[#C9A84C]/40"
                                />
                                {draft.degraded && <p className="mt-2 text-xs text-amber-300/80">Generated from a template — add your Anthropic API key in Super Admin → API settings for fully AI-written replies.</p>}
                                <div className="mt-4 flex flex-wrap justify-end gap-2">
                                    <button onClick={() => navigator.clipboard?.writeText(draft.text)}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/80 hover:bg-white/10">
                                        <Copy size={14} /> Copy
                                    </button>
                                    <button onClick={sendDraft}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#C9A84C] px-4 py-2 text-xs font-black text-[#0A0F1E] hover:opacity-90">
                                        <Check size={14} /> Mark sent
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </PageShell>
    );
}
