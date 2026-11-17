import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Globe, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const LEAD_TYPES = new Set(['test_drive', 'enquiry', 'callback', 'finance', 'trade_in', 'service', 'online_deal']);
const DEST = { service: '/service', trade_in: '/trade-ins', finance: '/leads', online_deal: '/online-deals' };

/** App-wide alert when a visitor converts on the dealership website. */
export default function LiveLeadToast() {
    const [items, setItems] = useState([]);
    const since = useRef(new Date().toISOString());
    const navigate = useNavigate();
    const reduce = useReducedMotion();

    useEffect(() => {
        let alive = true;
        const poll = async () => {
            try {
                const d = await api.get('/api/website-activity', { since: since.current });
                if (!alive || !d.feed.length) return;
                since.current = d.feed[0].created_at;
                const leads = d.feed.filter((e) => LEAD_TYPES.has(e.type)).reverse();
                if (leads.length) setItems((cur) => [...cur, ...leads].slice(-3));
            } catch { /* offline or logged out: stay quiet */ }
        };
        const t = setInterval(poll, 5000);
        return () => { alive = false; clearInterval(t); };
    }, []);

    useEffect(() => {
        if (!items.length) return;
        const t = setTimeout(() => setItems((cur) => cur.slice(1)), 9000);
        return () => clearTimeout(t);
    }, [items]);

    const dismiss = (id) => setItems((cur) => cur.filter((x) => x.id !== id));

    return (
        <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(380px,calc(100vw-32px))] flex-col gap-3" aria-live="polite">
            <AnimatePresence>
                {items.map((e) => (
                    <motion.div key={e.id}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduce ? 0 : 40 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="pointer-events-auto rounded-2xl border border-white/10 bg-[#0D1526] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.45)]" role="status">
                        <div className="flex items-start gap-3">
                            <Globe size={18} className="mt-0.5 shrink-0 text-[#C9A84C]" aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-white">New from your website</p>
                                <p className="mt-1 text-sm leading-6 text-white/72">{e.label}</p>
                                <button type="button" onClick={() => { dismiss(e.id); navigate(DEST[e.type] || '/leads'); }}
                                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#C9A84C] hover:underline">
                                    Open <ArrowRight size={14} aria-hidden="true" />
                                </button>
                            </div>
                            <button type="button" onClick={() => dismiss(e.id)} aria-label="Dismiss" className="rounded-lg p-1 text-white/58 hover:bg-white/5 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
