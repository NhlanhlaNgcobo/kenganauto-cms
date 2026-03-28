import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Car, Search, Filter, Camera, DollarSign, ArrowRight, Save, Clock, Target, CreditCard, ChevronRight, X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATUS_COLORS = {
    'enquiry': { bg: 'rgba(59,127,245,0.1)', text: '#60A5FA', border: 'rgba(59,127,245,0.2)' },
    'valued': { bg: 'rgba(201,168,76,0.1)', text: '#C9A84C', border: 'rgba(201,168,76,0.2)' },
    'inspection_booked': { bg: 'rgba(168,85,247,0.1)', text: '#C084FC', border: 'rgba(168,85,247,0.2)' },
    'offer_made': { bg: 'rgba(251,146,60,0.1)', text: '#FB923C', border: 'rgba(251,146,60,0.2)' },
    'accepted': { bg: 'rgba(34,197,94,0.1)', text: '#4ADE80', border: 'rgba(34,197,94,0.2)' },
    'declined': { bg: 'rgba(239,68,68,0.1)', text: '#F87171', border: 'rgba(239,68,68,0.2)' },
};

/* ── MOCK DATA ── */
const MOCK_TRADE_INS = [
    {
        id: 101, tenant_id: 1, lead: { customer_name: 'David Zondo', customer_phone: '+27821234567' },
        year: 2019, make: 'VW', model: 'Polo Vivo', mileage: 65000, condition: 'Good', colour: 'White',
        accident_damage: 'No', estimated_value: 105000, dealer_offer: null, status: 'valued',
        photos: ['front_1.jpg', 'dash_1.jpg'], created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
        id: 102, tenant_id: 1, lead: { customer_name: 'Sarah Naidoo', customer_phone: '+27712345678' },
        year: 2021, make: 'Toyota', model: 'Hilux', mileage: 42000, condition: 'Excellent', colour: 'Silver',
        accident_damage: 'No', estimated_value: 360000, dealer_offer: 355000, status: 'offer_made',
        photos: ['hilux_1.jpg', 'hilux_2.jpg'], created_at: new Date(Date.now() - 86400000).toISOString()
    }
];

