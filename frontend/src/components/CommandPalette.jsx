import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Car, Users, LayoutDashboard, Settings, User } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function CommandPalette() {
    const quickLinks = [
        { id: 'nav-1', type: 'page', title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
        { id: 'nav-2', type: 'page', title: 'Leads Pipeline', url: '/leads', icon: Users },
        { id: 'nav-3', type: 'page', title: 'Inventory Stock', url: '/stock', icon: Car },
        { id: 'nav-4', type: 'page', title: 'WhatsApp Settings', url: '/settings/whatsapp', icon: Settings },
    ];
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const { token } = useAuth();

    const togglePalette = () => {
        setIsOpen(prev => {
            const nextOpen = !prev;
            if (nextOpen) {
                setQuery('');
                setResults(quickLinks);
                setSelectedIndex(0);
                setTimeout(() => inputRef.current?.focus(), 100);
            }
            return nextOpen;
        });
    };

    // Setup Keyboard Listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                togglePalette();
            }
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Handle Search Queries
    useEffect(() => {
        if (!isOpen) return;
        const debounce = setTimeout(async () => {
            if (query.trim().length < 2) {
                // Return quick links if no query
                setResults(quickLinks);
                return;
            }

            try {
                // Since there is no explicit global search API, we mock results from existing endpoints
                // if they allow generic searches or we just search Leads/Stock in parallel.
                const [leadsData, stockData] = await Promise.all([
                    axios.get(`${API_URL}/api/leads?search=${query}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { leads: [] } })),
                    axios.get(`${API_URL}/api/stock`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
                ]);

                const formattedLeads = (leadsData.data.leads || []).map(l => ({
                    id: `lead-${l.id}`,
                    type: 'lead',
                    title: l.customer_name,
                    subtitle: l.vehicle_interest,
                    url: `/leads?search=${l.customer_name}`,
                    icon: User
                }));

                const formattedStock = stockData.data
                    .filter(s => `${s.make} ${s.model} ${s.vin}`.toLowerCase().includes(query.toLowerCase()))
                    .map(s => ({
                        id: `stock-${s.id}`,
                        type: 'vehicle',
                        title: `${s.make} ${s.model}`,
                        subtitle: `R ${s.price} - ${s.vin}`,
                        url: `/stock?search=${s.vin}`,
                        icon: Car
                    }));

                setResults([...formattedLeads, ...formattedStock].slice(0, 8)); // Top 8 results
                setSelectedIndex(0);

            } catch (err) {
                console.error("Search error", err);
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [query, isOpen, token]);

    // Keyboard Navigation
    useEffect(() => {
        if (!isOpen) return;
        const handleNav = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (results[selectedIndex]) {
                    navigate(results[selectedIndex].url);
                    setIsOpen(false);
                }
            }
        };
        window.addEventListener('keydown', handleNav);
        return () => window.removeEventListener('keydown', handleNav);
    }, [isOpen, results, selectedIndex, navigate]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]" onClick={() => setIsOpen(false)}>
            <div className="w-full max-w-2xl bg-[#0D1526] border border-[#C9A84C]/20 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.6)] overflow-hidden anim-fade-down"
                onClick={e => e.stopPropagation()}>

                {/* Search Input Box */}
                <div className="flex items-center px-4 py-4 border-b border-white/5 bg-[#111A30]">
                    <Search size={20} className="text-[#C9A84C] ml-2 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search leads, vehicles, customers..."
                        className="w-full bg-transparent border-none outline-none text-white text-lg px-4 font-outfit"
                    />
                    <div className="text-[11px] uppercase font-bold text-white/58 border border-white/10 px-2 py-1 rounded-md shrink-0 focus-within:hidden">ESC</div>
                </div>

                {/* Results List */}
                <div className="max-h-[50vh] overflow-y-auto p-2">
                    {results.length === 0 ? (
                        <div className="py-12 flex items-center justify-center">
                            <p className="text-white/58 text-sm">{query.length > 1 ? "No results found." : "Type to start searching..."}</p>
                        </div>
                    ) : (
                        results.map((item, idx) => {
                            const Icon = item.icon;
                            let colorClass = 'text-white/66';
                            let bgClass = 'bg-white/5';
                            if (item.type === 'page') { colorClass = 'text-blue-400'; bgClass = 'bg-blue-400/10'; }
                            if (item.type === 'lead') { colorClass = 'text-green-400'; bgClass = 'bg-green-400/10'; }
                            if (item.type === 'vehicle') { colorClass = 'text-[#C9A84C]'; bgClass = 'bg-[#C9A84C]/10'; }

                            return (
                                <button
                                    key={item.id}
                                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors text-left
                                        ${idx === selectedIndex ? 'bg-[#C9A84C]/10 ring-1 ring-[#C9A84C]/30' : 'hover:bg-white/5'}`}
                                    onClick={() => {
                                        navigate(item.url);
                                        setIsOpen(false);
                                    }}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    <div className={`p-2 rounded-lg ${bgClass}`}>
                                        <Icon size={16} className={colorClass} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-white truncate">{item.title}</p>
                                        {item.subtitle && <p className="text-xs text-white/58 truncate">{item.subtitle}</p>}
                                    </div>
                                    {idx === selectedIndex && <div className="text-[11px] text-[#C9A84C]/80 uppercase tracking-widest font-black shrink-0">Return ⏎</div>}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer hints */}
                <div className="bg-[#0A0F1E] border-t border-white/5 px-6 py-3 flex items-center gap-6 justify-between">
                    <div className="flex items-center gap-6">
                        <span className="text-[11px] uppercase tracking-widest font-bold text-white/58 flex items-center gap-2">
                            <span className="px-1.5 py-0.5 border border-white/10 rounded">↑</span>
                            <span className="px-1.5 py-0.5 border border-white/10 rounded">↓</span>
                            to navigate
                        </span>
                        <span className="text-[11px] uppercase tracking-widest font-bold text-white/58 flex items-center gap-2">
                            <span className="px-1.5 py-0.5 border border-white/10 rounded">⏎</span>
                            to select
                        </span>
                    </div>
                </div>

            </div>
        </div>
    );
}
