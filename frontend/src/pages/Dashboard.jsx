import React from 'react';
import axios from 'axios';
import { AlertTriangle, ArrowUpRight, Car, Clock, DollarSign, Flame, RefreshCw, Target, TrendingDown, TrendingUp, Users, Zap } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageShell, Surface } from '../components/PageShell';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { Reveal, Stagger, StaggerItem, CountUp, Magnetic, TiltCard } from '../components/motion';
import WebsiteActivity from '../components/WebsiteActivity';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function authHeaders() {
    const token = localStorage.getItem('ka_token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
}

const CARD_ICONS = {
    active_leads: Users,
    vehicles_sold: Car,
    monthly_revenue: DollarSign,
    ai_resolution: Zap,
};
const CARD_TONES = {
    active_leads: '#C9A84C',
    vehicles_sold: '#3B7FF5',
    monthly_revenue: '#4ADE80',
    ai_resolution: '#F472B6',
};
const donutColors = ['#C9A84C', '#3B7FF5', '#4ADE80', '#F472B6', '#F59E0B'];

const STATUS_LABELS = {
    new: 'New', contacted: 'Contacted', qualified: 'Qualified',
    test_drive_booked: 'Test drive', negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
};
const statusStyles = {
    new: 'bg-blue-500/12 text-blue-300',
    contacted: 'bg-indigo-500/12 text-indigo-300',
    qualified: 'bg-amber-500/12 text-amber-300',
    test_drive_booked: 'bg-violet-500/12 text-violet-300',
    negotiation: 'bg-orange-500/12 text-orange-300',
};

/* ── Formatting ── */
function formatZar(n) {
    const v = Number(n || 0);
    if (v >= 1_000_000) return `R ${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `R ${Math.round(v / 1_000)}k`;
    return `R ${v.toLocaleString('en-ZA')}`;
}
function formatMinutes(m) {
    if (m == null) return '—';
    if (m < 60) return `${Math.round(m)} min`;
    const h = Math.floor(m / 60);
    const mm = Math.round(m % 60);
    return mm ? `${h}h ${mm}m` : `${h}h`;
}

const SOURCE_COLORS = ['#C9A84C', '#3B7FF5', '#4ADE80', '#F472B6', '#F59E0B', '#22D3EE', '#A78BFA'];

function cardFormatter(card) {
    if (card.format === 'zar') return (n) => formatZar(n);
    if (card.format === 'percent') return (n) => `${Math.round(n)}%`;
    return (n) => Math.round(n).toLocaleString('en-ZA');
}

function RevenueTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-2xl border border-white/10 bg-[#0D1526] px-4 py-3 shadow-xl">
            <p className="text-xs text-white/58">{label}</p>
            <p className="mt-1 font-outfit text-lg font-black text-white">{formatZar(payload[0].value)}</p>
            <p className="mt-0.5 text-xs text-white/58">{payload[0].payload.units} sold</p>
        </div>
    );
}

function StatCard({ card }) {
    const IconComponent = CARD_ICONS[card.key] || Users;
    const tone = CARD_TONES[card.key] || '#C9A84C';
    const hasTrend = Number.isFinite(card.trend) && card.trend !== 0;
    const isPositive = (card.trend || 0) >= 0;
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    return (
        <TiltCard max={6} className="h-full">
            <Surface className="h-full rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                        style={{ backgroundColor: `${tone}14`, borderColor: `${tone}35` }}>
                        <IconComponent size={18} style={{ color: tone }} />
                    </div>
                    {hasTrend && (
                        <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${isPositive ? 'bg-emerald-500/12 text-emerald-300' : 'bg-red-500/12 text-red-300'}`}>
                            <TrendIcon size={12} />
                            {isPositive ? '+' : ''}{card.trend}%
                        </div>
                    )}
                </div>
                <p className="mt-5 text-sm text-white/66">{card.label}</p>
                <p className="mt-1 font-outfit text-3xl font-black text-white">
                    {card.value == null ? '—' : <CountUp value={card.value} format={cardFormatter(card)} />}
                </p>
                <p className="mt-2 text-sm text-white/58">{card.subtext}</p>
            </Surface>
        </TiltCard>
    );
}

