import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    LifeBuoy, BookOpen, FileText, Download, Upload, HelpCircle, List,
    MessageSquare, AlertCircle, CheckCircle, Search
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Support() {
    const [view, setView] = useState('manuals'); // 'manuals', 'faqs', 'history'
    const [manuals, setManuals] = useState([]);
    const [faqs, setFaqs] = useState([]);
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [newMake, setNewMake] = useState('');
    const [newModel, setNewModel] = useState('');
    const [newYear, setNewYear] = useState('');
    const fileRef = useRef(null);
    const [fileNameState, setFileNameState] = useState('');

    const [faqForm, setFaqForm] = useState(false);
    const [newFaq, setNewFaq] = useState({ make: '', model: '', question: '', answer: '' });

    async function loadManuals() {
        setLoading(true);
        try { const res = await axios.get(`${API_URL}/api/support/manuals`); setManuals(res.data); } catch { setManuals([]); }
        setLoading(false);
    }

    async function loadFaqs() {
        setLoading(true);
        try { const res = await axios.get(`${API_URL}/api/support/faqs`); setFaqs(res.data); } catch { setFaqs([]); }
        setLoading(false);
    }

    async function loadQueries() {
        setLoading(true);
        try { const res = await axios.get(`${API_URL}/api/support/queries`); setQueries(res.data); } catch { setQueries([]); }
        setLoading(false);
    }

    useEffect(() => {
        if (view === 'manuals') loadManuals();
        else if (view === 'faqs') loadFaqs();
        else loadQueries();
    }, [view]);

    const handleUploadClick = () => { fileRef.current?.click(); };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) setFileNameState(file.name);
    };

    const submitManual = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/api/support/manuals`, {
                file_name: fileNameState, make: newMake, model: newModel, year: newYear
            });
            setManuals([res.data, ...manuals]);
            setIsUploadOpen(false);
            setNewMake(''); setNewModel(''); setNewYear(''); setFileNameState('');
        } catch { alert('Upload failed'); }
    };

    const submitFaq = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/api/support/faqs`, newFaq);
            setFaqs([res.data, ...faqs]);
            setFaqForm(false);
            setNewFaq({ make: '', model: '', question: '', answer: '' });
        } catch { alert('Failed to create FAQ'); }
    };

    return (
        <div className="flex flex-col h-screen bg-[#0A0F1E] text-white">
            <header className="px-8 py-5 flex items-center justify-between sticky top-0 z-10"
                style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl border border-blue-500/20 text-blue-400 bg-blue-500/10">
                        <LifeBuoy size={20} />
                    </div>
                    <div>
                        <h1 className="font-outfit font-black text-xl text-white">AI Support & Manuals</h1>
                    </div>
                </div>

                <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                    <button onClick={() => setView('manuals')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'manuals' ? 'bg-[#C9A84C] text-[#0A0F1E]' : 'text-white/58 hover:text-white'}`}>Library</button>
                    <button onClick={() => setView('faqs')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'faqs' ? 'bg-[#C9A84C] text-[#0A0F1E]' : 'text-white/58 hover:text-white'}`}>Common FAQs</button>
                    <button onClick={() => setView('history')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'history' ? 'bg-[#C9A84C] text-[#0A0F1E]' : 'text-white/58 hover:text-white'}`}>Customer History</button>
                </div>
            </header>

            <div className="flex-1 overflow-auto p-8 relative">
                {view === 'manuals' && (
                    <div className="max-w-6xl mx-auto space-y-6">
                        <div className="flex justify-between items-center bg-[#C9A84C]/5 border border-[#C9A84C]/20 p-6 rounded-2xl">
                            <div className="w-1/2">
                                <h2 className="font-outfit font-black text-xl text-[#C9A84C] mb-2">Dealership NLP Matrix</h2>
                                <p className="text-sm text-white/66 leading-relaxed">Upload official Owner Manuals here. The AI will instantly vectorize the pages using semantic structuring, allowing the customer chatbot to answer precise mechanical questions directly referencing page numbers without human intervention!</p>
                            </div>
                            <button onClick={() => setIsUploadOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-[#C9A84C] text-[#0D1526] rounded-xl font-bold hover:bg-yellow-400 shadow-lg transition-all">
                                <Upload size={18} /> INGEST NEW MANUAL
                            </button>
                        </div>

                        {loading ? <p className="text-center text-xs text-white/58 pt-10">Vectorizing library...</p> : (
                            <div className="grid grid-cols-2 gap-6">
                                {manuals.map(m => (
                                    <div key={m.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col hover:border-white/20 transition-colors">
                                        <div className="p-6 border-b border-white/5 flex gap-4 items-start">
                                            <div className="p-4 bg-red-500/10 text-red-400 rounded-xl flex-shrink-0">
                                                <BookOpen size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-black text-white text-lg">{m.make} {m.model} <span className="text-white/58">({m.year})</span></h3>
                                                <p className="text-xs text-white/58 mb-3 truncate">{m.file_name} • {m.size}</p>
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-widest ${m.status.includes('Processed') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                                                    {m.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-black/40 flex-1 flex flex-col justify-between">
                                            <div>
                                                <p className="text-[11px] uppercase font-black text-[#C9A84C] tracking-widest mb-3 flex items-center gap-2"><List size={12} /> Top Answered Queries</p>
                                                <ul className="space-y-2 mb-4">
                                                    {m.top_questions.map((q, i) => (
                                                        <li key={i} className="text-xs text-white/80 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20" /> {q}</li>
                                                    ))}
                                                    {m.top_questions.length === 0 && <li className="text-xs text-white/58 italic">Processing queries...</li>}
                                                </ul>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-bold text-white/58 pt-4 border-t border-white/10">
                                                <span>{m.queries_count} Total AI Hits</span>
                                                <button className="flex items-center gap-1 hover:text-white transition-colors"><Download size={14} /> PDF</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {view === 'faqs' && (
                    <div className="max-w-5xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-outfit font-black">Common Questions Library</h2>
                                <p className="text-xs text-white/58 mt-1">Direct priority Q&A pairs (Bypasses Vector PDF search for immediate, zero-cost responses).</p>
                            </div>
                            <button onClick={() => setFaqForm(true)} className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500/20 transition-all">
                                Add FAQ Pattern
                            </button>
                        </div>

                        {faqForm && (
                            <form onSubmit={submitFaq} className="bg-white/5 p-6 rounded-2xl border border-white/10 mb-8 grid grid-cols-2 gap-4">
                                <div><label className="text-[11px] uppercase text-white/58 font-bold mb-1 block">Vehicle Make</label>
                                    <input required placeholder="e.g. Toyota" value={newFaq.make} onChange={e => setNewFaq({ ...newFaq, make: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-blue-400" /></div>
                                <div><label className="text-[11px] uppercase text-white/58 font-bold mb-1 block">Vehicle Model</label>
                                    <input required placeholder="e.g. Hilux" value={newFaq.model} onChange={e => setNewFaq({ ...newFaq, model: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-blue-400" /></div>
                                <div className="col-span-2"><label className="text-[11px] uppercase text-white/58 font-bold mb-1 block">Question Pattern</label>
                                    <input required placeholder="e.g. What oil does my Hilux use?" value={newFaq.question} onChange={e => setNewFaq({ ...newFaq, question: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-blue-400" /></div>
                                <div className="col-span-2"><label className="text-[11px] uppercase text-white/58 font-bold mb-1 block">Direct Answer</label>
                                    <textarea required rows="3" placeholder="Provide absolute diagnostic..." value={newFaq.answer} onChange={e => setNewFaq({ ...newFaq, answer: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-blue-400" /></div>
                                <div className="col-span-2 flex justify-end gap-3 mt-2">
                                    <button type="button" onClick={() => setFaqForm(false)} className="px-5 py-2 text-xs font-bold text-white/58 hover:text-white">Cancel</button>
                                    <button type="submit" className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl">Save Target</button>
                                </div>
                            </form>
                        )}

                        <div className="space-y-4">
                            {faqs.map(f => (
                                <div key={f.id} className="bg-black/40 border border-white/5 p-5 rounded-2xl group hover:border-white/10 transition-colors">
                                    <div className="flex gap-4">
                                        <div className="p-2 bg-white/5 rounded-lg h-min text-white/58"><HelpCircle size={16} /></div>
                                        <div>
                                            <span className="text-[11px] uppercase tracking-widest text-[#C9A84C] font-black border border-[#C9A84C]/20 bg-[#C9A84C]/5 px-2 py-0.5 rounded">{f.make} {f.model}</span>
                                            <p className="font-bold text-white mt-2 mb-2">{f.question}</p>
                                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-sm text-white/70">
                                                <span className="text-blue-400 font-black text-xs mr-2">A:</span> {f.answer}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'history' && (
                    <div className="max-w-5xl mx-auto bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-[#0D1526] border-b border-white/10">
                                <tr className="text-[11px] uppercase font-black tracking-widest text-white/58">
                                    <th className="p-4">Customer</th>
                                    <th className="p-4">Vehicle Mentioned</th>
                                    <th className="p-4">Raw Query</th>
                                    <th className="p-4">AI Resolution Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queries.map(q => (
                                    <tr key={q.id} className="border-b border-white/5 hover:bg-black/30 transition-colors">
                                        <td className="p-4">
                                            <p className="text-sm font-bold">{q.customer_name}</p>
                                            <p className="text-[12px] text-white/58">{q.customer_phone}</p>
                                        </td>
                                        <td className="p-4 text-xs font-mono text-[#C9A84C]">{q.vehicle}</td>
                                        <td className="p-4"><p className="text-xs text-white/80 max-w-xs italic">"{q.query}"</p></td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-1.5
                                                ${q.resolution_status.includes('Escalated') ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}
                                            `}>
                                                {q.resolution_status.includes('Escalated') ? <AlertCircle size={10} /> : <CheckCircle size={10} />}
                                                {q.resolution_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Modal: Upload Manual ── */}
            {isUploadOpen && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center anim-fade-up">
                    <form onSubmit={submitManual} className="bg-[#0D1526] border border-white/10 p-8 rounded-2xl shadow-2xl w-[550px] relative">
                        <button type="button" onClick={() => setIsUploadOpen(false)} className="absolute top-4 right-4 p-2 text-white/58 hover:bg-white/10 rounded-full"><X size={20} /></button>
                        <Upload size={30} className="text-[#C9A84C] mb-4" />
                        <h2 className="font-outfit font-black text-xl mb-2">Ingest Manual to Vector Space</h2>
                        <p className="text-xs text-white/58 mb-6 flex items-center gap-2"><AlertCircle size={12} /> Only PDF formats are accepted for vectorization.</p>

                        <div className="space-y-4 mb-6">
                            <div className="flex gap-4">
                                <div className="flex-1"><label className="text-[11px] uppercase text-white/58 font-bold mb-1 block">Make</label>
                                    <input required value={newMake} onChange={e => setNewMake(e.target.value)} placeholder="Toyota" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-[#C9A84C]" /></div>
                                <div className="flex-1"><label className="text-[11px] uppercase text-white/58 font-bold mb-1 block">Model</label>
                                    <input required value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="Hilux" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-[#C9A84C]" /></div>
                            </div>
                            <div><label className="text-[11px] uppercase text-white/58 font-bold mb-1 block">Year</label>
                                <input required type="number" value={newYear} onChange={e => setNewYear(e.target.value)} placeholder="2022" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-sm outline-none focus:border-[#C9A84C]" /></div>

                            <div className="border border-dashed border-white/20 rounded-xl p-6 hover:bg-white/5 transition-colors cursor-pointer text-center"
                                onClick={handleUploadClick}>
                                <input type="file" accept=".pdf" ref={fileRef} onChange={handleFileChange} className="hidden" />
                                <FileText size={24} className="mx-auto text-white/58 mb-2" />
                                <p className="text-sm font-bold text-white mb-1">Click to browse PDF</p>
                                <p className="text-[12px] font-mono text-[#C9A84C] break-all">{fileNameState || 'No file selected'}</p>
                            </div>
                        </div>

                        <button type="submit" disabled={!fileNameState} className="w-full py-4 bg-[#C9A84C] text-[#0A0F1E] font-black uppercase text-xs rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                            COMMENCE INGESTION
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
