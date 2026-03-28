import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Wrench, Calendar, ChevronLeft, ChevronRight, Activity, Clock, CheckCircle,
    User, AlertCircle, FileText, Send, X, Plus, Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATUS_STYLE = {
    'booked': { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/60' },
    'checked_in': { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    'in_progress': { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' },
    'awaiting_parts': { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
    'quality_check': { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
    'ready_for_collection': { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' },
    'completed': { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/30' },
};

function getWeekDays(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const start = new Date(d.setDate(diff));

    return Array.from({ length: 6 }).map((_, i) => { // Mon-Sat
        const current = new Date(start);
        current.setDate(start.getDate() + i);
        return current;
    });
}

function formatDate(dateString) { return dateString.split('T')[0]; }

export default function Service() {
    const { user } = useAuth();
    const [view, setView] = useState('calendar'); // 'calendar', 'advisor', 'analytics'
    const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

    const [bookings, setBookings] = useState([]);
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(true);

    const [selectedBooking, setSelectedBooking] = useState(null);
    const [jobCardForm, setJobCardForm] = useState(null);
    const [partsRequestMode, setPartsRequestMode] = useState(false);
    const [partsQuery, setPartsQuery] = useState('');

    useEffect(() => {
        if (view !== 'analytics') loadBookings();
        else loadAnalytics();
    }, [currentWeekStart, view]);

    const loadBookings = async () => {
        setLoading(true);
        const days = getWeekDays(currentWeekStart);
        try {
            const res = await axios.get(`${API_URL}/api/service/bookings`, {
                params: { start_date: formatDate(days[0].toISOString()), end_date: formatDate(days[5].toISOString()) }
            });
            setBookings(res.data);
        } catch (err) {
            console.error('Failed to load bookings');
        }
        setLoading(false);
    };

    const loadAnalytics = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/service/analytics`);
            setKpis(res.data);
        } catch { }
    };

    const updateStatus = async (id, status, extraData = {}) => {
        try {
            const res = await axios.patch(`${API_URL}/api/service/bookings/${id}`, { status, ...extraData });
            setBookings(prev => prev.map(b => b.id === id ? res.data.booking : b));
            if (selectedBooking && selectedBooking.id === id) {
                setSelectedBooking(res.data.booking);
            }
        } catch (err) { alert('Failed update'); }
    };

    const handleJobCardSubmit = async (e) => {
        e.preventDefault();
        await updateStatus(selectedBooking.id, 'checked_in', {
            description: jobCardForm.notes,
            invoice_amount: jobCardForm.invoice
        });
        setSelectedBooking(null);
    };

    const handlePartRequest = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/api/parts/enquiries`, {
                is_internal: true,
                job_card_number: selectedBooking.job_card_number,
                vehicle_make: selectedBooking.vehicle_make,
                vehicle_model: selectedBooking.vehicle_model,
                part_name: partsQuery,
                quantity: 1
            });
            alert('Parts Requested successfully! Parts Manager notified.');
            setPartsRequestMode(false);
            setPartsQuery('');
            updateStatus(selectedBooking.id, 'awaiting_parts');
        } catch (err) { alert('Failed to request part'); }
    };

    const weekDays = getWeekDays(currentWeekStart);

    return (
        <div className="flex flex-col h-screen bg-[#0A0F1E] text-white">
            <header className="px-8 py-5 flex items-center justify-between sticky top-0 z-10"
                style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                        <Wrench size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-0.5" style={{ color: 'rgba(201,168,76,0.4)' }}>Module</p>
                        <h1 className="font-outfit font-black text-xl text-white">Service Department</h1>
                    </div>
                </div>

                <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                    <button onClick={() => setView('calendar')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'calendar' ? 'bg-[#C9A84C] text-[#0A0F1E]' : 'text-white/50 hover:text-white'}`}>Workshop Calendar</button>
                    <button onClick={() => setView('advisor')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'advisor' ? 'bg-[#C9A84C] text-[#0A0F1E]' : 'text-white/50 hover:text-white'}`}>My Jobs (Advisor)</button>
                    {user?.role === 'admin' && (
                        <button onClick={() => setView('analytics')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'analytics' ? 'bg-[#C9A84C] text-[#0A0F1E]' : 'text-white/50 hover:text-white'}`}>KPI Analytics</button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-auto p-8 relative">
                {view === 'calendar' && (
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-outfit font-black">Calendar View</h2>
                            <div className="flex items-center gap-4">
                                <button onClick={() => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d); }} className="p-2 hover:bg-white/10 rounded-full transition"><ChevronLeft size={18} /></button>
                                <span className="text-sm font-bold text-[#C9A84C]">{formatDate(weekDays[0].toISOString())} — {formatDate(weekDays[5].toISOString())}</span>
                                <button onClick={() => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d); }} className="p-2 hover:bg-white/10 rounded-full transition"><ChevronRight size={18} /></button>
                            </div>
                        </div>

                        {loading ? <div className="text-center text-white/30 text-xs">Loading calendar...</div> : (
                            <div className="grid grid-cols-6 gap-4 h-full">
                                {weekDays.map(day => {
                                    const dateStr = formatDate(day.toISOString());
                                    const dayBookings = bookings.filter(b => b.booking_date === dateStr);

                                    return (
                                        <div key={dateStr} className="bg-white/5 border border-white/5 rounded-2xl p-4 overflow-y-auto flex flex-col">
                                            <div className="text-center mb-4 pb-3 border-b border-white/10">
                                                <p className="text-[10px] uppercase font-black tracking-widest text-[#C9A84C]">{day.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                                                <p className="text-lg font-bold">{day.getDate()}</p>
                                            </div>

                                            <div className="flex-1 space-y-3">
                                                {dayBookings.map(b => (
                                                    <div key={b.id} onClick={() => setSelectedBooking(b)}
                                                        className={`p-3 rounded-xl border cursor-pointer hover:scale-[1.02] transition-transform ${STATUS_STYLE[b.status]?.bg} ${STATUS_STYLE[b.status]?.border}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-xs font-bold font-mono text-white">{b.booking_time}</span>
                                                            <span className={`text-[8px] font-black uppercase ${STATUS_STYLE[b.status]?.text}`}>{b.status.replace(/_/g, ' ')}</span>
                                                        </div>
                                                        <p className="text-xs font-black text-white">{b.vehicle_registration}</p>
                                                        <p className="text-[10px] text-white/60 truncate">{b.vehicle_make} {b.vehicle_model}</p>
                                                    </div>
                                                ))}
                                                {dayBookings.length === 0 && <p className="text-center text-[10px] text-white/20 uppercase mt-4">No bookings</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {view === 'advisor' && (
                    <div>
                        <h2 className="text-lg font-outfit font-black mb-6">Service Advisor Pipeline</h2>
                        <div className="grid grid-cols-4 gap-6">
                            {['booked', 'checked_in', 'in_progress', 'awaiting_parts', 'quality_check', 'ready_for_collection', 'completed'].map(status => (
                                <div key={status} className="bg-white/5 border border-white/5 rounded-2xl p-4 h-[600px] overflow-y-auto">
                                    <h3 className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-4 sticky top-0 bg-[#0F162A] py-2">{status.replace(/_/g, ' ')}</h3>
                                    <div className="space-y-3">
                                        {bookings.filter(b => b.status === status).map(b => (
                                            <div key={b.id} onClick={() => setSelectedBooking(b)} className="bg-black/30 p-4 rounded-xl border border-white/5 cursor-pointer hover:border-[#C9A84C]/50 transition-colors">
                                                <p className="text-xs font-mono font-bold text-[#C9A84C] mb-1">{b.job_card_number || 'Pending JC'}</p>
                                                <p className="text-sm font-black text-white">{b.customer_name}</p>
                                                <p className="text-[10px] text-white/50 mb-3">{b.vehicle_registration}</p>
                                                <span className="px-2 py-0.5 bg-white/5 rounded text-[8px] uppercase tracking-widest text-white/40">{b.service_type}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'analytics' && kpis && (
                    <div className="max-w-5xl mx-auto space-y-6">
                        <h2 className="text-lg font-outfit font-black mb-2">Service Department KPIs (This Month)</h2>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <p className="text-[10px] uppercase text-white/40 font-bold mb-2">Total Bookings</p>
                                <p className="text-3xl font-black text-[#C9A84C]">{kpis.total_bookings}</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <p className="text-[10px] uppercase text-white/40 font-bold mb-2">Revenue</p>
                                <p className="text-3xl font-black text-green-400">R {kpis.revenue_this_month.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <p className="text-[10px] uppercase text-white/40 font-bold mb-2">Avg Job Value</p>
                                <p className="text-3xl font-black text-white">R {kpis.average_job_value.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <p className="text-[10px] uppercase text-white/40 font-bold mb-2">No-Show Rate</p>
                                <p className="text-3xl font-black text-red-400">{kpis.no_show_rate}%</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mt-6">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 h-64">
                                <h3 className="text-xs uppercase font-bold text-white/50 mb-4">Most Common Service Types</h3>
                                <div className="space-y-4">
                                    {kpis.common_services.map((s, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm">
                                            <span className="capitalize">{s.name}</span>
                                            <span className="font-mono text-[#C9A84C]">{s.count} jobs</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Slide-Over: Job Card Edit ── */}
            {selectedBooking && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
                    <div className="w-[450px] h-full shadow-2xl overflow-y-auto anim-slide-left p-6"
                        style={{ background: '#0D1526', borderLeft: '1px solid rgba(201,168,76,0.15)' }}>
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                            <div>
                                <h2 className="font-outfit font-black text-xl">Job Card</h2>
                                <p className="text-xs text-[#C9A84C] font-mono">{selectedBooking.job_card_number || 'New Booking'}</p>
                            </div>
                            <button onClick={() => setSelectedBooking(null)} className="p-2 text-white/50 hover:bg-white/10 rounded-full"><X size={20} /></button>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-[10px] uppercase font-black text-white/40 mb-2">Vehicle Details</h3>
                            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                <p className="font-black text-lg text-white mb-1">{selectedBooking.vehicle_registration}</p>
                                <p className="text-sm text-white/60 mb-3">{selectedBooking.vehicle_make} {selectedBooking.vehicle_model}</p>
                                <div className="text-xs space-y-1">
                                    <p className="flex justify-between"><span className="text-white/40">Customer</span> <span>{selectedBooking.customer_name}</span></p>
                                    <p className="flex justify-between"><span className="text-white/40">Phone</span> <span>{selectedBooking.customer_phone || '-'}</span></p>
                                    <p className="flex justify-between"><span className="text-white/40">Type</span> <span className="uppercase text-[#C9A84C] font-bold">{selectedBooking.service_type}</span></p>
                                </div>
                            </div>
                        </div>

                        {!selectedBooking.job_card_number ? (
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                handleJobCardSubmit(e);
                            }} className="space-y-4 border-t border-white/10 pt-4">
                                <p className="text-xs font-bold text-white">Create Digital Job Card (Check-in)</p>
                                <div><label className="text-[10px] uppercase text-white/40 mb-1 block">In Mileage</label>
                                    <input required type="number" onChange={e => setJobCardForm({ ...jobCardForm, mileage: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm" /></div>
                                <div><label className="text-[10px] uppercase text-white/40 mb-1 block">Fuel Level & Damage Notes</label>
                                    <textarea required rows="2" onChange={e => setJobCardForm({ ...jobCardForm, notes: e.target.value })} className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm" /></div>
                                <button type="submit" className="w-full py-4 mt-4 rounded-xl font-bold text-xs bg-[#C9A84C] text-[#0A0F1E]">CHECK IN VEHICLE</button>
                            </form>
                        ) : (
                            <div className="space-y-6 border-t border-white/10 pt-4">
                                <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-3">Update Status</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.keys(STATUS_STYLE).slice(1).map(status => (
                                            <button key={status} onClick={() => updateStatus(selectedBooking.id, status)}
                                                className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all 
                                                ${selectedBooking.status === status ? STATUS_STYLE[status].bg + ' ' + STATUS_STYLE[status].border + ' ' + STATUS_STYLE[status].text : 'border-white/10 text-white/40 hover:bg-white/5'}
                                                `}>
                                                {status.replace(/_/g, ' ')}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-white/30 mt-2">* Selecting 'Ready for Collection' auto-sends a WhatsApp to customer.</p>
                                </div>

                                <div className="border border-white/10 p-4 rounded-xl flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] uppercase font-black tracking-widest text-[#C9A84C] mb-1">Need Parts?</p>
                                        <p className="text-xs text-white/60">Request parts directly from warehouse</p>
                                    </div>
                                    <button onClick={() => setPartsRequestMode(!partsRequestMode)} className="p-2 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-xl">
                                        <Package size={20} />
                                    </button>
                                </div>

                                {partsRequestMode && (
                                    <form onSubmit={handlePartRequest} className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl anim-fade-up">
                                        <label className="text-[10px] uppercase text-orange-400 font-bold block mb-2">Part Name / Ref</label>
                                        <input required type="text" value={partsQuery} onChange={e => setPartsQuery(e.target.value)} placeholder="e.g. Brake pads"
                                            className="w-full bg-black/40 border border-white/10 p-3 rounded-xl mb-3 outline-none focus:border-orange-400 text-sm" />
                                        <button type="submit" className="w-full p-3 bg-orange-400 text-black font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-orange-500 transition-colors">
                                            SEND REQUEST TO WORKSHOP
                                        </button>
                                    </form>
                                )}

                                <div className="border border-white/10 p-4 rounded-xl">
                                    <label className="text-[10px] uppercase font-black text-white/40 mb-2 block">Invoice Amount (ZAR)</label>
                                    <input type="number" defaultValue={selectedBooking.invoice_amount || 0} onBlur={e => updateStatus(selectedBooking.id, selectedBooking.status, { invoice_amount: Number(e.target.value) })}
                                        className="w-full text-xl font-mono font-black border-b border-dashed border-white/20 bg-transparent text-white outline-none focus:border-[#C9A84C]" />
                                </div>
                            </div>

                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