function SpeedToLead({ data }) {
    const pct = data.under_5min_pct;
    const meetsTarget = data.avg_minutes != null && data.avg_minutes <= data.target_minutes;
    const tiles = [
        {
            icon: Clock,
            label: 'Avg first response',
            value: formatMinutes(data.avg_minutes),
            note: data.avg_minutes == null ? 'No responses yet' : (meetsTarget ? 'Beating the 5-min target' : `Target: ${data.target_minutes} min`),
            tone: meetsTarget ? '#4ADE80' : '#F59E0B',
        },
        {
            icon: Target,
            label: 'Replied within 5 min',
            value: pct == null ? '—' : `${pct}%`,
            note: 'Leads contacted inside 5 minutes',
            tone: '#3B7FF5',
        },
        {
            icon: Flame,
            label: 'Follow-ups due now',
            value: data.followups_due ?? 0,
            note: data.followups_due ? 'Overdue — contact today' : 'All caught up',
            tone: data.followups_due ? '#F87171' : '#4ADE80',
        },
    ];
    return (
        <Reveal as="section" y={24}>
            <Surface className="rounded-3xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="font-outfit text-2xl font-black text-white">Speed to lead</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/66">
                            Responding within 5 minutes is the single biggest conversion lever — leads contacted fast are far more likely to book and buy. This tracks how quickly enquiries get their first reply.
                        </p>
                    </div>
                </div>

                {/* Flat stat strip: dividers, not nested cards */}
                <div className="mt-6 grid gap-y-5 border-t border-white/8 pt-5 md:grid-cols-3 md:divide-x md:divide-white/8">
                    {tiles.map((t) => {
                        const Icon = t.icon;
                        return (
                            <div key={t.label} className="md:px-6 md:first:pl-0">
                                <p className="flex items-center gap-2 text-sm text-white/66">
                                    <Icon size={15} style={{ color: t.tone }} aria-hidden="true" />
                                    {t.label}
                                </p>
                                <p className="mt-1.5 font-outfit text-2xl font-black text-white tabular-nums">{t.value}</p>
                                <p className="mt-1.5 text-xs" style={{ color: `${t.tone}` }}>{t.note}</p>
                            </div>
                        );
                    })}
                </div>

                {pct != null && (
                    <div className="mt-5">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
                            <div className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#C9A84C,#4ADE80)' }} />
                        </div>
                        <p className="mt-2 text-xs text-white/58">{pct}% of responded leads were answered within the 5-minute window.</p>
                    </div>
                )}
            </Surface>
        </Reveal>
    );
}

