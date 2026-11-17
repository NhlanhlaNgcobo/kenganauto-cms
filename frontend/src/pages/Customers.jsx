import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, Search, Tag as TagIcon, CreditCard, X, Car, Calendar, Star, CheckCircle, Wrench
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getTierStyle(points) {
    if (points >= 1000) return 'text-[#E5E4E2] bg-gradient-to-r from-gray-300 to-gray-400';
    if (points >= 500) return 'text-yellow-600 bg-gradient-to-r from-yellow-300 to-yellow-500';
    if (points >= 200) return 'text-gray-300 bg-gradient-to-r from-gray-400 to-gray-500';
    return 'text-orange-400 bg-gradient-to-r from-orange-300 to-orange-500'; // bronze fallback
}
function getTierName(points) {
    if (points >= 1000) return 'Platinum';
    if (points >= 500) return 'Gold';
    if (points >= 200) return 'Silver';
    return 'Bronze';
}

export default function Customers() {
    useAuth();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [newTagVal, setNewTagVal] = useState('');

    async function loadCustomers() {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/customers`, { params: { q: searchQuery } });
            setCustomers(res.data);
        } catch (e) { console.error('Error fetching customers', e); }
        setLoading(false);
    }

    useEffect(() => { loadCustomers(); }, [searchQuery]);

    const addTag = async (e) => {
        if (e.key === 'Enter' && newTagVal.trim() && selectedCustomer) {
            e.preventDefault();
            const tagStr = newTagVal.trim();
            const currentTags = selectedCustomer.tags || [];
            if (currentTags.includes(tagStr)) { setNewTagVal(''); return; }

            const newTags = [...currentTags, tagStr];
            try {
                const res = await axios.patch(`${API_URL}/api/customers/${selectedCustomer.id}/tags`, { tags: newTags });
                setSelectedCustomer(res.data);
                // Background update list
                setCustomers(prev => prev.map(c => c.id === res.data.id ? res.data : c));
            } catch { alert('Failed to add tag'); }
            setNewTagVal('');
        }
    };

    const removeTag = async (tagToRemove) => {
        if (!selectedCustomer) return;
        const newTags = selectedCustomer.tags.filter(t => t !== tagToRemove);
        try {
            const res = await axios.patch(`${API_URL}/api/customers/${selectedCustomer.id}/tags`, { tags: newTags });
            setSelectedCustomer(res.data);
            setCustomers(prev => prev.map(c => c.id === res.data.id ? res.data : c));
        } catch { alert('Failed to remove tag'); }
    };

    return (
        <div className="flex flex-col h-screen bg-[#0A0F1E] text-white">
            <header className="px-8 py-5 flex items-center justify-between sticky top-0 z-10"
                style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[#C9A84C]">
                        <Users size={20} />
                    </div>
                    <div>
                        <h1 className="font-outfit font-black text-xl text-white">Customer Database</h1>
                    </div>
                </div>

                <div className="relative w-72">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/58" />
                    <input type="text" placeholder="Search by name, phone, or vehicle..."
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs focus:border-[#C9A84C] outline-none text-white transition-all" />
                </div>
            </header>

            <div className="flex-1 overflow-auto p-8 relative">
                {loading ? <p className="text-white/58 text-xs text-center mt-10">Loading database...</p> : (
                    <div className="grid grid-cols-1 gap-4">
                        {customers.map(c => (
                            <div key={c.id} onClick={() => setSelectedCustomer(c)}
                                className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-4 w-1/3">
                                    <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] flex items-center justify-center font-bold text-sm">
                                        {c.first_name[0]}{c.last_name[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{c.first_name} {c.last_name}</p>
                                        <p className="text-[12px] text-white/58">{c.phone}</p>
                                    </div>
                                </div>
                                <div className="w-1/4 text-xs text-white/66">
                                    <p className="font-bold text-white mb-0.5">{c.vehicle_owned_make} {c.vehicle_owned_model}</p>
                                    <p className="text-[12px]">Purchased: {new Date(c.purchase_date).toLocaleDateString()}</p>
                                </div>
                                <div className="w-1/4 flex gap-2 flex-wrap">
                                    {c.tags?.map((t, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded text-[11px] font-bold uppercase border border-white/10 text-white/66 bg-black/20">{t}</span>
                                    ))}
                                </div>
                                <div className="w-1/6 text-right">
                                    <p className="text-[11px] uppercase font-black tracking-widest text-[#C9A84C]">{getTierName(c.loyalty_points)} Tier</p>
                                    <p className="text-[12px] text-white/58 mt-1">NPS: {c.nps_score ? <span className="font-bold text-green-400">{c.nps_score}/10</span> : '-'}</p>
                                </div>
                            </div>
                        ))}
                        {customers.length === 0 && <p className="text-center text-white/58 text-xs">No customers matched your query.</p>}
                    </div>
                )}
            </div>

            {/* ── Slide-Over: Customer Profile ── */}
            {selectedCustomer && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
                    <div className="w-[550px] h-full shadow-2xl overflow-y-auto anim-slide-left"
                        style={{ background: '#0D1526', borderLeft: '1px solid rgba(201,168,76,0.15)' }}>
                        <div className="p-6 border-b border-white/5 flex justify-between items-start sticky top-0 bg-[#0D1526] z-10">
                            <div className="flex gap-4 items-center">
                                <div className="w-16 h-16 rounded-full bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/30 flex items-center justify-center font-black text-xl">
                                    {selectedCustomer.first_name[0]}{selectedCustomer.last_name[0]}
                                </div>
                                <div>
                                    <h2 className="font-outfit font-black text-2xl">{selectedCustomer.first_name} {selectedCustomer.last_name}</h2>
                                    <div className="flex items-center gap-3 text-xs text-white/66 mt-1">
                                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase shadow-sm ${getTierStyle(selectedCustomer.loyalty_points)}`}>
                                            {getTierName(selectedCustomer.loyalty_points)} Tier
                                        </span>
                                        <span>{selectedCustomer.loyalty_points} Points</span>
                                        {selectedCustomer.nps_score && (
                                            <span className="flex items-center font-bold text-green-400 gap-1"><Star size={10} fill="currentColor" /> NPS {selectedCustomer.nps_score}/10</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} className="p-2 text-white/58 hover:bg-white/10 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-8">
                            {/* Contact Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <p className="text-[11px] uppercase font-bold text-white/58 mb-1">Email</p>
                                    <p className="text-sm font-bold truncate">{selectedCustomer.email || 'N/A'}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <p className="text-[11px] uppercase font-bold text-white/58 mb-1">Phone / WhatsApp</p>
                                    <p className="text-sm font-bold truncate">{selectedCustomer.phone || selectedCustomer.whatsapp_number}</p>
                                </div>
                            </div>

                            {/* Tags Configuration */}
                            <div>
                                <h3 className="text-xs uppercase font-black text-white/58 tracking-widest mb-3 flex items-center gap-2"><TagIcon size={14} /> Segmentation Tags</h3>
                                <div className="flex flex-wrap gap-2 items-center">
                                    {selectedCustomer.tags?.map((t, i) => (
                                        <div key={i} className="flex flex-wrap items-center bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] px-2.5 py-1 rounded text-xs font-bold gap-2">
                                            {t}
                                            <button onClick={() => removeTag(t)} className="hover:text-white transition-colors"><X size={10} /></button>
                                        </div>
                                    ))}
                                    <input type="text" placeholder="Type tag and press Enter..." value={newTagVal}
                                        onChange={e => setNewTagVal(e.target.value)} onKeyDown={addTag}
                                        className="bg-transparent border border-dashed border-white/20 text-xs p-1.5 rounded outline-none focus:border-white/50 text-white w-48" />
                                </div>
                            </div>

                            {/* Current Vehicle */}
                            {selectedCustomer.vehicle_owned_make && (
                                <div>
                                    <h3 className="text-xs uppercase font-black text-white/58 tracking-widest mb-3 flex items-center gap-2"><Car size={14} /> Vehicle Ownership</h3>
                                    <div className="bg-gradient-to-r from-white/5 to-transparent border-l-2 border-[#C9A84C] p-4 rounded-r-xl relative overflow-hidden">
                                        <Car size={100} className="absolute right-0 bottom-0 text-white/5 opacity-50 transform translate-x-4" />
                                        <p className="font-outfit font-black text-lg mb-1">{selectedCustomer.vehicle_owned_year} {selectedCustomer.vehicle_owned_make} {selectedCustomer.vehicle_owned_model}</p>
                                        <div className="flex gap-4 text-xs font-mono text-white/58 mt-2">
                                            <p>REG: <span className="text-white">{selectedCustomer.registration}</span></p>
                                            <p>VIN: <span className="text-white">{selectedCustomer.vin}</span></p>
                                        </div>
                                        <p className="text-[11px] uppercase text-white/58 font-bold mt-4">Delivered: {new Date(selectedCustomer.purchase_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )}

                            {/* Interaction Timeline */}
                            <div>
                                <h3 className="text-xs uppercase font-black text-white/58 tracking-widest mb-4 flex items-center gap-2"><Calendar size={14} /> Timeline History</h3>
                                <div className="border-l border-white/10 ml-4 space-y-6">
                                    {/* Mocking generic unified timeline structure */}
                                    <div className="relative pl-6">
                                        <div className="absolute left-[-11px] top-0.5 bg-green-500 rounded-full p-1 border-2 border-[#0D1526] text-[#0D1526]"><CheckCircle size={12} /></div>
                                        <p className="text-[12px] text-white/58 font-bold mb-0.5">Today</p>
                                        <p className="text-sm font-bold text-white">Triggered Automated NPS Survey via WhatsApp</p>
                                    </div>
                                    <div className="relative pl-6">
                                        <div className="absolute left-[-11px] top-0.5 bg-blue-500 rounded-full p-1 border-2 border-[#0D1526] text-[#0D1526]"><Wrench size={12} /></div>
                                        <p className="text-[12px] text-white/58 font-bold mb-0.5">14 Feb 2026</p>
                                        <p className="text-sm font-bold text-white">Completed Minor Service (15,000km)</p>
                                    </div>
                                    <div className="relative pl-6">
                                        <div className="absolute left-[-11px] top-0.5 bg-[#C9A84C] rounded-full p-1 border-2 border-[#0D1526] text-[#0D1526]"><CreditCard size={12} /></div>
                                        <p className="text-[12px] text-white/58 font-bold mb-0.5">20 Jan 2025</p>
                                        <p className="text-sm font-bold text-white">Deal Delivered. Vehicle Sold!</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
