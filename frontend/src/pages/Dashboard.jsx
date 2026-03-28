import React, { useState } from 'react';
import {
    TrendingUp, TrendingDown, Search, Bell, ChevronRight,
    HelpCircle, MoreHorizontal, Box, ArrowUpRight,
    Zap, Users, Car, DollarSign, Activity, Star
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

/* ── Mock data ── */
const revenueData = [
    { month: 'Aug', revenue: 9200000, leads: 58 },
    { month: 'Sep', revenue: 11500000, leads: 74 },
    { month: 'Oct', revenue: 10800000, leads: 69 },
    { month: 'Nov', revenue: 13400000, leads: 88 },
    { month: 'Dec', revenue: 12100000, leads: 79 },
    { month: 'Jan', revenue: 14850000, leads: 96 },
];

const inventoryData = [
    { name: 'Luxury', value: 34 },
    { name: 'SUV', value: 45 },
    { name: 'Sedan', value: 25 },
    { name: 'EV', value: 12 },
];

const DONUT_COLORS = ['#C9A84C', '#3B7FF5', '#4ADE80', '#F472B6'];

const recentLeads = [
    { name: 'Thabo Molefe', vehicle: 'Mercedes GLE 450', status: 'Hot', value: 'R 1.2M', avatar: 'TM' },
    { name: 'Priya Naidoo', vehicle: 'BMW X5 M Sport', status: 'Warm', value: 'R 980k', avatar: 'PN' },
    { name: 'Siyanda Dlamini', vehicle: 'Audi Q7 Quattro', status: 'Cold', value: 'R 850k', avatar: 'SD' },
    { name: 'Jacques Du Plessis', vehicle: 'Range Rover Sport', status: 'Hot', value: 'R 1.8M', avatar: 'JD' },
];

const statusStyles = {
    Hot: { bg: 'rgba(239,68,68,0.1)', text: '#F87171', dot: '#EF4444' },
    Warm: { bg: 'rgba(245,158,11,0.1)', text: '#FBBF24', dot: '#F59E0B' },
    Cold: { bg: 'rgba(59,130,246,0.1)', text: '#60A5FA', dot: '#3B82F6' },
};

/* ── Custom Tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: '#0A0F1E', border: '1px solid rgba(201,168,76,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
            <p style={{ color: '#C9A84C', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
            <p style={{ color: '#F0EDE8', fontFamily: 'Outfit', fontWeight: 700, fontSize: '1rem' }}>
                R {(payload[0]?.value / 1_000_000).toFixed(2)}M
            </p>
        </div>
    );
};

/* ── Stat Card ── */
const StatCard = ({ label, value, sub, trend, icon: Icon, iconColor, delay = '' }) => {
    const isUp = trend >= 0;
    return (
        <div className={`stat-card anim-fade-up ${delay}`}>
            <div className="flex items-start justify-between mb-5">
                <div className="p-2.5 rounded-xl" style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}25` }}>
                    <Icon size={18} style={{ color: iconColor }} strokeWidth={2} />
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full`}
                    style={{ background: isUp ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', color: isUp ? '#4ADE80' : '#F87171' }}>
                    {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {isUp ? '+' : ''}{trend}%
                </div>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(240,237,232,0.4)' }}>
                {label}
            </p>
            <p className="font-outfit font-black text-3xl text-white mb-1">{value}</p>
            {sub && <p className="text-[11px]" style={{ color: 'rgba(240,237,232,0.35)' }}>{sub}</p>}
        </div>
    );
};

/* ══════════════════════════════════════════════ */
const Dashboard = () => {
    const [searchVal, setSearchVal] = useState('');

    return (
        <div className="flex flex-col min-h-screen" style={{ background: 'transparent' }}>

            {/* ── Top Header ── */}
            <header className="flex-shrink-0 px-4 md:px-8 pl-16 md:pl-8 flex items-center justify-between sticky top-0 z-40 py-4 md:py-5"
                style={{
                    background: 'rgba(10,15,30,0.85)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(201,168,76,0.08)',
                    boxShadow: '0 4px 40px rgba(0,0,0,0.4)',
                }}>

                {/* Brand */}
                <div className="flex items-center gap-3 anim-slide-right">
                    <div className="flex flex-col">
                        <h1 className="font-outfit font-black text-xl tracking-tight leading-none">
                            <span className="text-white">KENGAN</span>
                            <span className="gold-text">AUTO</span>
                        </h1>
                        <p className="text-[9px] tracking-[0.25em] uppercase mt-0.5" style={{ color: 'rgba(201,168,76,0.5)' }}>
                            Automotive Intelligence OS
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-md w-full mx-4 md:mx-8 anim-fade-in delay-100 hidden sm:block">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: 'rgba(240,237,232,0.3)' }} />
                    <input
                        type="text"
                        value={searchVal}
                        onChange={e => setSearchVal(e.target.value)}
                        placeholder="Search leads, vehicles, clients…"
                        className="w-full py-2.5 pl-11 pr-5 text-sm rounded-xl outline-none transition-all"
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(201,168,76,0.12)',
                            color: '#F0EDE8',
                            fontFamily: 'Inter',
                        }}
                    />
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4 anim-fade-in delay-200">
                    <button className="relative p-2.5 rounded-xl transition-all hover:bg-white/5"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        <Bell size={18} style={{ color: 'rgba(240,237,232,0.5)' }} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C9A84C]"
                            style={{ boxShadow: '0 0 8px rgba(201,168,76,0.6)' }} />
                    </button>
                    <button className="p-2.5 rounded-xl transition-all hover:bg-white/5"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                        <HelpCircle size={18} style={{ color: 'rgba(240,237,232,0.5)' }} />
                    </button>

                    <div className="h-8 w-px mx-1" style={{ background: 'rgba(201,168,76,0.12)' }} />

                    {/* User Profile */}
                    <div className="flex items-center gap-3 cursor-pointer group">
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center font-outfit font-black text-sm"
                            style={{
                                background: 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.1))',
                                border: '1px solid rgba(201,168,76,0.3)',
                                color: '#C9A84C',
                            }}>
                            DM
                        </div>
                        <div className="hidden md:block">
                            <p className="text-sm font-bold text-white leading-none">David M.</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(201,168,76,0.5)' }}>
                                Admin
                            </p>
                        </div>
                        <ChevronRight size={14} style={{ color: 'rgba(240,237,232,0.2)' }} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                </div>
            </header>

            {/* ── Page Title Strip ── */}
            <div className="px-4 md:px-8 pt-8 pb-4 anim-fade-up">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: 'rgba(201,168,76,0.5)' }}>
                    Command Centre
                </p>
                <h2 className="font-outfit font-black text-3xl text-white">
                    Performance <span className="gold-text">Dashboard</span>
                </h2>
            </div>

            {/* ── Main Content ── */}
            <div className="flex-1 px-4 md:px-8 pb-10 overflow-y-auto w-full max-w-full">
                <div className="max-w-[1600px] mx-auto w-full">

                    {/* ── KPI Row ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
                        <StatCard label="Active Leads" value="87" sub="+12 this week" trend={12} icon={Users} iconColor="#C9A84C" delay="delay-100" />
                        <StatCard label="Vehicles Sold" value="124" sub="October 2025" trend={18} icon={Car} iconColor="#3B7FF5" delay="delay-200" />
                        <StatCard label="Monthly Revenue" value="R 14.85M" sub="Oct 2025" trend={8.5} icon={DollarSign} iconColor="#4ADE80" delay="delay-300" />
                        <StatCard label="AI Resolution" value="83%" sub="Chatbot close rate" trend={-2} icon={Zap} iconColor="#F472B6" delay="delay-400" />
                    </div>

                    {/* ── Charts + AI Panel Row ── */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">

                        {/* Revenue Chart — 2 cols */}
                        <div className="xl:col-span-2 luxury-card p-7 anim-fade-up delay-200">
                            <div className="flex items-center justify-between mb-7">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(201,168,76,0.5)' }}>
                                        Revenue Trend
                                    </p>
                                    <h3 className="font-outfit font-bold text-lg text-white">Sales Performance</h3>
                                </div>
                                <button className="p-2 rounded-lg transition-all hover:bg-white/5" style={{ color: 'rgba(240,237,232,0.3)' }}>
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>

                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.25} />
                                                <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                        <XAxis dataKey="month" stroke="rgba(240,237,232,0.2)" fontSize={11} axisLine={false} tickLine={false}
                                            tick={{ fill: 'rgba(240,237,232,0.35)', fontFamily: 'Inter', fontWeight: 600 }} />
                                        <YAxis hide />
                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(201,168,76,0.2)', strokeWidth: 1 }} />
                                        <Area type="monotone" dataKey="revenue" stroke="#C9A84C" strokeWidth={2.5}
                                            fillOpacity={1} fill="url(#goldGrad)" dot={false}
                                            activeDot={{ r: 5, fill: '#C9A84C', stroke: '#0A0F1E', strokeWidth: 2 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Inventory Donut — 1 col */}
                        <div className="luxury-card p-7 anim-fade-up delay-300">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(201,168,76,0.5)' }}>
                                        Stock
                                    </p>
                                    <h3 className="font-outfit font-bold text-lg text-white">Inventory Mix</h3>
                                </div>
                                <button className="p-2 rounded-lg transition-all hover:bg-white/5" style={{ color: 'rgba(240,237,232,0.3)' }}>
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>

                            <div className="h-44 flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={inventoryData} innerRadius={55} outerRadius={78} paddingAngle={4} dataKey="value"
                                            stroke="none">
                                            {inventoryData.map((_, i) => (
                                                <Cell key={i} fill={DONUT_COLORS[i]} opacity={0.85} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ background: '#0A0F1E', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 10, fontSize: 12 }}
                                            itemStyle={{ color: '#F0EDE8' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {inventoryData.map((item, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DONUT_COLORS[i] }} />
                                        <span className="text-[11px] font-semibold" style={{ color: 'rgba(240,237,232,0.6)' }}>
                                            {item.name} — <span className="text-white font-bold">{item.value}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Leads Table + AI Panel ── */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                        {/* Recent Leads — 2 cols */}
                        <div className="xl:col-span-2 luxury-card p-7 anim-fade-up delay-300">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(201,168,76,0.5)' }}>
                                        Pipeline
                                    </p>
                                    <h3 className="font-outfit font-bold text-lg text-white">Active Leads</h3>
                                </div>
                                <button className="btn-gold text-[11px] py-2 px-4">
                                    View All <ArrowUpRight size={13} />
                                </button>
                            </div>

                            <div className="space-y-2">
                                {recentLeads.map((lead, i) => (
                                    <div key={i}
                                        className="flex items-center justify-between px-4 py-4 rounded-xl cursor-pointer group transition-all"
                                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = 'rgba(201,168,76,0.04)';
                                            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Avatar */}
                                            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-[13px] font-black flex-shrink-0 font-outfit"
                                                style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
                                                {lead.avatar}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-white">{lead.name}</p>
                                                <p className="text-[11px]" style={{ color: 'rgba(240,237,232,0.4)' }}>{lead.vehicle}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {/* Status Pill */}
                                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
                                                style={{
                                                    background: statusStyles[lead.status].bg,
                                                    color: statusStyles[lead.status].text,
                                                }}>
                                                ● {lead.status}
                                            </span>
                                            {/* Value */}
                                            <span className="font-outfit font-bold text-sm" style={{ color: '#C9A84C' }}>{lead.value}</span>
                                            <ChevronRight size={14} style={{ color: 'rgba(240,237,232,0.2)' }} className="group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AI Insights Panel — 1 col */}
                        <div className="anim-fade-up delay-400">
                            <div className="luxury-card h-full p-7 overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2.5 rounded-xl" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                                        <Zap size={18} style={{ color: '#C9A84C' }} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(201,168,76,0.5)' }}>
                                            AI ENGINE
                                        </p>
                                        <p className="text-sm font-bold text-white">Kengan Insights</p>
                                    </div>
                                </div>

                                {/* AI Avatar */}
                                <div className="rounded-2xl p-6 mb-6 text-center relative overflow-hidden"
                                    style={{
                                        background: 'linear-gradient(135deg, #0A0F1E 0%, #1E3A5F 100%)',
                                        border: '1px solid rgba(59,127,245,0.2)',
                                        boxShadow: '0 0 40px rgba(59,127,245,0.07)',
                                    }}>
                                    {/* Glow */}
                                    <div className="absolute inset-0 pointer-events-none"
                                        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(59,127,245,0.2), transparent 70%)' }} />

                                    <div className="h-14 w-14 mx-auto rounded-2xl flex items-center justify-center font-outfit font-black text-xl text-white mb-3 relative z-10"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(59,127,245,0.3), rgba(59,127,245,0.1))',
                                            border: '1px solid rgba(59,127,245,0.4)',
                                            boxShadow: '0 0 24px rgba(59,127,245,0.3)',
                                        }}>
                                        KA
                                    </div>
                                    <p className="font-outfit font-black text-white text-sm tracking-wider relative z-10">KENGAN AI</p>
                                    <p className="text-[9px] tracking-[0.25em] uppercase mt-1 relative z-10" style={{ color: 'rgba(59,127,245,0.6)' }}>
                                        Connected
                                    </p>
                                </div>

                                {/* Insight Items */}
                                <div className="space-y-3 mb-6">
                                    {[
                                        'High-value lead: Thabo M. (Mercedes GLE). Follow-up recommended.',
                                        'BMW 7-Series inventory low — only 2 units remaining.',
                                        '8 leads matched to new Pre-Owned SUV stock.',
                                        'X5 marketing peak detected — boost campaign now.',
                                    ].map((text, i) => (
                                        <div key={i} className="flex gap-3 p-3 rounded-xl cursor-pointer group transition-all"
                                            style={{ background: 'rgba(255,255,255,0.02)' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.04)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}>
                                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#C9A84C' }} />
                                            <p className="text-xs leading-relaxed" style={{ color: 'rgba(240,237,232,0.55)' }}>{text}</p>
                                        </div>
                                    ))}
                                </div>

                                <hr className="gold-divider mb-4" />

                                {/* Actions */}
                                <div className="space-y-2">
                                    {['Contact Thabo M.', 'Restock BMW 7-Series', 'Activate SUV Leads'].map((action, i) => (
                                        <button key={i} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[12px] font-bold transition-all"
                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(240,237,232,0.7)' }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)';
                                                e.currentTarget.style.background = 'rgba(201,168,76,0.04)';
                                                e.currentTarget.style.color = '#F0EDE8';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                e.currentTarget.style.color = 'rgba(240,237,232,0.7)';
                                            }}>
                                            {action}
                                            <ChevronRight size={13} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
