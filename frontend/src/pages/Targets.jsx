import React, { useEffect, useState, useCallback } from 'react';
import { Target, Plus, Trash2, X } from 'lucide-react';
import { PageShell, Surface } from '../components/PageShell';
import { useAuth } from '../context/AuthContext';
import { api, errMsg } from '../utils/api';

const STATUS = {
    achieved: { text: 'Achieved', cls: 'bg-green-500/15 text-green-300', bar: 'bg-green-400' },
    on_track: { text: 'On track', cls: 'bg-green-500/10 text-green-300', bar: 'bg-green-400/80' },
    at_risk: { text: 'At risk', cls: 'bg-orange-500/10 text-orange-300', bar: 'bg-orange-400' },
    behind: { text: 'Behind', cls: 'bg-red-500/10 text-red-300', bar: 'bg-red-400' },
    not_started: { text: 'Not started', cls: 'bg-white/5 text-white/58', bar: 'bg-white/30' },
    no_data: { text: 'No data', cls: 'bg-white/5 text-white/58', bar: 'bg-white/30' },
};
const input = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#C9A84C]/60 focus:outline-none';
const currentPeriod = () => new Date().toISOString().slice(0, 7);

export default function Targets() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [period, setPeriod] = useState(currentPeriod());
    const [data, setData] = useState(null);
    const [staff, setStaff] = useState([]);
    const [error, setError] = useState('');
    const [adding, setAdding] = useState(false);

    const load = useCallback(async () => {
        setError('');
        try {
            const [sc, st] = await Promise.all([api.get('/api/targets/scorecard', { period }), api.get('/api/targets/staff')]);
            setData(sc); setStaff(st);
        } catch (e) { setError(errMsg(e, 'Could not load scorecard')); }
    }, [period]);

    useEffect(() => { load(); }, [load]);

    const remove = async (id) => {
        if (!window.confirm('Delete this target?')) return;
        try { await api.del(`/api/targets/${id}`); load(); } catch (e) { setError(errMsg(e)); }
    };

    const groups = (data?.rows || []).reduce((acc, r) => { (acc[r.owner] = acc[r.owner] || []).push(r); return acc; }, {});

    return (
        <PageShell
            title="Targets & Scorecards"
            description="Monthly targets for the dealership and each team member, with live actuals and a run-rate projection. Anything projected below 85% of target is flagged early, so there's time to act."
            actions={<>
                <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className={`${input} !w-auto`} aria-label="Period" />
                {isAdmin ? <button onClick={() => setAdding(true)} className="btn-gold flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest"><Plus size={14} /> Set target</button> : null}
            </>}
        >
            {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

            {data && data.rows.length === 0 ? (
                <Surface>
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                        <Target size={32} className="text-[#C9A84C]" />
                        <p className="font-outfit text-lg font-black">No targets for {period}</p>
                        <p className="max-w-md text-sm text-white/58">{isAdmin ? 'Set dealership-wide or per-person targets for leads, test drives, units sold, service bookings or CSI.' : 'Your manager has not set targets for this month yet.'}</p>
                    </div>
                </Surface>
            ) : null}

            {data?.at_risk ? <p className="text-sm text-orange-300">{data.at_risk} target{data.at_risk === 1 ? '' : 's'} at risk or behind this month.</p> : null}

            {Object.entries(groups).map(([owner, rows]) => (
                <Surface key={owner}>
                    <p className="mb-4 font-outfit text-lg font-black">{owner}</p>
                    <div className="space-y-4">
                        {rows.map((r) => {
                            const st = STATUS[r.status] || STATUS.no_data;
                            const pct = Math.min(r.pct ?? 0, 100);
                            return (
                                <div key={r.id} className="grid grid-cols-1 items-center gap-2 md:grid-cols-[200px_1fr_220px_auto] md:gap-4">
                                    <p className="text-sm text-white/80">{r.label}</p>
                                    <div className="h-2.5 rounded-full bg-white/5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={r.label}>
                                        <div className={`h-2.5 rounded-full ${st.bar}`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="flex items-center justify-between gap-3 text-sm md:justify-end">
                                        <span className="tabular-nums"><b>{r.actual ?? '—'}</b><span className="text-white/58"> / {r.target}</span>{r.metric !== 'csi_score' && r.projected != null ? <span className="ml-2 text-xs text-white/58">proj. {r.projected}</span> : null}</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${st.cls}`}>{st.text}</span>
                                    </div>
                                    {isAdmin ? <button onClick={() => remove(r.id)} className="justify-self-end rounded-lg p-1.5 text-white/58 hover:bg-white/5 hover:text-red-300" aria-label={`Delete ${r.label} target`}><Trash2 size={14} /></button> : <span />}
                                </div>
                            );
                        })}
                    </div>
                </Surface>
            ))}

            {adding ? <AddTarget period={period} staff={staff} metrics={data?.metrics || {}} onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} /> : null}
        </PageShell>
    );
}

function AddTarget({ period, staff, metrics, onClose, onDone }) {
    const [form, setForm] = useState({ user_id: '', metric: 'sales_won', target_value: '' });
    const [error, setError] = useState('');
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault(); setError('');
        try {
            await api.post('/api/targets', { ...form, period, user_id: form.user_id ? Number(form.user_id) : null, target_value: Number(form.target_value) });
            onDone();
        } catch (err) { setError(errMsg(err)); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-[#0D1526] p-6">
                <div className="flex items-start justify-between"><h2 className="font-outfit text-xl font-black">Set target · {period}</h2><button type="button" onClick={onClose} className="rounded-full p-1 text-white/58 hover:bg-white/10" aria-label="Close"><X size={18} /></button></div>
                <select className={input} value={form.user_id} onChange={set('user_id')}><option value="">Whole dealership</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}</select>
                <select className={input} value={form.metric} onChange={set('metric')}>{Object.entries(metrics).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}</select>
                <input required type="number" step="any" min="0" className={input} placeholder={form.metric === 'csi_score' ? 'e.g. 9.0' : 'e.g. 25'} value={form.target_value} onChange={set('target_value')} />
                <p className="text-xs text-white/58">Setting the same metric again for the same person and month updates the existing target.</p>
                {error ? <p className="text-sm text-red-300">{error}</p> : null}
                <button className="btn-gold w-full rounded-xl py-3 text-xs font-bold uppercase tracking-widest">Save target</button>
            </form>
        </div>
    );
}
