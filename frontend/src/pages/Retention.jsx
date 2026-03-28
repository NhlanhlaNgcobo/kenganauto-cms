import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Heart, Activity, TrendingUp, Users, Star, MessageSquare, ToggleLeft, ToggleRight,
    ChevronDown, ChevronUp, Bell, Gift, Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Retention() {
    const { user } = useAuth();
    const [view, setView] = useState('sequences'); // 'sequences', 'loyalty'
    const [sequences, setSequences] = useState([]);
    const [loyaltyData, setLoyaltyData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedSeq, setExpandedSeq] = useState(null);

    useEffect(() => {
        if (view === 'sequences') loadSequences();
        else loadLoyalty();
    }, [view]);

    const loadSequences = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/retention/sequences`);
            setSequences(res.data);
        } catch (e) { console.error('Error fetching sequences', e); }
        setLoading(false);
    };

    const loadLoyalty = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/retention/loyalty-nps`);
            setLoyaltyData(res.data);
        } catch (e) { console.error('Error fetching loyalty data', e); }
        setLoading(false);
    };

    const toggleSequence = async (id, activeStatus) => {
        try {
            const res = await axios.patch(`${API_URL}/api/retention/sequences/${id}/toggle`, { active: !activeStatus });
            setSequences(prev => prev.map(s => s.id === id ? res.data : s));
        } catch (err) { alert('Failed to toggle sequence'); }
    };

    return (
        <div className="flex flex-col h-screen bg-[#0A0F1E] text-white">
            <header className="px-8 py-5 flex items-center justify-between sticky top-0 z-10"
                style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl border border-red-500/20 text-red-400 bg-red-500/10">
                        <Heart size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-0.5" style={{ color: 'rgba(201,168,76,0.4)' }}>Module</p>
                        <h1 className="font-outfit font-black text-xl text-white">Customer Retention</h1>
                    </div>
                </div>

                <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                    <button onClick={() => setView('sequences')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'sequences' ? 'bg-[#C9A84C] text-[#0A0F1E]' : 'text-white/50 hover:text-white'}`}>Automation Sequences</button>
                    <button onClick={() => setView('loyalty')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'loyalty' ? 'bg-[#C9A84C] text-[#0A0F1E]' : 'text-white/50 hover:text-white'}`}>Loyalty & NPS</button>
                </div>
            </header>

            <div className="flex-1 overflow-auto p-8 relative">
                {view === 'sequences' && (
                    <div className="max-w-5xl mx-auto space-y-6">
                        <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/30 p-4 rounded-xl flex items-start gap-4 mb-8">
                            <Activity className="text-[#C9A84C] mt-1 shrink-0" size={20} />
                            <div>
                                <h3 className="font-bold text-[#C9A84C] mb-1">Automated Sequence Builder</h3>
                                <p className="text-sm text-white/60 leading-relaxed">Toggle standard dealership retention drip campaigns. These sequences automatically pull customer contact details from the CRM database and inject them seamlessly across pre-scheduled WhatsApp and Email nodes based on internal dataset triggers.</p>
                            </div>
                        </div>

                        {loading ? <p className="text-white/30 text-xs text-center">Loading Sequences...</p> : (
                            <div className="space-y-4">
                                {sequences.map(seq => (
                                    <div key={seq.id} className={`bg-white/5 border rounded-xl overflow-hidden transition-all ${seq.active ? 'border-[#C9A84C]/40' : 'border-white/10 opacity-70'}`}>
                                        <div className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/5" onClick={() => setExpandedSeq(expandedSeq === seq.id ? null : seq.id)}>
                                            <div className="flex items-center gap-4">
                                                <button onClick={(e) => { e.stopPropagation(); toggleSequence(seq.id, seq.active); }} className={`${seq.active ? 'text-green-400' : 'text-white/30'}`}>
                                                    {seq.active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                                </button>
                                                <div>
                                                    <h2 className="font-outfit font-black text-lg text-white mb-1">{seq.name}</h2>
                                                    <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest font-mono">Trigger: {seq.trigger_type}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-white/50">
                                                <div className="text-right mr-4">
                                                    <p className="text-sm font-bold text-white">{seq.steps?.length || 0}</p>
                                                    <p className="text-[10px] uppercase tracking-widest">Nodes</p>
                                                </div>
                                                {expandedSeq === seq.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>

                                        {expandedSeq === seq.id && (
                                            <div className="bg-black/40 p-6 border-t border-white/5">
                                                <h4 className="text-[10px] uppercase font-black text-white/40 tracking-widest mb-4 flex items-center gap-2"><Bell size={12} /> Sequence Flow map</h4>

                                                <div className="space-y-4 ml-2">
                                                    {seq.steps?.map((step, i) => (
                                                        <div key={i} className="flex gap-4 relative">
                                                            <div className="flex flex-col items-center">
                                                                <div className="w-8 h-8 rounded-full bg-[#0D1526] border-2 border-white/20 flex items-center justify-center font-bold text-xs text-white z-10">
                                                                    {i + 1}
                                                                </div>
                                                                {i < seq.steps.length - 1 && <div className="w-px h-full bg-white/10 absolute top-8 bottom-[-16px] z-0" />}
                                                            </div>
                                                            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 -mt-1 hover:border-[#C9A84C]/50 transition-colors">
                                                                <span className="inline-block px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase rounded mb-2 font-mono">
                                                                    {step.day < 0 ? `DAY ${step.day} (Before Trigger)` : `DAY ${step.day}`}
                                                                </span>
                                                                <p className="text-sm text-white/80"><span className="text-[#C9A84C]">Message:</span> "{step.message}"</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {view === 'loyalty' && loyaltyData && (
                    <div className="max-w-5xl mx-auto space-y-8">
                        {/* NPS Banner */}
                        <div className="grid grid-cols-3 gap-6">
                            <div className="col-span-1 bg-white/5 border border-green-500/30 rounded-2xl p-6 text-center shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><Star size={100} fill="currentColor" className="text-green-500" /></div>
                                <p className="text-[10px] uppercase font-black text-white/40 tracking-widest mb-2">Dealership NPS Score</p>
                                <p className="text-6xl font-black text-green-400 mb-1">{loyaltyData.nps_data?.average_score}</p>
                                <p className="text-xs text-green-400/60 font-bold">Outstanding Performance</p>
                                <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/50 text-left">
                                    <p className="mb-1 text-[#C9A84C] font-bold">Automated NPS Survey:</p>
                                    Fires exactly 5 days post-delivery. Scores 9-10 are implicitly prompted automatically mapping to your Dealership Google Review link.
                                </div>
                            </div>

                            <div className="col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-sm uppercase font-black tracking-widest mb-4 flex items-center gap-2"><MessageSquare size={16} className="text-[#C9A84C]" /> Recent NPS Feedback</h3>
                                <div className="space-y-3">
                                    {loyaltyData.nps_data?.scores.map((s, i) => (
                                        <div key={i} className="flex justify-between items-center bg-black/30 p-4 border border-white/5 rounded-xl">
                                            <div>
                                                <p className="font-bold text-white text-sm">{s.customer}</p>
                                                <p className="text-xs text-white/50 mt-1">"{s.comment}"</p>
                                            </div>
                                            <div className={`text-xl font-black ${s.score >= 9 ? 'text-green-400' : s.score >= 7 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {s.score}/10
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Loyalty System Overview */}
                        <div className="grid grid-cols-2 gap-6 pt-6">
                            <div>
                                <h3 className="text-sm uppercase font-black tracking-widest mb-4 flex items-center gap-2"><Award size={16} className="text-[#C9A84C]" /> Loyalty Point Generation</h3>
                                <div className="space-y-3">
                                    {loyaltyData.loyalty_points_awards?.map((award, i) => (
                                        <div key={i} className="flex justify-between items-center bg-white/5 p-4 border border-white/10 rounded-xl hover:bg-white/10 transition">
                                            <p className="font-bold text-sm text-white/80">{award.action}</p>
                                            <span className="px-3 py-1 bg-[#C9A84C]/10 text-[#C9A84C] rounded font-mono font-bold text-sm">+{award.points} pts</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm uppercase font-black tracking-widest mb-4 flex items-center gap-2"><Gift size={16} className="text-[#C9A84C]" /> Tier Benefits Tracker</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {loyaltyData.loyalty_tiers?.map((tier, i) => (
                                        <div key={i} className="bg-white/5 p-4 border border-white/10 rounded-xl">
                                            <div className="flex justify-between items-end mb-2">
                                                <p className="font-black text-lg text-white">{tier.tier}</p>
                                                <p className="text-[10px] font-mono text-white/40">{tier.threshold}</p>
                                            </div>
                                            <p className="text-xs text-[#C9A84C]">{tier.benefits}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
