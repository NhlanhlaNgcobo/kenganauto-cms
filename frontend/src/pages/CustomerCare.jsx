import React, { useEffect, useState, useCallback } from 'react';
import { Send, AlertTriangle, CheckCircle2, Clock, X, MessageSquareWarning, History } from 'lucide-react';
import { PageShell, Surface } from '../components/PageShell';
import { api, errMsg } from '../utils/api';

const SEVERITY = {
    high: 'bg-red-500/10 text-red-300 border-red-500/30',
    medium: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
    low: 'bg-white/5 text-white/66 border-white/15',
};
const STATUS = {
    open: 'bg-red-500/10 text-red-300',
    in_progress: 'bg-blue-500/10 text-blue-300',
    resolved: 'bg-green-500/10 text-green-300',
    closed: 'bg-white/5 text-white/58',
};
const label = (s) => String(s || '').replace(/_/g, ' ');
const fmt = (d) => (d ? new Date(d).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const input = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/58 focus:border-[#C9A84C]/60 focus:outline-none';

function Kpi({ title, value, hint, tone = 'text-white' }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/58">{title}</p>
            <p className={`mt-2 font-outfit text-3xl font-black tabular-nums ${tone}`}>{value ?? '—'}</p>
            {hint ? <p className="mt-1 text-xs text-white/58">{hint}</p> : null}
        </div>
    );
}

export default function CustomerCare() {
    const [tab, setTab] = useState('concerns');
    const [summary, setSummary] = useState(null);
    const [surveys, setSurveys] = useState([]);
    const [concerns, setConcerns] = useState([]);
    const [staff, setStaff] = useState([]);
    const [statusFilter, setStatusFilter] = useState('active');
    const [error, setError] = useState('');
    const [modal, setModal] = useState(null); // {type:'survey'|'response'|'concern'|'detail', data}

    const load = useCallback(async () => {
        setError('');
        try {
            const [s, sv, c, st] = await Promise.all([
                api.get('/api/customer-care/summary'),
                api.get('/api/customer-care/surveys'),
                api.get('/api/customer-care/concerns'),
                api.get('/api/customer-care/staff'),
            ]);
            setSummary(s); setSurveys(sv); setConcerns(c); setStaff(st);
        } catch (e) { setError(errMsg(e, 'Could not load customer care data')); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const staffName = (id) => staff.find((s) => s.id === id)?.name || (id ? `User #${id}` : 'Unassigned');
    const visibleConcerns = concerns.filter((c) => statusFilter === 'all' || (statusFilter === 'active' ? ['open', 'in_progress'].includes(c.status) : c.status === statusFilter));
    const npsTone = summary?.nps == null ? 'text-white' : summary.nps >= 50 ? 'text-green-300' : summary.nps >= 0 ? 'text-[#C9A84C]' : 'text-red-300';

    return (
        <PageShell
            title="Customer Care"
            description="CSI surveys go out on WhatsApp after every service. AI reads each reply, and any score of 6 or lower, or any negative comment, automatically opens a concern with an SLA owner."
            actions={<>
                <button onClick={() => setModal({ type: 'survey' })} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-white/5"><Send size={14} /> Send survey</button>
                <button onClick={() => setModal({ type: 'concern' })} className="btn-gold flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest"><MessageSquareWarning size={14} /> Log concern</button>
            </>}
        >
            {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Kpi title="NPS (90d)" value={summary?.nps} tone={npsTone} hint={summary ? `${summary.promoters} promoters · ${summary.detractors} detractors` : ''} />
                <Kpi title="Avg CSI" value={summary?.avg_score != null ? `${summary.avg_score}/10` : null} />
                <Kpi title="Response rate" value={summary?.response_rate != null ? `${summary.response_rate}%` : null} hint={summary ? `${summary.responded} of ${summary.sent} surveys` : ''} />
                <Kpi title="Open concerns" value={summary?.open_concerns} />
                <Kpi title="Past SLA" value={summary?.overdue_concerns} tone={summary?.overdue_concerns ? 'text-red-300' : 'text-white'} />
                <Kpi title="Avg resolution" value={summary?.avg_resolution_hours != null ? `${summary.avg_resolution_hours}h` : null} />
            </div>

            {summary?.detractor_drivers?.length ? (
                <Surface>
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-white/58">What's driving low scores (AI-categorised)</p>
                    <div className="space-y-2">
                        {summary.detractor_drivers.map((d) => {
                            const max = summary.detractor_drivers[0].count || 1;
                            return (
                                <div key={d.category} className="flex items-center gap-3 text-sm">
                                    <span className="w-40 shrink-0 capitalize text-white/70">{label(d.category)}</span>
                                    <div className="h-2 flex-1 rounded-full bg-white/5"><div className="h-2 rounded-full bg-red-400/70" style={{ width: `${(d.count / max) * 100}%` }} /></div>
                                    <span className="w-8 text-right tabular-nums text-white/66">{d.count}</span>
                                </div>
                            );
                        })}
                    </div>
                </Surface>
            ) : null}

            <div className="flex gap-2">
                {['concerns', 'surveys'].map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest ${tab === t ? 'bg-[#C9A84C]/15 text-[#C9A84C]' : 'text-white/58 hover:bg-white/5'}`}>{t}</button>
                ))}
            </div>

            {tab === 'concerns' ? (
                <Surface className="!p-0 overflow-hidden">
                    <div className="flex flex-wrap gap-2 border-b border-white/10 p-4">
                        {['active', 'open', 'in_progress', 'resolved', 'closed', 'all'].map((s) => (
                            <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-lg px-3 py-1 text-[12px] font-semibold capitalize ${statusFilter === s ? 'bg-white/10 text-white' : 'text-white/58 hover:text-white'}`}>{label(s)}</button>
                        ))}
                    </div>
                    {visibleConcerns.length === 0 ? (
                        <p className="p-10 text-center text-sm text-white/58">No concerns here. Low CSI scores will show up automatically.</p>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {visibleConcerns.map((c) => {
                                const overdue = c.due_at && ['open', 'in_progress'].includes(c.status) && new Date(c.due_at) < new Date();
                                return (
                                    <button key={c.id} onClick={() => setModal({ type: 'detail', data: c })} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03]">
                                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${SEVERITY[c.severity]}`}>{c.severity}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-white">{c.subject}</p>
                                            <p className="truncate text-xs text-white/58">{c.customer_name} · {label(c.department)} · {staffName(c.assigned_to)}{c.source === 'csi_auto' ? ' · auto from CSI' : ''}</p>
                                        </div>
                                        <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-300' : 'text-white/58'}`}><Clock size={12} /> {overdue ? 'Overdue ' : 'Due '}{fmt(c.due_at)}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${STATUS[c.status]}`}>{label(c.status)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </Surface>
            ) : (
                <Surface className="!p-0 overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                        <thead><tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-widest text-white/58">
                            <th className="p-4">Customer</th><th className="p-4">Context</th><th className="p-4">Sent</th><th className="p-4">Score</th><th className="p-4">AI read</th><th className="p-4"></th>
                        </tr></thead>
                        <tbody className="divide-y divide-white/5">
                            {surveys.map((s) => (
                                <tr key={s.id}>
                                    <td className="p-4"><p className="font-semibold">{s.customer_name}</p><p className="text-xs text-white/58">{s.customer_phone || 'no phone'}</p></td>
                                    <td className="p-4 capitalize text-white/66">{s.context_type}{s.context_label ? ` · ${s.context_label}` : ''}</td>
                                    <td className="p-4 text-white/58">{fmt(s.sent_at)}</td>
                                    <td className="p-4">{s.score != null ? <span className={`font-outfit text-lg font-black ${s.score >= 9 ? 'text-green-300' : s.score >= 7 ? 'text-[#C9A84C]' : 'text-red-300'}`}>{s.score}</span> : <span className="text-white/58">pending</span>}</td>
                                    <td className="max-w-xs p-4 text-xs text-white/66">{s.ai_category ? <><span className="capitalize text-white/80">{label(s.ai_category)}</span>{s.comment ? ` — "${s.comment}"` : ''}</> : '—'}</td>
                                    <td className="p-4 text-right">{s.status === 'sent' ? <button onClick={() => setModal({ type: 'response', data: s })} className="rounded-lg border border-white/10 px-3 py-1 text-xs hover:bg-white/5">Record reply</button> : null}</td>
                                </tr>
                            ))}
                            {surveys.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-white/58">No surveys yet. They're sent automatically when a service job is marked completed.</td></tr> : null}
                        </tbody>
                    </table>
                </Surface>
            )}

            {modal ? <Modal modal={modal} staff={staff} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} /> : null}
        </PageShell>
    );
}

function Modal({ modal, staff, onClose, onDone }) {
    const [form, setForm] = useState(modal.type === 'detail' ? { status: modal.data.status, assigned_to: modal.data.assigned_to || '', resolution: modal.data.resolution || '', note: '' } : { context_type: 'service', department: 'service', send_whatsapp: true });
    const [events, setEvents] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

    useEffect(() => {
        if (modal.type === 'detail') api.get(`/api/customer-care/concerns/${modal.data.id}/events`).then(setEvents).catch(() => {});
    }, [modal]);

    const submit = async (e) => {
        e.preventDefault(); setBusy(true); setError('');
        try {
            if (modal.type === 'survey') { await api.post('/api/customer-care/surveys', form); onDone(); }
            if (modal.type === 'concern') { await api.post('/api/customer-care/concerns', form); onDone(); }
            if (modal.type === 'response') {
                const r = await api.post(`/api/customer-care/surveys/${modal.data.id}/response`, { score: Number(form.score), comment: form.comment });
                setResult(r);
            }
            if (modal.type === 'detail') { await api.patch(`/api/customer-care/concerns/${modal.data.id}`, { ...form, assigned_to: form.assigned_to ? Number(form.assigned_to) : null }); onDone(); }
        } catch (err) { setError(errMsg(err)); }
        setBusy(false);
    };

    const titles = { survey: 'Send CSI survey', concern: 'Log a customer concern', response: `Record reply — ${modal.data?.customer_name}`, detail: modal.data?.subject };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-white/10 bg-[#0D1526] p-6">
                <div className="flex items-start justify-between gap-4">
                    <h2 className="font-outfit text-xl font-black">{titles[modal.type]}</h2>
                    <button type="button" onClick={onClose} className="rounded-full p-1 text-white/58 hover:bg-white/10" aria-label="Close"><X size={18} /></button>
                </div>

                {(modal.type === 'survey' || modal.type === 'concern') && <>
                    <input required className={input} placeholder="Customer name" onChange={set('customer_name')} />
                    <input className={input} placeholder="Mobile (+27…)" onChange={set('customer_phone')} />
                </>}

                {modal.type === 'survey' && <>
                    <select className={input} value={form.context_type} onChange={set('context_type')}><option value="service">After service</option><option value="sale">After sale / delivery</option></select>
                    <input className={input} placeholder="Context, e.g. Polo Vivo 30k service" onChange={set('context_label')} />
                    <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={form.send_whatsapp} onChange={set('send_whatsapp')} /> Send via WhatsApp now</label>
                </>}

                {modal.type === 'concern' && <>
                    <input required className={input} placeholder="Subject" onChange={set('subject')} />
                    <textarea className={input} rows={3} placeholder="What happened?" onChange={set('description')} />
                    <div className="grid grid-cols-2 gap-3">
                        <select className={input} value={form.department} onChange={set('department')}>{['sales', 'service', 'parts', 'finance', 'general'].map((d) => <option key={d} value={d}>{d}</option>)}</select>
                        <select className={input} defaultValue="" onChange={set('assigned_to')}><option value="">Assign later</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                    </div>
                    <p className="text-xs text-white/58">AI sets severity and category; the SLA is 24h for high, 72h for medium and 7 days for low.</p>
                </>}

                {modal.type === 'response' && (result ? (
                    <div className="space-y-3 text-sm">
                        <p>AI read: <b className="capitalize">{label(result.ai.category)}</b> · sentiment {result.ai.sentiment} · {result.ai.engine}</p>
                        {result.concern ? <p className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-200"><AlertTriangle size={16} /> Concern #{result.concern.id} opened ({result.concern.severity}), due {fmt(result.concern.due_at)}</p>
                            : <p className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-green-200"><CheckCircle2 size={16} /> No follow-up needed.</p>}
                        <button type="button" onClick={onDone} className="btn-gold w-full rounded-xl py-2 text-xs font-bold uppercase tracking-widest">Done</button>
                    </div>
                ) : <>
                    <input required type="number" min="0" max="10" className={input} placeholder="Score 0-10" onChange={set('score')} />
                    <textarea className={input} rows={3} placeholder="Customer's comment (optional)" onChange={set('comment')} />
                </>)}

                {modal.type === 'detail' && <>
                    <div className="rounded-xl bg-white/[0.03] p-3 text-sm text-white/70 whitespace-pre-line">{modal.data.description || 'No description.'}</div>
                    <p className="text-xs text-white/58">{modal.data.customer_name} · {modal.data.customer_phone || 'no phone'} · AI category: <span className="capitalize">{label(modal.data.ai_category)}</span></p>
                    <div className="grid grid-cols-2 gap-3">
                        <select className={input} value={form.status} onChange={set('status')}>{['open', 'in_progress', 'resolved', 'closed'].map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
                        <select className={input} value={form.assigned_to} onChange={set('assigned_to')}><option value="">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                    </div>
                    <textarea className={input} rows={2} placeholder="Resolution (required to resolve or close)" value={form.resolution} onChange={set('resolution')} />
                    <input className={input} placeholder="Add a note to the audit trail" value={form.note} onChange={set('note')} />
                    <div>
                        <p className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-white/58"><History size={12} /> Audit trail</p>
                        <ol className="space-y-1.5 border-l border-white/10 pl-3 text-xs">
                            {events.map((ev) => <li key={ev.id} className="text-white/66"><span className="text-white/58">{fmt(ev.created_at)} · {ev.actor}</span> — <span className="capitalize">{label(ev.action)}</span>{ev.detail ? `: ${ev.detail}` : ''}</li>)}
                        </ol>
                    </div>
                </>}

                {error ? <p className="text-sm text-red-300">{error}</p> : null}
                {!(modal.type === 'response' && result) ? (
                    <button disabled={busy} className="btn-gold w-full rounded-xl py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-50">{busy ? 'Saving…' : modal.type === 'detail' ? 'Save changes' : 'Submit'}</button>
                ) : null}
            </form>
        </div>
    );
}
