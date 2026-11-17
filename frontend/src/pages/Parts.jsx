import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Settings, CheckCircle, FileText, Upload, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const STATUS_STYLE = {
    'enquiry': { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/66' },
    'quoted': { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' },
    'ordered': { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    'ready': { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' },
    'collected': { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/58' },
};

export default function Parts() {
    const { user } = useAuth();
    const [view, setView] = useState('enquiries'); // 'enquiries', 'catalog', 'analytics'
    const [enquiries, setEnquiries] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    const [selectedEnquiry, setSelectedEnquiry] = useState(null);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const fileRef = useRef(null);

    async function loadEnquiries() {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/parts/enquiries`);
            setEnquiries(res.data);
        } catch (_err) { console.error(_err); }
        setLoading(false);
    }

    async function loadCatalog() {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/parts/catalog`);
            setCatalog(res.data);
        } catch { setCatalog([]); }
        setLoading(false);
    }

    async function loadAnalytics() {
        try {
            const res = await axios.get(`${API_URL}/api/parts/analytics`);
            setAnalytics(res.data);
        } catch { setAnalytics(null); }
    }

    useEffect(() => {
        if (view === 'enquiries') loadEnquiries();
        else if (view === 'catalog') loadCatalog();
        else if (view === 'analytics') loadAnalytics();
    }, [view]);

    const updateStatus = async (id, status, extraData = {}) => {
        try {
            const res = await axios.patch(`${API_URL}/api/parts/enquiries/${id}`, { status, ...extraData });
            setEnquiries(prev => prev.map(e => e.id === id ? res.data.enquiry : e));
            setSelectedEnquiry(null);
        } catch { alert('Update failed'); }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target?.result;
            const rows = text.split('\\n');
            const parsed = [];
            for (let i = 1; i < rows.length; i++) {
                if (!rows[i].trim()) continue;
                const cols = rows[i].split(',').map(c => c.trim().replace(/"/g, ''));
                parsed.push({
                    part_number: cols[0],
                    description: cols[1],
                    fitment: cols[2],
                    price: Number(cols[3]),
                    stock: Number(cols[4])
                });
            }
            try {
                await axios.post(`${API_URL}/api/parts/catalog/bulk`, { parts: parsed });
                setIsBulkOpen(false);
                loadCatalog();
            } catch { alert('Upload failed. Check format.'); }
        };
        reader.readAsText(file);
    };

    const renderQuotePanel = () => {
        if (!selectedEnquiry) return null;
        return (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
                <div className="w-[450px] h-full shadow-2xl overflow-y-auto p-6 flex flex-col anim-slide-left"
                    style={{ background: '#0D1526', borderLeft: '1px solid rgba(201,168,76,0.15)' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-outfit font-black text-xl">Manage Enquiry</h2>
                        <button onClick={() => setSelectedEnquiry(null)} className="p-2 text-white/58 hover:text-white rounded-full"><X size={20} /></button>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                        <p className="text-[11px] uppercase font-bold text-white/58 mb-3 tracking-widest">Request Details</p>
                        <p className="font-bold text-lg text-white mb-1">{selectedEnquiry.vehicle_make} {selectedEnquiry.vehicle_model}</p>
                        <div className="flex justify-between items-end border-b border-white/10 pb-3 mb-3">
                            <p className="text-sm font-black text-[#C9A84C]">{selectedEnquiry.part_name}</p>
                            <p className="text-xs text-white/58 font-mono">PN: {selectedEnquiry.part_number || 'Unknown'}</p>
                        </div>
                        <p className="flex justify-between text-xs"><span className="text-white/58">Customer</span> <span className="font-bold">{selectedEnquiry.customer_name}</span></p>
                        {selectedEnquiry.customer_phone && <p className="flex justify-between text-xs mt-1"><span className="text-white/58">Phone</span> <span>{selectedEnquiry.customer_phone}</span></p>}
                    </div>

                    <div className="flex-1 space-y-4">
                        <p className="text-[11px] uppercase font-bold text-white/58 tracking-widest mb-2">Update Stage</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => updateStatus(selectedEnquiry.id, 'quoted')} className="p-3 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/5 text-orange-400">Mark Quoted</button>
                            <button onClick={() => updateStatus(selectedEnquiry.id, 'ordered')} className="p-3 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/5 text-blue-400">Mark Ordered</button>
                            <button onClick={() => updateStatus(selectedEnquiry.id, 'ready')} className="p-3 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/5 text-green-400 col-span-2">Mark Ready for Collection</button>
                            <button onClick={() => updateStatus(selectedEnquiry.id, 'collected')} className="p-3 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/5 text-white/58 col-span-2">Mark Collected</button>
                        </div>
                        <p className="text-[12px] text-white/58 text-center mt-2">* 'Ready for Collection' auto-notifies the customer via WhatsApp.</p>
                    </div>

                    <div className="mt-8 border-t border-white/10 pt-4">
                        <label className="text-[11px] uppercase font-black text-white/58 block mb-2">Price Estimate (ZAR)</label>
                        <input type="number" defaultValue={selectedEnquiry.price_quoted || ''} placeholder="0.00"
                            onBlur={e => updateStatus(selectedEnquiry.id, selectedEnquiry.status, { price_quoted: Number(e.target.value) })}
                            className="w-full text-xl font-black bg-transparent border-b border-white/20 outline-none pb-2 focus:border-[#C9A84C]" />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen bg-[#0A0F1E] text-white">
            <header className="px-8 py-5 flex items-center justify-between sticky top-0 z-10"
                style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        <Settings size={20} />
                    </div>
                    <div>
                        <h1 className="font-outfit font-black text-xl text-white">Parts Department</h1>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setView('enquiries')} className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${view === 'enquiries' ? 'bg-[#C9A84C] text-[#0A0F1E]' : 'hover:bg-white/5 border border-white/10'}`}>Enquiries Pipeline</button>
                    <button onClick={() => setView('catalog')} className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${view === 'catalog' ? 'bg-[#C9A84C] text-[#0A0F1E]' : 'hover:bg-white/5 border border-white/10'}`}>Parts Database</button>
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                        <button onClick={() => setView('analytics')} className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${view === 'analytics' ? 'bg-[#C9A84C] text-[#0A0F1E]' : 'hover:bg-white/5 border border-white/10'}`}>Revenue Tracker</button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-auto p-8 relative">
                {view === 'enquiries' && (
                    <div className="grid grid-cols-4 gap-6 h-full">
                        {['enquiry', 'quoted', 'ordered', 'ready'].map(status => (
                            <div key={status} className="bg-white/5 border border-white/5 rounded-2xl p-4 overflow-y-auto">
                                <h2 className="text-[11px] uppercase font-black tracking-widest text-white/58 mb-4 sticky top-0 bg-[#0F162A] py-2">
                                    {status.replace(/_/g, ' ')}
                                </h2>
                                <div className="space-y-3">
                                    {enquiries.filter(e => e.status === status).map(e => (
                                        <div key={e.id} onClick={() => setSelectedEnquiry(e)}
                                            className={`bg-black/40 p-4 rounded-xl border border-white/5 cursor-pointer hover:scale-[1.02] transition-transform ${e.customer_name.startsWith('INTERNAL') ? 'border-orange-500/30 bg-orange-500/5' : ''}`}>
                                            {e.customer_name.startsWith('INTERNAL') && <span className="text-[11px] font-black uppercase bg-orange-500 text-white px-2 py-0.5 rounded mb-2 inline-block">WORKSHOP REQUEST</span>}
                                            <p className="text-sm font-black text-[#C9A84C]">{e.part_name}</p>
                                            <p className="text-[12px] text-white/66 mb-2">{e.vehicle_make} {e.vehicle_model}</p>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold">{e.customer_name.replace('INTERNAL: ', '')}</span>
                                                {e.price_quoted && <span className="font-mono text-white/58">R{e.price_quoted}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {view === 'catalog' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-outfit font-black">Stock Catalogue</h2>
                            <button onClick={() => setIsBulkOpen(true)} className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl flex items-center gap-2">
                                <Upload size={14} /> CSV Upload
                            </button>
                        </div>

                        {loading ? <p className="text-white/58 text-xs text-center mt-10">Loading catalog...</p> : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[11px] uppercase tracking-widest text-white/58 border-b border-white/5">
                                        <th className="pb-3 font-black">Part Number</th>
                                        <th className="pb-3 font-black">Description & Fitment</th>
                                        <th className="pb-3 font-black text-right">Price (ZAR)</th>
                                        <th className="pb-3 font-black text-center">Stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {catalog.map((p, i) => (
                                        <tr key={i} className="border-b border-white/5 group hover:bg-white/5">
                                            <td className="py-4 font-mono text-xs text-[#C9A84C] font-bold">{p.part_number}</td>
                                            <td className="py-4">
                                                <p className="text-sm font-bold text-white">{p.description}</p>
                                                <p className="text-[12px] text-white/58">{p.fitment}</p>
                                            </td>
                                            <td className="py-4 text-right font-black">R{p.price.toLocaleString()}</td>
                                            <td className="py-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-[12px] font-bold ${p.stock > 0 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                    {p.stock} units
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {view === 'analytics' && analytics && (
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="grid grid-cols-3 gap-6">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <p className="text-[11px] uppercase tracking-widest text-white/58 font-bold mb-2">Total Monthly Revenue (Collected)</p>
                                <p className="text-3xl font-black text-green-400">R {analytics.revenue_this_month.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <p className="text-[11px] uppercase tracking-widest text-white/58 font-bold mb-2">Pending Orders Value</p>
                                <p className="text-3xl font-black text-orange-400">R {analytics.pending_orders_value.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 relative overflow-hidden">
                                <p className="text-[11px] uppercase tracking-widest text-white/58 font-bold mb-2">Collection Rate</p>
                                <p className="text-3xl font-black text-white">{analytics.collection_rate}%</p>
                                <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle size={80} /></div>
                            </div>
                        </div>

                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-white/58 mb-6">Top-Selling Parts</h2>
                            <div className="space-y-4">
                                {analytics.top_selling_parts.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-white/5">
                                        <p className="font-bold">{p.name}</p>
                                        <span className="font-mono text-[#C9A84C] font-black">{p.count} sold</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {renderQuotePanel()}

            {/* ── Modal: Bulk Import ── */}
            {isBulkOpen && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center anim-fade-up">
                    <div className="bg-[#0D1526] border border-white/10 p-8 rounded-2xl shadow-2xl w-[500px] relative text-center">
                        <button onClick={() => setIsBulkOpen(false)} className="absolute top-4 right-4 p-2 text-white/58 hover:bg-white/10 rounded-full"><X size={20} /></button>
                        <Upload size={30} className="mx-auto text-blue-400 mb-4" />
                        <h2 className="font-outfit font-black text-xl mb-2">Upload Parts CSV</h2>
                        <p className="text-xs text-white/58 mb-6">Upload an excel or comma separated file with columns:<br /> <code>Part Number, Description, Fitment, Price, Stock</code></p>

                        <div className="border border-dashed border-white/20 rounded-xl p-8 hover:bg-white/5 transition-colors cursor-pointer"
                            onClick={() => fileRef.current?.click()}>
                            <input type="file" accept=".csv" ref={fileRef} onChange={handleFileUpload} className="hidden" />
                            <FileText size={24} className="mx-auto text-white/58 mb-3" />
                            <p className="text-sm font-bold text-white">Click to select CSV</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
