import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Minus, Info, ShoppingCart, Wrench } from 'lucide-react';
import { PageShell, Surface } from '../components/PageShell';
import { api, errMsg } from '../utils/api';

const GOLD = '#C9A84C';
const zar = (n) => (n == null ? '—' : `R ${Math.round(n).toLocaleString('en-ZA')}`);
const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleString('en-ZA', { month: 'short' });

function fmtMinutes(m) {
    if (m == null) return '—';
    if (m < 1) return `${Math.max(1, Math.round(m * 60))} sec`;
    if (m < 90) return `${Math.round(m)} min`;
    return `${(m / 60).toFixed(1)} h`;
}

/* Before → after tile. Direction says which way is good; the delta carries an icon + words, never colour alone. */
function Compare({ label, before, after, format, lowerIsBetter = false, hint }) {
    const has = before != null && after != null;
    const better = has && (lowerIsBetter ? after < before : after > before);
    const same = has && Math.abs(after - before) < 0.05;
    const Icon = !has || same ? Minus : (after > before ? ArrowUpRight : ArrowDownRight);
    const tone = !has || same ? 'text-white/66 bg-white/5' : better ? 'text-emerald-300 bg-emerald-500/10' : 'text-red-300 bg-red-500/10';
    let delta = '';
    if (has && !same) {
        if (format === 'pct') delta = `${after > before ? '+' : ''}${(after - before).toFixed(1)} pts`;
        else if (before > 0) delta = `${Math.round((after / before) * 100) < 1 ? '<1' : Math.round((after / before) * 100)}% of before`;
    }
    const show = (v) => (format === 'pct' ? (v == null ? '—' : `${v}%`) : fmtMinutes(v));
    return (
        <div className="rounded-3xl border border-white/10 bg-[#121A2B] p-5">
            <p className="text-sm text-white/66">{label}</p>
            <p className="mt-2 font-outfit text-3xl font-black tabular-nums text-white">{show(after)}</p>
            <p className="mt-1 text-sm text-white/58">was <span className="tabular-nums text-white/80">{show(before)}</span> before AI</p>
            {has ? (
                <p className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
                    <Icon size={13} aria-hidden="true" />
                    {same ? 'No change' : `${better ? 'Better' : 'Worse'}${delta ? ` · ${delta}` : ''}`}
                </p>
            ) : null}
            {hint ? <p className="mt-3 text-xs leading-5 text-white/58">{hint}</p> : null}
        </div>
    );
}

function ChartTip({ active, payload, label, unit, empty }) {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    return (
        <div className="rounded-xl border border-white/10 bg-[#0D1526] px-3 py-2 text-sm shadow-lg">
            <p className="font-semibold text-white">{label}</p>
            <p className="tabular-nums text-white/80">{v == null ? empty : unit(v)}</p>
        </div>
    );
}

