import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Package, Search, Plus, Eye, CheckCircle, Tag,
    Clock, ShieldAlert, Download, Upload, FileText, ChevronRight, X, Image as ImageIcon
} from 'lucide-react';
import { SkeletonTable } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import ShowroomTools from '../components/ShowroomTools';
import { authHeaders } from '../utils/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// images arrive as an array (Objection JSON attribute) or a JSON string (raw/mock rows)
function firstImage(v) {
    if (!v?.images) return null;
    if (Array.isArray(v.images)) return v.images[0] || null;
    try { const a = JSON.parse(v.images); return Array.isArray(a) ? a[0] || null : null; } catch { return null; }
}

const STATUS_STYLE = {
    'available': { bg: 'rgba(34,197,94,0.1)', text: '#4ADE80', border: 'rgba(34,197,94,0.2)' },
    'reserved': { bg: 'rgba(251,146,60,0.1)', text: '#FB923C', border: 'rgba(251,146,60,0.2)' },
    'sold': { bg: 'rgba(240,237,232,0.1)', text: 'rgba(240,237,232,0.5)', border: 'rgba(240,237,232,0.1)' }
};

const DAYS_COLOR = (days) => {
    if (days <= 30) return '#4ADE80'; // Green
    if (days <= 60) return '#FB923C'; // Yellow
    return '#EF4444'; // Red
};

