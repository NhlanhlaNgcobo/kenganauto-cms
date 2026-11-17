import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Eye, CalendarCheck, MessageSquareText, Landmark, Repeat, Wrench, PhoneCall, Globe, Bot, ShoppingCart } from 'lucide-react';
import { api } from '../utils/api';

const TYPE = {
    vehicle_view: { icon: Eye, tone: 'text-white/66', label: 'View' },
    test_drive: { icon: CalendarCheck, tone: 'text-[#C9A84C]', label: 'Test drive' },
    enquiry: { icon: MessageSquareText, tone: 'text-sky-300', label: 'Enquiry' },
    callback: { icon: PhoneCall, tone: 'text-sky-300', label: 'Callback' },
    finance: { icon: Landmark, tone: 'text-emerald-300', label: 'Finance' },
    trade_in: { icon: Repeat, tone: 'text-orange-300', label: 'Trade-in' },
    service: { icon: Wrench, tone: 'text-violet-300', label: 'Service' },
    online_deal: { icon: ShoppingCart, tone: 'text-[#C9A84C]', label: 'Bought online' },
    ai_reply: { icon: Bot, tone: 'text-emerald-300', label: 'AI reply' },
};

function ago(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return `${Math.floor(s / 86400)} d ago`;
}

/** Live feed of what visitors do on the dealership's own website (Acme Cars demo site). */
export default function WebsiteActivity({ siteUrl = import.meta.env.VITE_DEALER_SITE_URL || 'http://localhost:5174' }) {
    const [data, setData] = useState(null);
    const [fresh, setFresh] = useState(new Set());
    const lastSeen = useRef(null);
    const reduce = useReducedMotion();

    useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                const d = await api.get('/api/website-activity');
                if (!alive) return;
                const newest = d.feed[0]?.created_at;
                if (lastSeen.current && newest && newest > lastSeen.current) {
                    setFresh(new Set(d.feed.filter((e) => e.created_at > lastSeen.current).map((e) => e.id)));
                }
                if (newest) lastSeen.current = newest;
                setData(d);
            } catch { /* keep last good state */ }
        };
        load();
        const t = setInterval(load, 6000);
        return () => { alive = false; clearInterval(t); };
    }, []);

    if (!data) return null;
    const { today, feed, top_viewed: top } = data;
    const maxViews = Math.max(1, ...top.map((t) => t.views));

    return (
        <section className="rounded-3xl border border-white/10 bg-[#121A2B] p-6" aria-labelledby="web-activity-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 id="web-activity-title" className="flex items-center gap-3 font-outfit text-2xl font-black text-white">
                        Website activity
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 font-sans text-xs font-semibold text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" /> Live
                        </span>
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/66">Every view, test drive, finance application, trade-in and online purchase on your website, captured as it happens, with the AI's instant WhatsApp reply.</p>
                </div>
                <a href={siteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-[#C9A84C]/30 hover:text-white">
                    <Globe size={15} aria-hidden="true" /> Open website
                </a>
            </div>

            <div className="mt-6 grid gap-y-5 border-t border-white/8 pt-5 sm:grid-cols-3 sm:divide-x sm:divide-white/8">
                <div className="sm:pr-6"><p className="text-sm text-white/66">Car views · 24h</p><p className="mt-1 font-outfit text-3xl font-black tabular-nums text-white">{today.views}</p></div>
                <div className="sm:px-6"><p className="text-sm text-white/66">Website leads · 24h</p><p className="mt-1 font-outfit text-3xl font-black tabular-nums text-white">{today.leads}</p></div>
                <div className="sm:pl-6"><p className="text-sm text-white/66">View → lead rate</p><p className="mt-1 font-outfit text-3xl font-black tabular-nums text-white">{today.conversion_pct == null ? '—' : `${today.conversion_pct}%`}</p></div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div>
                    <h3 className="mb-3 text-sm font-semibold text-white/80">Latest</h3>
                    <ol className="divide-y divide-white/8" aria-live="polite">
                        <AnimatePresence initial={false}>
                            {feed.slice(0, 8).map((e) => {
                                const t = TYPE[e.type] || TYPE.vehicle_view;
                                const Icon = t.icon;
                                const isNew = fresh.has(e.id);
                                return (
                                    <motion.li key={e.id} layout={!reduce}
                                        initial={reduce ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className={`flex items-center gap-3 py-2.5 transition-colors duration-1000 ${isNew ? 'bg-[#C9A84C]/8' : ''}`}>
                                        <Icon size={16} className={`shrink-0 ${t.tone}`} aria-hidden="true" />
                                        <span className="min-w-0 flex-1 truncate text-sm text-white/88">{e.label}</span>
                                        {e.type !== 'vehicle_view' ? <span className={`hidden rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold sm:inline ${t.tone}`}>{t.label}</span> : null}
                                        <time className="shrink-0 text-xs tabular-nums text-white/58" dateTime={e.created_at}>{ago(e.created_at)}</time>
                                    </motion.li>
                                );
                            })}
                        </AnimatePresence>
                    </ol>
                    {feed.length === 0 ? <p className="py-6 text-sm text-white/58">No website activity yet. Open the website and browse a car.</p> : null}
                </div>

                <div>
                    <h3 className="mb-3 text-sm font-semibold text-white/80">Most viewed this week</h3>
                    <ol className="space-y-3">
                        {top.map((v) => (
                            <li key={v.vehicle_id} className="flex items-center gap-3">
                                {v.image ? <img src={v.image} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" loading="lazy" /> : null}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-white">{v.year} {v.make} {v.model}</p>
                                    <div className="mt-1 h-1.5 rounded-full bg-white/6"><div className="h-1.5 rounded-full bg-[#C9A84C]" style={{ width: `${(v.views / maxViews) * 100}%` }} /></div>
                                </div>
                                <span className="w-16 shrink-0 text-right text-sm tabular-nums text-white/72">{v.views} views</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
}