function SourcePerformance({ sources }) {
    if (!sources?.length) return null;
    const max = Math.max(...sources.map(s => s.leads), 1);
    return (
        <Reveal as="section" y={28}>
            <Surface className="rounded-3xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="font-outfit text-2xl font-black text-white">Lead source performance</h2>
                        <p className="mt-2 text-sm leading-6 text-white/66">Where your enquiries come from, and which channels actually convert to sales. Double down on what wins.</p>
                    </div>
                </div>
                <div className="mt-6 divide-y divide-white/8">
                    {sources.map((s, i) => (
                        <div key={s.source} className="flex items-center gap-4 py-3">
                            <div className="flex w-28 shrink-0 items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                                <span className="text-sm font-medium text-white/80">{s.source}</span>
                            </div>
                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/6">
                                <div className="h-full rounded-full"
                                    style={{ width: `${(s.leads / max) * 100}%`, backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                            </div>
                            <span className="w-16 shrink-0 text-right text-sm font-semibold text-white">{s.leads} leads</span>
                            <span className={`w-24 shrink-0 text-right text-sm font-semibold ${s.conversion_pct >= 30 ? 'text-emerald-300' : s.conversion_pct > 0 ? 'text-amber-300' : 'text-white/58'}`}>
                                {s.conversion_pct}% won
                            </span>
                        </div>
                    ))}
                </div>
            </Surface>
        </Reveal>
    );
}

function DashboardSkeleton() {
    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
            </div>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
                <Skeleton className="h-96 rounded-3xl" />
                <Skeleton className="h-96 rounded-3xl" />
            </div>
            <Skeleton className="h-64 rounded-3xl" />
        </>
    );
}

export default function Dashboard() {
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    const load = React.useCallback(async () => {
        try {
            setError(null);
            const res = await axios.get(`${API_BASE}/api/dashboard/overview`, { headers: authHeaders() });
            setData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Could not load your dashboard. Check that the backend is running.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        load();
        const id = setInterval(load, 60_000); // refresh every minute
        return () => clearInterval(id);
    }, [load]);

    const refresh = () => { setLoading(true); load(); };

    return (
        <PageShell
            title="Performance dashboard"
            description="A live view of pipeline health, revenue momentum, inventory mix, and the leads that need attention next."
            actions={(
                <Magnetic strength={0.35}>
                    <button
                        onClick={refresh}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/10 px-4 py-2 text-sm font-semibold text-[#F7D774] transition hover:bg-[#C9A84C]/16"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </Magnetic>
            )}
            maxWidth="max-w-[1440px]"
        >
            {loading && !data ? (
                <DashboardSkeleton />
            ) : error ? (
                <Surface className="rounded-3xl">
                    <EmptyState
                        icon={AlertTriangle}
                        title="Couldn't load the dashboard"
                        description={error}
                        actionLabel="Try again"
                        onAction={refresh}
                    />
                </Surface>
            ) : data ? (
                <>
                    <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" stagger={0.08} amount={0.3}>
                        {data.stat_cards.map((card) => (
                            <StaggerItem key={card.key}><StatCard card={card} /></StaggerItem>
                        ))}
                    </Stagger>

                    <Reveal y={24}><WebsiteActivity /></Reveal>

                    {data.speed_to_lead && <SpeedToLead data={data.speed_to_lead} />}

                    <Reveal className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_360px]" y={28}>
                        <Surface className="rounded-3xl">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h2 className="font-outfit text-2xl font-black text-white">Revenue trend</h2>
                                    <p className="mt-2 text-sm leading-6 text-white/66">
                                        Closed-deal revenue across the last six months, pulled live from your deals.
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-white/58">Open pipeline</p>
                                    <p className="mt-1 font-outfit text-2xl font-black text-white">{formatZar(data.pipeline_value)}</p>
                                </div>
                            </div>

                            <div className="mt-8 h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.revenue_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="dashboardRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.32} />
                                                <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }} />
                                        <YAxis hide />
                                        <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'rgba(201,168,76,0.25)', strokeDasharray: '4 4' }} />
                                        <Area type="monotone" dataKey="revenue" stroke="#C9A84C" strokeWidth={3}
                                            fill="url(#dashboardRevenueGradient)"
                                            activeDot={{ r: 5, fill: '#C9A84C', stroke: '#0F172A', strokeWidth: 2 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Surface>

                        <div className="space-y-6">
                            <Surface className="rounded-3xl">
                                <h2 className="font-outfit text-2xl font-black text-white">Inventory mix</h2>
                                <p className="mt-2 text-sm leading-6 text-white/66">Available stock by condition.</p>

                                {data.inventory_mix.length === 0 ? (
                                    <div className="mt-6">
                                        <EmptyState icon={Car} title="No stock yet" description="Add vehicles in the Stock module and they'll appear here." />
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative mt-6 h-56">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={data.inventory_mix} innerRadius={58} outerRadius={82} paddingAngle={4} dataKey="value">
                                                        {data.inventory_mix.map((item, index) => <Cell key={item.name} fill={donutColors[index % donutColors.length]} />)}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ background: '#0D1526', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, color: '#fff' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="font-outfit text-3xl font-black text-white">{data.inventory_total}</span>
                                                <span className="text-xs text-white/58">vehicles</span>
                                            </div>
                                        </div>

                                        <div className="mt-6 divide-y divide-white/8">
                                            {data.inventory_mix.map((item, index) => (
                                                <div key={item.name} className="flex items-center justify-between py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: donutColors[index % donutColors.length] }} />
                                                        <span className="text-sm text-white/72">{item.name}</span>
                                                    </div>
                                                    <span className="text-sm font-semibold text-white">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </Surface>

                            <Surface className="rounded-3xl">
                                <h2 className="font-outfit text-2xl font-black text-white">AI focus</h2>
                                <p className="mt-2 text-sm leading-6 text-white/66">The next recommended moves, generated from your live pipeline.</p>
                                <div className="mt-6 divide-y divide-white/8">
                                    {data.ai_focus.map((item) => (
                                        <div key={item} className="py-3 text-sm leading-6 text-white/72">
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </Surface>
                        </div>
                    </Reveal>

                    {data.source_performance && <SourcePerformance sources={data.source_performance} />}

                    <Reveal as="section" y={28}>
                    <Surface className="rounded-3xl">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h2 className="font-outfit text-2xl font-black text-white">Leads needing attention</h2>
                                <p className="mt-2 text-sm leading-6 text-white/66">Overdue follow-ups first, then your hottest active leads.</p>
                            </div>
                            <a href="/leads" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0D1526] px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-[#C9A84C]/20 hover:text-white">
                                View full pipeline <ArrowUpRight size={16} />
                            </a>
                        </div>

                        {data.leads_attention.length === 0 ? (
                            <div className="mt-6">
                                <EmptyState icon={Users} title="No active leads" description="New leads from WhatsApp, your website, or the chatbot will show up here." />
                            </div>
                        ) : (
                            <div className="mt-6 divide-y divide-white/8">
                                {data.leads_attention.map((lead) => (
                                    <div key={lead.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C9A84C]/18 bg-[#C9A84C]/10 font-outfit text-sm font-black text-[#F7D774]">
                                                {(lead.name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-white">{lead.name}</p>
                                                    {lead.overdue && (
                                                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-300">Overdue</span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-sm text-white/58">{lead.vehicle}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/66" title="AI lead score">★ {lead.ai_score}</span>
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[lead.status] || 'bg-white/8 text-white/70'}`}>
                                                {STATUS_LABELS[lead.status] || lead.status}
                                            </span>
                                            {lead.value != null && <span className="text-sm font-semibold text-[#F7D774]">{formatZar(lead.value)}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Surface>
                    </Reveal>
                </>
            ) : null}
        </PageShell>
    );
}