export default function Stock() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('available');
    const [showCost, setShowCost] = useState(false);
    const [showAged, setShowAged] = useState(false);

    // Modal state
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [viewVehicle, setViewVehicle] = useState(null);

    // Add Form State
    const [formData, setFormData] = useState({
        make: '', model: '', year: 2024, variant: '', colour: '', condition: 'used',
        mileage: 0, price: '', cost_price: '', stock_number: '', vin: '', description: ''
    });

    // Bulk Import State
    const [csvPreview, setCsvPreview] = useState([]);
    const [importing, setImporting] = useState(false);
    const fileRef = useRef(null);

    async function loadStock() {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/stock`, {
                params: { status: statusFilter, aged: showAged }, headers: authHeaders()
            });
            setVehicles(res.data);
        } catch {
            console.error('Failed to fetch stock');
        }
        setLoading(false);
    }

    useEffect(() => { loadStock(); }, [statusFilter, showAged]);

    const handleUpdateStatus = async (id, status) => {
        try {
            await axios.patch(`${API_URL}/api/stock/${id}`, { status }, { headers: authHeaders() });
            // remove or update locally
            setVehicles(prev => prev.map(v => v.id === id ? { ...v, status } : v));
            // if we are filtering, maybe remove it
            if (statusFilter !== 'all' && statusFilter !== status) {
                setVehicles(prev => prev.filter(v => v.id !== id));
            }
        } catch {
            alert('Failed to update status');
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/api/stock`, formData, { headers: authHeaders() });
            if (statusFilter === 'all' || statusFilter === 'available') {
                setVehicles([res.data.vehicle, ...vehicles]);
            }
            setIsAddOpen(false);
        } catch {
            alert('Error adding vehicle. Make sure all required fields are filled.');
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const rows = text.split('\\n');
            const headers = rows[0].split(',').map(h => h.trim().toLowerCase());

            const parsed = [];
            for (let i = 1; i < rows.length; i++) {
                if (!rows[i].trim()) continue;
                const cols = rows[i].split(',').map(c => c.trim());
                const obj = {};
                headers.forEach((h, j) => {
                    if (h === 'price' || h === 'cost_price' || h === 'year' || h === 'mileage') obj[h] = Number(cols[j]);
                    else obj[h] = cols[j];
                });
                parsed.push(obj);
            }
            setCsvPreview(parsed.slice(0, 5)); // show first 5
        };
        reader.readAsText(file);
    };

    const confirmImport = async () => {
        const file = fileRef.current?.files[0];
        if (!file) return;
        setImporting(true);
        // Normally we'd send the array we parsed, or send the file.
        // Let's re-parse completely strictly or send file.
        // Assuming we send the parsed array:
        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                const text = evt.target.result;
                const rows = text.split('\\n');
                const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
                const parsed = [];
                for (let i = 1; i < rows.length; i++) {
                    if (!rows[i].trim()) continue;
                    const cols = rows[i].split(',').map(c => c.trim());
                    const obj = {};
                    headers.forEach((h, j) => obj[h] = cols[j]);
                    parsed.push(obj);
                }
                await axios.post(`${API_URL}/api/stock/bulk`, { vehicles: parsed }, { headers: authHeaders() });
                setIsBulkOpen(false);
                setCsvPreview([]);
                loadStock();
            };
            reader.readAsText(file);
        } catch {
            alert('Import failed');
        }
        setImporting(false);
    };

    const exportFeed = async () => {
        window.open(`${API_URL}/api/stock/feed/autotrader`, '_blank');
    };

    const filtered = vehicles.filter(v => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return `${v.make} ${v.model} ${v.year} ${v.variant} ${v.stock_number}`.toLowerCase().includes(q);
    });

    return (
        <div className="flex flex-col h-screen bg-[#0A0F1E] text-white">
            {/* ── Header ── */}
            <header className="px-8 py-5 flex items-center justify-between sticky top-0 z-10"
                style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                        <Package size={20} className="text-[#C9A84C]" />
                    </div>
                    <div>
                        <h1 className="font-outfit font-black text-xl text-white">Inventory Manager</h1>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={exportFeed} className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all"
                        style={{ background: 'rgba(59,127,245,0.1)', color: '#60A5FA', border: '1px solid rgba(59,127,245,0.2)' }}>
                        <Download size={13} /> Autotrader Feed
                    </button>
                    <button onClick={() => setIsBulkOpen(true)} className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all hover:bg-white/5 border border-white/10">
                        <Upload size={13} /> Bulk Import
                    </button>
                    <button onClick={() => setIsAddOpen(true)} className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all"
                        style={{ background: '#C9A84C', color: '#0A0F1E' }}>
                        <Plus size={13} /> Add Vehicle
                    </button>
                </div>
            </header>

            {/* ── Toolbar ── */}
            <div className="px-8 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    {['all', 'available', 'reserved', 'sold'].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all"
                            style={{
                                background: statusFilter === s ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                                color: statusFilter === s ? '#C9A84C' : 'rgba(240,237,232,0.66)',
                                border: `1px solid ${statusFilter === s ? 'rgba(201,168,76,0.3)' : 'transparent'}`
                            }}>
                            {s}
                        </button>
                    ))}

                    <div className="w-px h-6 bg-white/10 mx-2" />

                    <button onClick={() => setShowAged(!showAged)}
                        className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase flex items-center gap-1.5 transition-all"
                        style={{ background: showAged ? 'rgba(239,68,68,0.15)' : 'transparent', color: showAged ? '#F87171' : 'rgba(240,237,232,0.66)', border: showAged ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
                        <ShieldAlert size={12} /> Aged Stock (&gt;60 days)
                    </button>

                    <button onClick={() => setShowCost(!showCost)}
                        className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase flex items-center gap-1.5 ml-2 transition-all border border-white/10 hover:bg-white/5"
                        style={{ color: showCost ? '#C9A84C' : 'rgba(240,237,232,0.66)' }}>
                        <Tag size={12} /> Toggle Cost Price
                    </button>
                </div>

                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/58" />
                    <input type="text" placeholder="Search make, model, VIN..."
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs focus:border-[#C9A84C] outline-none w-64 text-white" />
                </div>
            </div>

            {/* ── Table ── */}
            <div className="flex-1 overflow-auto p-8">
                {loading ? (
                    <SkeletonTable columns={6} rows={8} />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={Package} title="No inventory found"
                        description="Adjust your search filters or add a new vehicle to your stock list."
                        actionLabel="Add Vehicle" onAction={() => setIsAddOpen(true)}
                    />
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[11px] uppercase tracking-widest text-white/58 border-b border-white/5">
                                <th className="pb-3 px-4 font-black">Vehicle</th>
                                <th className="pb-3 px-4 font-black">Stock Info</th>
                                <th className="pb-3 px-4 font-black text-right">Pricing</th>
                                <th className="pb-3 px-4 font-black text-center">Status</th>
                                <th className="pb-3 px-4 font-black text-center">Aged</th>
                                <th className="pb-3 px-4 font-black text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(v => (
                                <tr key={v.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-4">
                                            {firstImage(v) ? (
                                                <img src={firstImage(v)} alt={`${v.year} ${v.make} ${v.model}`} loading="lazy" className="w-16 h-12 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-16 h-12 rounded-lg bg-black/50 flex items-center justify-center border border-white/5">
                                                    <ImageIcon size={16} className="text-white/58" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-outfit font-black text-sm text-white">{v.year} {v.make} {v.model}</p>
                                                <p className="text-[12px] text-white/58">{v.variant} · {v.colour} · {v.condition.toUpperCase()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-xs font-mono">
                                        <p className="text-[#C9A84C] font-bold">{v.stock_number}</p>
                                        <p className="text-white/58 mt-0.5">{v.vin}</p>
                                        <p className="text-white/66 font-sans mt-0.5">{v.mileage?.toLocaleString()} km</p>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <p className="text-base font-black text-white">R {v.price?.toLocaleString()}</p>
                                        {showCost && (
                                            <p className="text-[12px] font-bold text-red-300 mt-1">Cost: R {v.cost_price?.toLocaleString()}</p>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <span className="px-2 py-1 rounded-full text-[11px] font-bold uppercase"
                                            style={{
                                                background: STATUS_STYLE[v.status]?.bg,
                                                color: STATUS_STYLE[v.status]?.text,
                                                border: `1px solid ${STATUS_STYLE[v.status]?.border}`
                                            }}>
                                            {v.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-[12px]"
                                            style={{
                                                border: `1px solid ${DAYS_COLOR(v.days_in_stock)}44`,
                                                color: DAYS_COLOR(v.days_in_stock),
                                                background: `${DAYS_COLOR(v.days_in_stock)}11`
                                            }}>
                                            {v.days_in_stock}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                            {v.status === 'available' && (
                                                <button onClick={() => handleUpdateStatus(v.id, 'reserved')} className="p-1.5 rounded-lg bg-orange-400/10 text-orange-400 hover:bg-orange-400/20" title="Mark Reserved">
                                                    <Clock size={14} />
                                                </button>
                                            )}
                                            {v.status !== 'sold' && (
                                                <button onClick={() => handleUpdateStatus(v.id, 'sold')} className="p-1.5 rounded-lg bg-green-400/10 text-green-400 hover:bg-green-400/20" title="Mark Sold">
                                                    <CheckCircle size={14} />
                                                </button>
                                            )}
                                            <button onClick={() => setViewVehicle(v)} className="p-1.5 rounded-lg bg-white/5 text-white/66 hover:text-white" title="View Details">
                                                <Eye size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Slide-Over: View Vehicle ── */}
            {viewVehicle && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex justify-end" onClick={() => setViewVehicle(null)}>
                    <div className="w-[500px] h-full shadow-2xl overflow-y-auto anim-slide-left p-6"
                        style={{ background: '#0D1526', borderLeft: '1px solid rgba(201,168,76,0.15)' }}
                        onClick={e => e.stopPropagation()}>

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-outfit font-black text-2xl">{viewVehicle.year} {viewVehicle.make} {viewVehicle.model}</h2>
                            <button onClick={() => setViewVehicle(null)} className="p-2 text-white/58 hover:bg-white/10 rounded-full"><X size={20} /></button>
                        </div>

                        {firstImage(viewVehicle) && (
                            <img src={firstImage(viewVehicle)} alt={`${viewVehicle.year} ${viewVehicle.make} ${viewVehicle.model}`} className="w-full h-64 object-cover rounded-xl mb-6 shadow-xl" />
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                                <p className="text-[11px] uppercase text-white/58 tracking-widest font-black">Retail Price</p>
                                <p className="text-xl font-black text-white">R{viewVehicle.price.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
                                <p className="text-[11px] uppercase text-white/58 tracking-widest font-black">Mileage</p>
                                <p className="text-xl font-black text-white">{viewVehicle.mileage.toLocaleString()} km</p>
                            </div>
                            <div className="bg-white/5 border border-white/5 p-4 rounded-xl col-span-2 flex justify-between">
                                <div>
                                    <p className="text-[11px] uppercase text-white/58 tracking-widest font-black mb-1">VIN Number</p>
                                    <p className="font-mono text-xs">{viewVehicle.vin}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] uppercase text-white/58 tracking-widest font-black mb-1">Stock Ref</p>
                                    <p className="font-mono text-xs text-[#C9A84C]">{viewVehicle.stock_number}</p>
                                </div>
                            </div>
                        </div>

                        <p className="text-sm leading-relaxed text-white/66 mb-8 border-l-2 pl-4" style={{ borderColor: '#C9A84C' }}>
                            {viewVehicle.description || 'No description provided.'}
                        </p>

                        <ShowroomTools
                            vehicle={viewVehicle}
                            onDescriptionSaved={(text) => {
                                setViewVehicle((v) => ({ ...v, description: text }));
                                setVehicles((list) => list.map((x) => (x.id === viewVehicle.id ? { ...x, description: text } : x)));
                            }}
                        />
                    </div>
                </div>
            )}

            {/* ── Slide-Over: Add Vehicle ── */}
            {isAddOpen && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex justify-end">
                    <div className="w-[500px] h-full shadow-2xl overflow-y-auto anim-slide-left"
                        style={{ background: '#0D1526', borderLeft: '1px solid rgba(201,168,76,0.15)' }}>
                        <div className="p-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#0D1526] z-10">
                            <h2 className="font-outfit font-black text-xl">Add New Vehicle</h2>
                            <button onClick={() => setIsAddOpen(false)} className="p-2 text-white/58 hover:bg-white/10 rounded-full"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[11px] uppercase font-bold text-white/58 block mb-1">Make</label>
                                    <input required type="text" value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-[#C9A84C] outline-none" /></div>
                                <div><label className="text-[11px] uppercase font-bold text-white/58 block mb-1">Model</label>
                                    <input required type="text" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-[#C9A84C] outline-none" /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="text-[11px] uppercase font-bold text-white/58 block mb-1">Year</label>
                                    <input required type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-[#C9A84C] outline-none" /></div>
                                <div className="col-span-2"><label className="text-[11px] uppercase font-bold text-white/58 block mb-1">Variant (optional)</label>
                                    <input type="text" value={formData.variant} onChange={e => setFormData({ ...formData, variant: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-[#C9A84C] outline-none" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[11px] uppercase font-bold text-white/58 block mb-1">VIN</label>
                                    <input required type="text" value={formData.vin} onChange={e => setFormData({ ...formData, vin: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm uppercase font-mono focus:border-[#C9A84C] outline-none" /></div>
                                <div><label className="text-[11px] uppercase font-bold text-white/58 block mb-1">Stock Number</label>
                                    <input required type="text" value={formData.stock_number} onChange={e => setFormData({ ...formData, stock_number: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm uppercase font-mono focus:border-[#C9A84C] outline-none" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[11px] uppercase font-bold text-white/58 block mb-1">Retail Price</label>
                                    <input required type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-[#C9A84C] outline-none" /></div>
                                <div><label className="text-[11px] uppercase font-bold text-white/58 block mb-1">Cost Price</label>
                                    <input type="number" value={formData.cost_price} onChange={e => setFormData({ ...formData, cost_price: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-red-400 outline-none" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[11px] uppercase font-bold text-white/58 block mb-1">Mileage</label>
                                    <input type="number" value={formData.mileage} onChange={e => setFormData({ ...formData, mileage: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-[#C9A84C] outline-none" /></div>
                                <div><label className="text-[11px] uppercase font-bold text-white/58 block mb-1">Colour</label>
                                    <input type="text" value={formData.colour} onChange={e => setFormData({ ...formData, colour: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-[#C9A84C] outline-none" /></div>
                            </div>
                            <div>
                                <label className="text-[11px] uppercase font-bold text-white/58 block mb-1">Description</label>
                                <textarea rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-[#C9A84C] outline-none resize-none"></textarea>
                            </div>

                            <button type="submit" className="w-full py-4 mt-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                                style={{ background: '#C9A84C', color: '#0A0F1E' }}>
                                SAVE TO INVENTORY <ChevronRight size={14} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Bulk Import ── */}
            {isBulkOpen && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center anim-fade-up">
                    <div className="bg-[#0D1526] border border-white/10 p-8 rounded-2xl shadow-2xl w-[600px] relative">
                        <button onClick={() => { setIsBulkOpen(false); setCsvPreview([]); }} className="absolute top-4 right-4 p-2 text-white/58 hover:bg-white/10 rounded-full"><X size={20} /></button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(59,127,245,0.1)', border: '1px solid rgba(59,127,245,0.2)' }}>
                                <FileText size={24} className="text-blue-400" />
                            </div>
                            <h2 className="font-outfit font-black text-2xl text-white">Bulk Import Stock</h2>
                            <p className="text-xs text-white/58 mt-2">Upload a CSV file containing your inventory data.</p>
                            <a href="#" className="text-blue-400 text-xs mt-2 inline-block underline">Download CSV Template</a>
                        </div>

                        {!csvPreview.length ? (
                            <div className="border border-dashed border-white/20 rounded-xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer"
                                onClick={() => fileRef.current?.click()}>
                                <input type="file" accept=".csv" ref={fileRef} onChange={handleFileUpload} className="hidden" />
                                <Upload size={24} className="mx-auto text-white/58 mb-3" />
                                <p className="text-sm font-bold text-white">Click to select CSV</p>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-xs uppercase font-bold text-white/58 mb-3 tracking-widest">Preview (first 5 rows)</h3>
                                <div className="overflow-hidden rounded-xl border border-white/10 text-xs">
                                    <table className="w-full text-left bg-black/20">
                                        <thead><tr className="border-b border-white/10 text-white/58"><th className="p-2">Make/Model</th><th className="p-2">Year</th><th className="p-2">Price</th></tr></thead>
                                        <tbody>
                                            {csvPreview.map((r, i) => (
                                                <tr key={i} className="border-b border-white/5"><td className="p-2">{r.make} {r.model}</td><td className="p-2">{r.year}</td><td className="p-2 text-[#C9A84C]">R{r.price}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button onClick={confirmImport} disabled={importing} className="w-full py-4 mt-6 rounded-xl font-bold uppercase tracking-widest text-xs transition-transform hover:scale-[1.02] disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white' }}>
                                    {importing ? 'IMPORTING...' : 'CONFIRM IMPORT'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
