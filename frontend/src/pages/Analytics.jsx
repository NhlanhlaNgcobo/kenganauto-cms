import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Activity, TrendingUp, TrendingDown, Clock, Users, DollarSign, Calendar,
    PieChart as PieIcon, Download, Filter, AlertCircle, MessageSquare, Briefcase,
    Car, Heart, HelpCircle
} from 'lucide-react';
import { Skeleton } from '../components/Skeleton';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const COLORS = ['#C9A84C', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

export default function AnalyticsDashboard() {
    const { user, token } = useAuth();
    const { reportType } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('this_month');

    // The active view (overview vs sales vs finance)
    const activeView = reportType || 'overview';

    useEffect(() => { loadDashboard(); }, [activeView, dateRange]);

    const loadDashboard = async () => {
        setLoading(true);
        setData(null);
        try {
            const endpoint = activeView === 'overview' ? 'dashboard' : activeView;
            const res = await axios.get(`${API_URL}/api/analytics/${endpoint}`, {
                params: { range: dateRange },
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (e) { console.error('Error fetching analytics view:', activeView, e); }
        setLoading(false);
    };

    const handleExport = () => window.print();

    // Secondary Nav items mapping explicitly to specific Reports
    const TABS = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'sales', label: 'Sales Report', icon: DollarSign },
        { id: 'finance', label: 'Finance & F&I', icon: Briefcase },
        { id: 'service', label: 'Service Output', icon: Calendar },
        { id: 'leads', label: 'Lead Quality AI', icon: Users },
        { id: 'retention', label: 'Loyalty & Retention', icon: Heart }
    ];

    if (loading || !data) {
        return (
            <div className="flex flex-col h-screen bg-[#0A0F1E] p-8 space-y-8 overflow-hidden">
                <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="w-32 h-3" />
                        <Skeleton className="w-64 h-6" />
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
                    <Skeleton className="h-[400px] lg:col-span-2 rounded-2xl" />
                    <Skeleton className="h-[400px] rounded-2xl" />
                </div>
            </div>
        );
    }

    // Determine metrics layout conditionally
    const topMetrics = data.top_metrics || data.metrics || [];

    return (
        <div className="flex flex-col h-screen bg-[#0A0F1E] text-white overflow-hidden">
            {/* ── HEADER ── */}
            <header className="px-8 py-5 flex items-center justify-between sticky top-0 z-20"
                style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl border border-white/10 text-white bg-white/5 shadow-lg shadow-[#C9A84C]/5">
                        <Activity size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-0.5" style={{ color: 'rgba(201,168,76,0.4)' }}>Real-Time Intelligence</p>
                        <h1 className="font-outfit font-black text-xl text-white">Dealership Analytics</h1>
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 overflow-x-auto print:hidden">
                        {['Today', 'This Week', 'This Month', 'Last Month'].map(range => {
                            const val = range.toLowerCase().replace(' ', '_');
                            return (
                                <button key={range} onClick={() => setDateRange(val)}
                                    className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all whitespace-nowrap
                                        ${dateRange === val ? 'bg-[#C9A84C] text-[#0A0F1E]' : 'text-white/40 hover:text-white'}`}>
                                    {range}
                                </button>
                            );
                        })}
                    </div>
                    <button onClick={handleExport} className="flex flex-row items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-colors shrink-0 print:hidden">
                        <Download size={14} /> EXPORT PDF
                    </button>
                </div>
            </header>

            {/* ── SUB - NAVIGATION ── */}
            <div className="px-8 py-3 border-b border-white/5 flex gap-2 overflow-x-auto print:hidden bg-gradient-to-b from-[#0A0F1E] to-transparent z-10">
                {TABS.map(tab => {
                    const active = activeView === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button key={tab.id} onClick={() => navigate(tab.id === 'overview' ? '/analytics' : `/analytics/${tab.id}`)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                ${active ? 'bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C]' : 'border border-transparent text-white/40 hover:text-white hover:bg-white/5'}`}>
                            <Icon size={12} /> {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className={`flex-1 overflow-auto p-8 pt-6 relative print:p-0 ${activeView === 'overview' ? '' : 'max-w-7xl mx-auto w-full'}`}>

                {/* ── METRIC CARDS ROW (Universal Header Block) ── */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                    {topMetrics.map((m, i) => (
                        <div key={i} className={`bg-white/5 border border-white/5 p-4 rounded-2xl shrink-0 ${activeView === 'overview' ? 'hover:bg-white/10' : ''}`}>
                            <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-2 truncate">{m.label}</p>
                            <div className="flex justify-between items-end">
                                <span className={`text-2xl font-black ${typeof m.value === 'string' && m.value.includes('R') ? 'text-green-400' : 'text-white'}`}>{m.value}</span>
                                {m.change && (
                                    <span className={`text-[10px] font-bold flex flex-row items-center gap-1 ${m.positive !== false && !m.change.includes('-') ? 'text-green-400' : 'text-red-400'}`}>
                                        {!m.change.includes('-') ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {m.change}
                                    </span>
                                )}
                            </div>
                            {m.target && <p className="text-[9px] text-white/30 uppercase font-black mt-2 tracking-widest">Target: {m.target}</p>}
                        </div>
                    ))}
                </div>

                {/* ─────────────────────────────────────────────────────────────
                     REPORT: OVERVIEW (Existing Dashboard)
                   ───────────────────────────────────────────────────────────── */}
                {activeView === 'overview' && (
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 pb-10">
                        {/* LEFT CHARTS AREA (3 cols) */}
                        <div className="xl:col-span-3 space-y-8">
                            {/* ROW 1: Funnel & Pie Chart */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-black/30 border border-white/5 p-6 rounded-2xl">
                                    <h3 className="text-xs uppercase tracking-widest font-black text-white/50 mb-6 flex items-center gap-2"><Filter size={14} /> Lead Pipeline Funnel</h3>
                                    <div className="space-y-3 flex flex-col items-center w-full relative">
                                        {data.pipeline_funnel.map((step, i) => (
                                            <div key={i} className="flex flex-col items-center w-full">
                                                <div className="h-10 flex items-center justify-between px-4 rounded-xl text-xs font-bold transition-all shadow-lg"
                                                    style={{ width: `${Math.max(20, 100 - (i * 15))}%`, background: `rgba(201, 168, 76, ${1 - (i * 0.15)})` }}>
                                                    <span className="text-black uppercase tracking-widest">{step.stage}</span>
                                                    <span className="text-black font-black font-mono">{step.volume}</span>
                                                </div>
                                                {i < data.pipeline_funnel.length - 1 && (<div className="text-[9px] text-red-400 font-bold my-1">-{step.dropoff} drop-off</div>)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-black/30 border border-white/5 p-6 rounded-2xl flex flex-col">
                                    <h3 className="text-xs uppercase tracking-widest font-black text-white/50 mb-6 flex items-center gap-2"><PieIcon size={14} /> Lead Sources</h3>
                                    <div className="flex-1 min-h-[250px]"><ResponsiveContainer width="100%" height="100%"><PieChart>
                                        <Pie data={data.lead_sources} dataKey="volume" nameKey="source" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                                            {data.lead_sources.map((e, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie><Tooltip contentStyle={{ backgroundColor: '#0A0F1E', borderColor: 'rgba(255,255,255,0.1)' }} />
                                    </PieChart></ResponsiveContainer></div>
                                </div>
                            </div>

                            {/* ROW 2: Bar & Lines */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-black/30 border border-white/5 p-6 rounded-2xl h-[350px]"><h3 className="text-xs uppercase tracking-widest font-black text-white/50 mb-6 flex items-center gap-2">Response Times</h3><ResponsiveContainer width="100%" height="100%"><LineChart data={data.response_trend.map(d => ({ ...d, goal: 2 }))}><XAxis dataKey="day" hide /><YAxis stroke="white" opacity={0.2} fontSize={10} /><Tooltip contentStyle={{ backgroundColor: '#0D1526', border: 'none' }} /><Line type="monotone" dataKey="time" stroke="#3B82F6" strokeWidth={3} dot={false} /><Line type="dashed" dataKey="goal" stroke="#10B981" /></LineChart></ResponsiveContainer></div>
                                <div className="bg-black/30 border border-white/5 p-6 rounded-2xl h-[350px]"><h3 className="text-xs uppercase tracking-widest font-black text-white/50 mb-6 flex items-center gap-2">6-Month Revenue</h3><ResponsiveContainer width="100%" height="100%"><BarChart data={data.monthly_revenue}><XAxis dataKey="month" stroke="white" opacity={0.2} fontSize={10} /><YAxis yAxisId="left" fontSize={10} stroke="white" opacity={0.2} /><Bar yAxisId="left" dataKey="revenue" fill="#C9A84C" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
                            </div>
                        </div>

                        {/* RIGHT AREA (Alerts) */}
                        <div className="xl:col-span-1 border-l border-white/5 pl-8 hidden xl:block print:hidden">
                            <h3 className="text-xs uppercase tracking-widest font-black text-white mb-6 flex items-center gap-2"><AlertCircle size={16} className="text-red-400" /> Live Alerts</h3>
                            <div className="space-y-4">{data.live_alerts.map(a => (<div key={a.id} className="p-4 rounded-xl border border-white/10 hover:border-white/30"><span className="text-[9px] font-black uppercase tracking-widest opacity-50 block mb-1">{a.type.replace('_', ' ')}</span><p className="text-xs font-bold leading-relaxed">{a.message}</p></div>))}</div>
                        </div>
                    </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                     REPORT: SALES REPORT
                   ───────────────────────────────────────────────────────────── */}
                {activeView === 'sales' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-black/30 border border-white/5 p-6 rounded-2xl h-[350px] flex flex-col">
                            <h3 className="text-xs uppercase tracking-widest font-black text-white/50 flex items-center gap-2 mb-6"><PieIcon size={14} /> Won/Lost Reasons</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.won_lost_reasons} dataKey="value" nameKey="reason" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                                        {data.won_lost_reasons.map((e, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#0A0F1E', border: '1px solid rgba(255,255,255,0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-black/30 border border-white/5 p-6 rounded-2xl flex flex-col">
                            <h3 className="text-xs uppercase tracking-widest font-black text-white/50 mb-6 flex items-center gap-2"><DollarSign size={14} /> Revenue by Salesperson</h3>
                            <div className="flex-1 space-y-6">
                                {data.revenue_by_salesperson.map((sp, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between items-end mb-2"><span className="text-sm font-bold">{sp.name}</span><span className="font-mono text-[#C9A84C] font-black">R {sp.revenue}M</span></div>
                                        <div className="w-full bg-white/5 rounded-full h-2"><div className="bg-[#C9A84C] h-2 rounded-full" style={{ width: `${(sp.revenue / 2) * 100}%` }}></div></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="lg:col-span-2 bg-black/30 border border-white/5 p-6 rounded-2xl">
                            <h3 className="text-xs uppercase tracking-widest font-black text-white/50 mb-6 flex items-center gap-2"><Car size={14} /> Vehicle Model Popularity</h3>
                            <table className="w-full text-left"><thead className="border-b border-white/10 text-[10px] uppercase font-bold tracking-widest text-white/40"><tr><th className="pb-3 px-2">Vehicle Model</th><th className="pb-3 text-center text-blue-400">Enquiries</th><th className="pb-3 text-center text-yellow-400">Test Drives</th><th className="pb-3 text-center text-green-400">Deals Closed</th></tr></thead>
                                <tbody>
                                    {data.vehicle_popularity.map((v, i) => (
                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5"><td className="py-4 px-2 font-bold text-sm">{v.model}</td><td className="py-4 text-center text-xs font-mono">{v.enquiries}</td><td className="py-4 text-center text-xs font-mono">{v.test_drives}</td><td className="py-4 text-center font-black text-green-400">{v.sold}</td></tr>
                                    ))}
                                </tbody></table>
                        </div>
                    </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                     REPORT: FINANCE REPORT
                   ───────────────────────────────────────────────────────────── */}
                {activeView === 'finance' && (
                    <div className="grid grid-cols-1 gap-8">
                        <div className="bg-black/30 border border-white/5 p-6 rounded-2xl h-[400px]">
                            <h3 className="text-xs uppercase tracking-widest font-black text-white/50 mb-6 flex items-center gap-2"><Briefcase size={14} /> Approval Rates by Bank Institution</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.approval_by_bank} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" stroke="white" opacity={0.2} tickFormatter={v => `${v}%`} />
                                    <YAxis type="category" dataKey="bank" stroke="white" opacity={0.6} fontSize={10} width={100} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0D1526' }} />
                                    <Bar dataKey="approval_rate" name="Approval Rate %" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                     REPORT: SERVICE REPORT
                   ───────────────────────────────────────────────────────────── */}
                {activeView === 'service' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-black/30 border border-white/5 p-6 rounded-2xl h-[350px]">
                            <h3 className="text-xs uppercase tracking-widest font-black text-white/50 mb-6 flex items-center gap-2"><PieIcon size={14} /> Revenue by Service Type</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.revenue_by_type} dataKey="revenue" nameKey="type" cx="50%" cy="50%" outerRadius={100}>
                                        <Cell fill="#C9A84C" /><Cell fill="#3B82F6" /><Cell fill="#EF4444" /><Cell fill="#8B5CF6" />
                                    </Pie><Tooltip formatter={(v) => `R ${v}`} contentStyle={{ backgroundColor: '#0A0F1E' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-black/30 border border-white/5 p-6 rounded-2xl h-[350px]">
                            <h3 className="text-xs uppercase tracking-widest font-black text-white/50 mb-6 flex items-center gap-2"><Clock size={14} /> Busiest Days & Times Segmented</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.busiest_times}>
                                    <XAxis dataKey="day" stroke="white" opacity={0.2} fontSize={10} />
                                    <YAxis stroke="white" opacity={0.2} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0D1526' }} />
                                    <Legend />
                                    <Bar dataKey="am" name="Morning (8AM-12PM)" fill="#10B981" stackId="a" />
                                    <Bar dataKey="pm" name="Afternoon (1PM-5PM)" fill="#F59E0B" stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                     REPORT: LEAD QUALITY
                   ───────────────────────────────────────────────────────────── */}
                {activeView === 'leads' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-black/30 border border-white/5 p-6 rounded-2xl h-[350px]">
                            <h3 className="text-xs uppercase tracking-widest font-black text-white/50 mb-6 flex items-center gap-2"><PieIcon size={14} /> AI Qualification Score Distribution</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.ai_score_distribution} dataKey="count" nameKey="score" cx="50%" cy="50%" innerRadius={70} outerRadius={100}>
                                        <Cell fill="#EF4444" /><Cell fill="#F59E0B" /><Cell fill="#10B981" /><Cell fill="#3B82F6" />
                                    </Pie><Tooltip contentStyle={{ backgroundColor: '#0A0F1E' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-black/30 border border-white/5 p-6 rounded-2xl">
                            <h3 className="text-xs uppercase tracking-widest font-black text-red-500 mb-6 flex items-center gap-2"><AlertCircle size={14} /> Stale Leads Report (&gt;48h untouched)</h3>
                            <div className="space-y-4">
                                {data.stale_leads_details.map((stale, i) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                        <div><span className="text-white font-bold block">{stale.assigned_to}</span><span className="text-[10px] uppercase font-black text-white/40 tracking-widest">{stale.id}</span></div>
                                        <span className="text-red-400 font-mono font-black">{stale.untouched_hours}h ago</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                     REPORT: RETENTION
                   ───────────────────────────────────────────────────────────── */}
                {activeView === 'retention' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-black/30 border border-white/5 p-6 rounded-2xl h-[350px]">
                            <h3 className="text-xs uppercase tracking-widest font-black text-white/50 mb-6 flex items-center gap-2"><Activity size={14} /> Sequence Performance Rates</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.sequences_performance}>
                                    <XAxis dataKey="seq" stroke="white" opacity={0.2} fontSize={9} interval={0} angle={-15} textAnchor="end" />
                                    <YAxis stroke="white" opacity={0.2} tickFormatter={v => `${v}%`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0D1526' }} />
                                    <Legend verticalAlign="top" />
                                    <Bar dataKey="open_rate" name="Open Rate %" fill="#C9A84C" />
                                    <Bar dataKey="response_rate" name="Response Rate %" fill="#3B82F6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-black/30 border border-white/5 p-6 rounded-2xl">
                            <h3 className="text-xs uppercase tracking-widest font-black text-white/50 mb-6 flex items-center gap-2"><Users size={14} /> Loyalty Tier Distribution</h3>
                            <div className="space-y-4">
                                {data.loyalty_distribution.map((tier, i) => {
                                    const pct = (tier.members / data.loyalty_distribution.reduce((a, b) => a + b.members, 0) * 100).toFixed(1);
                                    let clr = '#C9A84C'; if (i === 2) clr = '#9CA3AF'; if (i === 3) clr = '#D97706';
                                    return (
                                        <div key={i} className="p-4 border border-white/10 rounded-xl flex items-center justify-between">
                                            <div><span className="font-black" style={{ color: clr }}>{tier.tier}</span> <span className="text-white/40 text-xs ml-2">{tier.members} members</span></div>
                                            <span className="font-mono text-xs text-white/60">{pct}%</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