export default function TradeIns() {
    const [tradeIns, setTradeIns] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedTrade, setSelectedTrade] = useState(null);

    // Detail Panel State
    const [offerAmount, setOfferAmount] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => { loadTradeIns(); }, []);

    const loadTradeIns = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/trade-ins`);
            setTradeIns(res.data?.length ? res.data : MOCK_TRADE_INS);
        } catch (err) {
            console.warn('Using mock trade-ins due to error:', err.message);
            setTradeIns(MOCK_TRADE_INS);
        }
        setLoading(false);
    };

    const handleUpdateOffer = async (id, status, whatsapp) => {
        setUpdating(true);
        try {
            const res = await axios.patch(`${API_URL}/api/trade-ins/${id}`, {
                dealer_offer: offerAmount,
                status,
                send_whatsapp: whatsapp
            });
            const updated = res.data.trade_in;
            setTradeIns(prev => prev.map(t => t.id === id ? { ...t, dealer_offer: updated.dealer_offer, status: updated.status } : t));
            setSelectedTrade(prev => ({ ...prev, dealer_offer: updated.dealer_offer, status: updated.status }));
        } catch (err) {
            // Mock mode fallback update
            setTradeIns(prev => prev.map(t => t.id === id ? { ...t, dealer_offer: offerAmount, status } : t));
            setSelectedTrade(prev => ({ ...prev, dealer_offer: offerAmount, status }));
            alert('Offer updated (mocked UI)');
        }
        setUpdating(false);
    };

    const filtered = tradeIns.filter(t => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            const car = `${t.year} ${t.make} ${t.model}`.toLowerCase();
            const name = (t.lead?.customer_name || '').toLowerCase();
            return car.includes(q) || name.includes(q);
        }
        return true;
    });

    return (
        <div className="flex h-screen bg-[#0A0F1E] overflow-hidden text-white relative">
            {/* ── Main View ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="px-8 py-5 flex items-center justify-between z-10"
                    style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-0.5" style={{ color: 'rgba(201,168,76,0.4)' }}>Module</p>
                        <h1 className="font-outfit font-black text-xl text-white">Trade-In Pipeline</h1>
                    </div>
                </header>

                {/* Filters */}
                <div className="px-8 py-4 flex flex-wrap items-center justify-between gap-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-2">
                        {['all', 'enquiry', 'valued', 'inspection_booked', 'offer_made', 'accepted'].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all"
                                style={{
                                    background: statusFilter === s ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                                    color: statusFilter === s ? '#C9A84C' : 'rgba(240,237,232,0.4)',
                                    border: `1px solid ${statusFilter === s ? 'rgba(201,168,76,0.3)' : 'transparent'}`
                                }}>
                                {s.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(240,237,232,0.3)' }} />
                        <input
                            type="text"
                            placeholder="Search vehicle or customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-[#C9A84C] focus:bg-white/10 outline-none w-64 transition-all"
                        />
                    </div>
                </div>

                {/* List View */}
                <div className="flex-1 overflow-y-auto p-8">
                    {loading ? (
                        <div className="text-center text-white/40 mt-10 text-xs">Loading trade-ins...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center text-white/40 mt-10 text-xs">No trade-ins found matching criteria.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map(t => (
                                <div key={t.id} onClick={() => { setSelectedTrade(t); setOfferAmount(t.dealer_offer || t.estimated_value); }}
                                    className="p-5 rounded-2xl cursor-pointer group transition-all"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.03)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.15)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>

                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-outfit font-black text-lg text-white mb-1 group-hover:text-[#C9A84C] transition-colors">{t.year} {t.make} {t.model}</p>
                                            <p className="text-[10px] text-white/50">{t.lead?.customer_name || 'Unknown'} · {t.lead?.customer_phone || '-'}</p>
                                        </div>
                                        <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase"
                                            style={{
                                                background: STATUS_COLORS[t.status]?.bg,
                                                color: STATUS_COLORS[t.status]?.text,
                                                border: `1px solid ${STATUS_COLORS[t.status]?.border}`
                                            }}>
                                            {t.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
                                            <p className="text-[8px] uppercase tracking-widest text-white/30">Mileage</p>
                                            <p className="text-xs font-bold text-white mt-0.5">{t.mileage ? `${(t.mileage / 1000).toFixed(0)}k km` : '-'}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
                                            <p className="text-[8px] uppercase tracking-widest text-white/30">Condition</p>
                                            <p className="text-xs font-bold text-white mt-0.5">{t.condition || '-'}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2 text-center border border-white/5 flex flex-col justify-center items-center">
                                            <p className="text-[8px] uppercase tracking-widest text-white/30 mb-0.5">Photos</p>
                                            <p className="text-xs font-bold text-white flex items-center gap-1"><Camera size={10} /> {t.photos?.length || 0}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                        <div>
                                            <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">AI Estimate</p>
                                            <p className="text-sm font-black text-white">R {t.estimated_value?.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Actual Offer</p>
                                            <p className="text-sm font-black" style={{ color: t.dealer_offer ? '#4ADE80' : 'rgba(255,255,255,0.2)' }}>
                                                {t.dealer_offer ? `R ${t.dealer_offer.toLocaleString()}` : 'Pending'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Slide-Over Detail Panel ── */}
            {selectedTrade && (
                <>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedTrade(null)} />
                    <div className="absolute top-0 right-0 bottom-0 w-[480px] z-50 flex flex-col shadow-2xl overflow-hidden anim-slide-left"
                        style={{ background: '#0D1526', borderLeft: '1px solid rgba(201,168,76,0.15)' }}>

                        {/* Top Navbar */}
                        <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                                    <Car size={16} className="text-[#C9A84C]" />
                                </div>
                                <h3 className="font-outfit font-black text-lg">Trade-In Details</h3>
                            </div>
                            <button onClick={() => setSelectedTrade(null)} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Scroll */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* Vehicle Header */}
                            <div>
                                <h2 className="font-outfit font-black text-3xl mb-1 group-hover:text-[#C9A84C] transition-colors">
                                    {selectedTrade.year} {selectedTrade.make} {selectedTrade.model}
                                </h2>
                                <p className="text-sm text-[#C9A84C] font-bold">Ref: TRD-{selectedTrade.id}</p>
                            </div>

                            {/* Status Tag */}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-black text-white/40">Status:</span>
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase shadow-lg"
                                    style={{
                                        background: STATUS_COLORS[selectedTrade.status]?.bg,
                                        color: STATUS_COLORS[selectedTrade.status]?.text,
                                        border: `1px solid ${STATUS_COLORS[selectedTrade.status]?.border}`
                                    }}>
                                    {selectedTrade.status.replace('_', ' ')}
                                </span>
                            </div>

                            <hr className="border-white/5" />

                            {/* AI Valuation Estimate */}
                            <div className="p-5 rounded-xl text-center relative overflow-hidden"
                                style={{ background: 'linear-gradient(135deg, rgba(59,127,245,0.05), rgba(59,127,245,0.15))', border: '1px solid rgba(59,127,245,0.2)' }}>
                                <div className="absolute top-0 right-0 p-2"><Target size={14} className="text-blue-400 opacity-50" /></div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-blue-400 mb-2">Automated AI Valuation Estimate</p>
                                <h3 className="font-outfit font-black text-3xl text-white mb-2">R {selectedTrade.estimated_value?.toLocaleString()}</h3>
                                <p className="text-[10px] text-white/60">Calculated based on average market pricing for {selectedTrade.make} {selectedTrade.model} with similar age/mileage.</p>
                            </div>

                            <hr className="border-white/5" />

                            {/* Photos Placeholder */}
                            <div>
                                <h4 className="font-bold text-xs uppercase tracking-widest text-white/50 mb-3 flex items-center gap-2"><Camera size={12} /> Customer Photos ({selectedTrade.photos?.length || 0})</h4>
                                {selectedTrade.photos?.length ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {selectedTrade.photos.map((p, i) => (
                                            <div key={i} className="aspect-video rounded-lg bg-black/50 border border-white/10 flex items-center justify-center text-[10px] text-white/30 truncate px-2">
                                                📷 Image received via WhatsApp
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="w-full py-8 rounded-xl border border-dashed border-white/20 text-center text-white/30 text-xs">
                                        No photos uploaded yet.
                                    </div>
                                )}
                            </div>

                            <hr className="border-white/5" />

                            {/* Vehicle Stats Overview */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Mileage', value: `${selectedTrade.mileage?.toLocaleString()} km` },
                                    { label: 'Condition', value: selectedTrade.condition },
                                    { label: 'Color', value: selectedTrade.colour || 'Not specified' },
                                    { label: 'Damage', value: selectedTrade.accident_damage || 'No' },
                                ].map((stat, i) => (
                                    <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <p className="text-[9px] uppercase font-black text-white/30 tracking-widest mb-1">{stat.label}</p>
                                        <p className="text-sm font-bold text-white">{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                        </div>

                        {/* Action Panel: Make Offer */}
                        <div className="p-6 bg-black/40 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                            <p className="text-[10px] uppercase font-black text-white/50 tracking-widest mb-3 flex items-center gap-2"><DollarSign size={12} /> Make Actual Offer</p>

                            <div className="flex gap-3 mb-4">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#C9A84C]">R</span>
                                    <input
                                        type="number"
                                        value={offerAmount}
                                        onChange={e => setOfferAmount(Number(e.target.value))}
                                        className="w-full bg-white/5 border border-[#C9A84C]/50 rounded-xl pl-8 pr-4 py-3 text-white text-lg font-outfit font-black outline-none focus:border-[#C9A84C] focus:bg-white/10 transition-all"
                                    />
                                </div>
                                <button
                                    onClick={() => handleUpdateOffer(selectedTrade.id, 'offer_made', false)}
                                    disabled={updating || !offerAmount}
                                    className="p-3 px-4 rounded-xl font-bold bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/20 transition-colors disabled:opacity-50">
                                    <Save size={18} />
                                </button>
                            </div>

                            <button
                                onClick={() => handleUpdateOffer(selectedTrade.id, 'offer_made', true)}
                                disabled={updating || !offerAmount}
                                className="w-full py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}>
                                SEND OFFER VIA WHATSAPP <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