/* Single-series monthly bar chart: one hue, rounded data ends, recessive grid, go-live marker. */
function MonthBars({ title, note, data, dataKey, unit, empty = 'Not enough data yet', goLive, domain }) {
    const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
    return (
        <Surface>
            <h2 className="font-outfit text-lg font-black text-white">{title}</h2>
            {note ? <p className="mt-1 text-sm text-white/58">{note}</p> : null}
            <div className="mt-5 h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rows} margin={{ top: 18, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'rgba(240,237,232,0.6)', fontSize: 12 }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgba(240,237,232,0.6)', fontSize: 12 }} domain={domain} tickFormatter={(v) => unit(v, true)} width={56} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTip unit={unit} empty={empty} />} />
                        {goLive ? <ReferenceLine x={goLive} stroke={GOLD} strokeDasharray="4 4" label={{ value: 'AI live', position: 'top', fill: GOLD, fontSize: 11 }} /> : null}
                        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={36}>
                            {rows.map((r) => <Cell key={r.month} fill={GOLD} fillOpacity={r.ai_live === false ? 0.45 : 1} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Surface>
    );
}

export default function AIImpact() {
    const [d, setD] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/api/ai-impact').then(setD).catch((e) => setError(errMsg(e, 'Could not load the AI impact report')));
    }, []);

    const goLiveDate = d?.go_live_at ? new Date(d.go_live_at) : null;
    const goLiveMonth = goLiveDate ? monthLabel(d.go_live_at.slice(0, 7)) : null;

    return (
        <PageShell
            title="AI impact"
            description={goLiveDate
                ? `What changed after AI started answering your leads on ${goLiveDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}, measured from your own lead and deal data.`
                : 'Measured from your own lead and deal data once AI starts answering your leads.'}
        >
            {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
            {!d && !error ? <p className="text-sm text-white/58">Loading report…</p> : null}

            {d ? (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Compare label="Median first response" before={d.before.median_response_min} after={d.after.median_response_min} lowerIsBetter
                            hint={`${d.after.ai_answered_pct ?? 0}% of leads since go-live were answered by AI.`} />
                        <Compare label="Answered within 5 minutes" format="pct" before={d.before.within5_pct} after={d.after.within5_pct}
                            hint={`After-hours leads answered in 5 min: ${d.before.after_hours_within5_pct ?? 0}% → ${d.after.after_hours_within5_pct ?? 0}%.`} />
                        <Compare label="Leads that booked a visit" format="pct" before={d.before.appointment_pct} after={d.after.appointment_pct} />
                        <Compare label="Lead-to-sale conversion" format="pct" before={d.before.conversion_pct} after={d.after.conversion_pct}
                            hint={`${d.before.won} sales from ${d.before.mature_leads} leads before; ${d.after.won} from ${d.after.mature_leads} since.`} />
                    </div>

                    {d.lift.extra_sales != null ? (
                        <Surface className="!p-5">
                            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                                <p className="font-outfit text-2xl font-black text-white">
                                    {d.lift.extra_sales > 0 ? `≈ ${d.lift.extra_sales} extra sales since go-live` : 'No measurable change in sales yet'}
                                </p>
                                {d.lift.extra_gross > 0 ? <p className="text-white/80">worth about <strong className="tabular-nums text-white">{zar(d.lift.extra_gross)}</strong> in gross profit at {zar(d.lift.avg_gross_per_unit)} per unit</p> : null}
                            </div>
                            <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-white/58"><Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {d.method}</p>
                        </Surface>
                    ) : null}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <MonthBars title="Leads answered within 5 minutes" note="Faded bars are before AI went live." data={d.monthly} dataKey="within5_pct" goLive={goLiveMonth}
                            domain={[0, 100]} unit={(v) => `${Math.round(v)}%`} />
                        <MonthBars title="Lead-to-sale conversion" note="By month the lead arrived. Recent months are left out until leads have had time to close."
                            data={d.monthly} dataKey="conversion_pct" goLive={goLiveMonth} unit={(v) => `${Number(v).toFixed(v < 10 ? 1 : 0)}%`} empty="Too early to judge" />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                        <MonthBars title="Gross profit per unit" note="Delivered deals: sale price minus stock cost." data={d.gross_per_unit.map((g) => ({ ...g, ai_live: true }))}
                            dataKey="gross_per_unit" unit={(v, short) => (short ? `R${Math.round(v / 1000)}k` : zar(v))} empty="No deliveries" />

                        <div className="grid gap-4">
                            <Link to="/online-deals" className="group rounded-3xl border border-white/10 bg-[#121A2B] p-5 transition hover:border-[#C9A84C]/30">
                                <p className="flex items-center gap-2 text-sm text-white/66"><ShoppingCart size={15} aria-hidden="true" /> Bought online · 30 days</p>
                                <p className="mt-2 font-outfit text-3xl font-black tabular-nums text-white">{d.digital.online_deals_30d}</p>
                                <p className="mt-1 text-sm text-white/66">{zar(d.digital.reserved_value)} of stock reserved · {d.digital.share_of_website_leads_pct ?? 0}% of website leads · {d.digital.finance_pct ?? 0}% on finance</p>
                            </Link>
                            <Link to="/service" className="group rounded-3xl border border-white/10 bg-[#121A2B] p-5 transition hover:border-[#C9A84C]/30">
                                <p className="flex items-center gap-2 text-sm text-white/66"><Wrench size={15} aria-hidden="true" /> Service inspections · 90 days</p>
                                <p className="mt-2 font-outfit text-3xl font-black tabular-nums text-white">{zar(d.service.approved_value)}</p>
                                <p className="mt-1 text-sm text-white/66">extra work approved by customers · {d.service.approved_items} of {d.service.items} items · {d.service.approval_pct ?? 0}% approval</p>
                            </Link>
                        </div>
                    </div>

                    <details className="rounded-3xl border border-white/10 bg-[#121A2B] p-5 text-sm">
                        <summary className="cursor-pointer font-semibold text-white/80">Show the monthly numbers as a table</summary>
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full min-w-[520px] text-left tabular-nums">
                                <thead className="text-white/58"><tr><th className="py-2 font-medium">Month</th><th className="font-medium">Leads</th><th className="font-medium">Median response</th><th className="font-medium">Within 5 min</th><th className="font-medium">Conversion</th><th className="font-medium">Gross / unit</th></tr></thead>
                                <tbody className="divide-y divide-white/8 text-white/80">
                                    {d.monthly.map((m, i) => (
                                        <tr key={m.month}><td className="py-2">{monthLabel(m.month)} {m.month.slice(0, 4)}{m.ai_live ? '' : ' (before AI)'}</td><td>{m.leads}</td><td>{fmtMinutes(m.median_response_min)}</td><td>{m.within5_pct ?? '—'}%</td><td>{m.conversion_pct == null ? 'too early' : `${m.conversion_pct}%`}</td><td>{zar(d.gross_per_unit[i]?.gross_per_unit)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </details>
                </>
            ) : null}
        </PageShell>
    );
}
