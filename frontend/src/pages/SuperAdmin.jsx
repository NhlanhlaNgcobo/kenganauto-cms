import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, TrendingUp, Users, Eye, CheckCircle, Key } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const SuperAdmin = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            const token = localStorage.getItem('ka_token');
            const res = await fetch(`${API_BASE}/api/superadmin/tenants`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setData(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleImpersonate = async (tenantId) => {
        try {
            const token = localStorage.getItem('ka_token');
            const res = await fetch(`${API_BASE}/api/superadmin/impersonate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ tenant_id: tenantId })
            });
            const resData = await res.json();
            if (resData.token) {
                // Swap token and reload
                localStorage.setItem('ka_token', resData.token);
                window.location.href = '/dashboard';
            } else {
                alert(resData.error || 'Failed to impersonate');
            }
        } catch (err) {
            alert('Network error');
        }
    };

    if (loading) return <div className="p-8 text-white">Loading SuperAdmin portal...</div>;
    if (!data) return <div className="p-8 text-white">Access Denied or Load Failed.</div>;

    return (
        <div className="flex flex-col min-h-screen">
            <header className="px-8 py-5 flex-shrink-0 sticky top-0 z-40"
                style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-0.5 text-red-400">Restricted</p>
                        <h1 className="font-outfit font-black text-xl text-white flex items-center gap-2">
                            <Shield className="text-red-400" size={20} /> KenganAuto SuperAdmin
                        </h1>
                    </div>

                    <button
                        onClick={() => navigate('/superadmin/api-settings')}
                        className="bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/20 flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-xs transition-all"
                    >
                        <Key size={14} /> Global API Config
                    </button>
                </div>
                <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                    <CheckCircle size={12} /> Database Backups Active
                </div>
            </header>

            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-6xl space-y-8">

                    {/* Top Level Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-2xl bg-[#111A30] border border-white/5 relative overflow-hidden">
                            <TrendingUp className="absolute top-4 right-4 text-emerald-400/10" size={80} />
                            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Total MRR</p>
                            <h4 className="text-4xl font-outfit font-black text-emerald-400 mb-1 leading-none">
                                R {(data.mrr_zar).toLocaleString()}
                            </h4>
                            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">Monthly Recurring Revenue</p>
                        </div>

                        <div className="p-6 rounded-2xl bg-[#111A30] border border-white/5 relative overflow-hidden">
                            <Users className="absolute top-4 right-4 text-[#C9A84C]/10" size={80} />
                            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Total Tenants</p>
                            <h4 className="text-4xl font-outfit font-black text-white mb-1 leading-none">
                                {data.total_tenants}
                            </h4>
                            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">Active Dealerships Hosted</p>
                        </div>
                    </div>

                    {/* Tenants Data Table */}
                    <h3 className="font-outfit font-bold text-lg text-white mb-4">Dealership Sites</h3>
                    <div className="rounded-2xl bg-[#080C17] border border-white/5 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-[#0B1120]">
                                    <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-widest">ID</th>
                                    <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-widest">Dealership Name</th>
                                    <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-widest">Subdomain</th>
                                    <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-widest">Plan</th>
                                    <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-widest">Status</th>
                                    <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-widest">MRR</th>
                                    <th className="p-4 text-xs font-bold text-white/50 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-white/80">
                                {data.tenants.map(t => (
                                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-mono text-white/40">{t.id}</td>
                                        <td className="p-4 font-bold text-white">{t.name}</td>
                                        <td className="p-4 text-[#C9A84C]">{t.subdomain}</td>
                                        <td className="p-4 uppercase text-xs">{t.plan}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${t.status === 'active' ? 'bg-emerald-400/20 text-emerald-400' :
                                                t.status === 'trialing' ? 'bg-blue-400/20 text-blue-400' :
                                                    'bg-red-400/20 text-red-400'
                                                }`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-emerald-400 font-mono">R{t.mrr.toLocaleString()}</td>
                                        <td className="p-4">
                                            <button onClick={() => handleImpersonate(t.id)}
                                                className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase flex items-center gap-1 transition-colors">
                                                <Eye size={12} /> Impersonate
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {data.tenants.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-white/40">No dealerships found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SuperAdmin;
