import React, { useCallback, useEffect, useState } from 'react';
import { ShoppingCart, Truck, Store, Clock, Landmark, Banknote, Repeat, Phone } from 'lucide-react';
import { PageShell, Surface } from '../components/PageShell';
import { api, errMsg } from '../utils/api';

const zar = (n) => (n == null ? '—' : `R ${Math.round(n).toLocaleString('en-ZA')}`);
const STEPS = [
    { key: 'reserved', label: 'Reserved' },
    { key: 'docs_pending', label: 'Paperwork' },
    { key: 'approved', label: 'Approved' },
    { key: 'completed', label: 'Handed over' },
];
const NEXT = { reserved: 'docs_pending', docs_pending: 'approved', approved: 'completed' };
const NEXT_LABEL = { reserved: 'Paperwork received', docs_pending: 'Mark approved', approved: 'Mark handed over' };

function holdLeft(iso) {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'Hold expired';
    const h = Math.floor(ms / 3600000);
    return h >= 1 ? `${h} h left on hold` : `${Math.max(1, Math.round(ms / 60000))} min left on hold`;
}

function Progress({ status }) {
    if (status === 'cancelled') return <p className="text-sm font-semibold text-red-300">Cancelled, car released to stock</p>;
    const at = STEPS.findIndex((s) => s.key === status);
    return (
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" aria-label="Deal progress">
            {STEPS.map((s, i) => (
                <li key={s.key} className={`flex items-center gap-2 ${i <= at ? 'font-semibold text-white' : 'text-white/50'}`} aria-current={i === at ? 'step' : undefined}>
                    <span className={`h-2 w-2 rounded-full ${i <= at ? 'bg-[#C9A84C]' : 'bg-white/15'}`} aria-hidden="true" />
                    {s.label}
                    {i < STEPS.length - 1 ? <span className="text-white/25" aria-hidden="true">/</span> : null}
                </li>
            ))}
        </ol>
    );
}

export default function OnlineDeals() {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(null);

    const load = useCallback(() => api.get('/api/online-deals').then(setRows).catch((e) => setError(errMsg(e, 'Could not load online deals'))), []);
    useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

    const move = async (o, status) => {
        if (status === 'cancelled' && !window.confirm(`Cancel ${o.reference} and release the ${o.year} ${o.make} ${o.model} back into stock?`)) return;
        setBusy(o.id);
        try { await api.patch(`/api/online-deals/${o.id}`, { status }); await load(); } catch (e) { setError(errMsg(e)); } finally { setBusy(null); }
    };

    const open = (rows || []).filter((o) => !['completed', 'cancelled'].includes(o.status));
    const value = open.reduce((a, o) => a + Number(o.vehicle_price || 0), 0);

    return (
        <PageShell
            title="Online deals"
            description="Customers who chose a car, structured their deal and reserved it on your website. Each car is held for 48 hours, so call them while they are keen."
        >
            {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

            {rows ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <div className="rounded-3xl border border-white/10 bg-[#121A2B] p-5"><p className="text-sm text-white/66">Open online deals</p><p className="mt-1 font-outfit text-3xl font-black tabular-nums text-white">{open.length}</p></div>
                    <div className="rounded-3xl border border-white/10 bg-[#121A2B] p-5"><p className="text-sm text-white/66">Stock value reserved</p><p className="mt-1 font-outfit text-3xl font-black tabular-nums text-white">{zar(value)}</p></div>
                    <div className="col-span-2 rounded-3xl border border-white/10 bg-[#121A2B] p-5 md:col-span-1"><p className="text-sm text-white/66">Handed over</p><p className="mt-1 font-outfit text-3xl font-black tabular-nums text-white">{rows.filter((o) => o.status === 'completed').length}</p></div>
                </div>
            ) : <p className="text-sm text-white/58">Loading…</p>}

            {rows && rows.length === 0 ? (
                <Surface>
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                        <ShoppingCart size={30} className="text-[#C9A84C]" aria-hidden="true" />
                        <p className="font-outfit text-lg font-black">No online deals yet</p>
                        <p className="max-w-md text-sm text-white/58">When a customer reserves a car on your website, the full deal appears here with finance, trade-in and collection details.</p>
                    </div>
                </Surface>
            ) : null}

            <div className="space-y-4">
                {(rows || []).map((o) => (
                    <Surface key={o.id} className="!p-5">
                        <div className="grid gap-5 md:grid-cols-[112px_minmax(0,1fr)_auto]">
                            {o.image ? <img src={o.image} alt="" className="h-24 w-28 rounded-2xl object-cover" loading="lazy" /> : <div className="h-24 w-28 rounded-2xl bg-white/5" />}
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                    <h2 className="font-outfit text-xl font-black text-white">{o.year} {o.make} {o.model}</h2>
                                    <span className="text-sm tabular-nums text-white/58">{o.reference} · {o.stock_number}</span>
                                </div>
                                <p className="mt-1 text-sm text-white/80">
                                    <strong className="text-white">{o.customer_name}</strong>
                                    {o.customer_phone ? <> · <a className="inline-flex items-center gap-1 underline-offset-2 hover:underline" href={`tel:${o.customer_phone}`}><Phone size={12} aria-hidden="true" />{o.customer_phone}</a></> : null}
                                    {' · '}reserved {new Date(o.created_at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
                                    <li className="flex items-center gap-1.5">{o.payment_method === 'finance' ? <Landmark size={14} aria-hidden="true" /> : <Banknote size={14} aria-hidden="true" />}
                                        {o.payment_method === 'finance' ? `Finance · ${zar(o.est_monthly)} pm over ${o.term_months} months · ${zar(o.deposit)} deposit` : `Cash · ${zar(o.vehicle_price)}`}</li>
                                    {o.trade_in_estimate ? <li className="flex items-center gap-1.5"><Repeat size={14} aria-hidden="true" /> Trade-in ≈ {zar(o.trade_in_estimate)}</li> : null}
                                    <li className="flex items-center gap-1.5">{o.fulfilment === 'delivery' ? <Truck size={14} aria-hidden="true" /> : <Store size={14} aria-hidden="true" />}
                                        {o.fulfilment === 'delivery' ? `Deliver ${o.fulfilment_date} · ${o.delivery_address}` : `Collect ${o.fulfilment_date}`}</li>
                                    {o.status === 'reserved' ? <li className="flex items-center gap-1.5 text-orange-300"><Clock size={14} aria-hidden="true" /> {holdLeft(o.hold_expires_at)}</li> : null}
                                </ul>
                                <div className="mt-4"><Progress status={o.status} /></div>
                            </div>
                            <div className="flex flex-row flex-wrap items-start gap-2 md:flex-col md:items-end">
                                {NEXT[o.status] ? (
                                    <button type="button" disabled={busy === o.id} onClick={() => move(o, NEXT[o.status])} className="btn-gold rounded-xl px-4 py-2 text-xs">
                                        {NEXT_LABEL[o.status]}
                                    </button>
                                ) : null}
                                {!['completed', 'cancelled'].includes(o.status) ? (
                                    <button type="button" disabled={busy === o.id} onClick={() => move(o, 'cancelled')} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/66 transition hover:border-red-400/40 hover:text-red-300">
                                        Cancel and release car
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </Surface>
                ))}
            </div>
        </PageShell>
    );
}
