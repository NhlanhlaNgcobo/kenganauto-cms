import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Car, CheckCircle2, Gauge, Palette, Calendar } from 'lucide-react';
import { API_URL } from '../utils/api';

/** Public "Silent Salesman" page — opened by scanning the QR code on a showroom vehicle. */
export default function PublicVehicle() {
    const { token } = useParams();
    const [v, setV] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', wants_test_drive: true, popia_consent: false });
    const [state, setState] = useState({ busy: false, error: '', done: '' });

    useEffect(() => {
        axios.get(`${API_URL}/api/showroom/public/${encodeURIComponent(token)}`)
            .then((r) => setV(r.data))
            .catch(() => setNotFound(true));
    }, [token]);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setState({ busy: true, error: '', done: '' });
        try {
            const r = await axios.post(`${API_URL}/api/showroom/public/${encodeURIComponent(token)}/enquiry`, form);
            setState({ busy: false, error: '', done: r.data.message });
        } catch (err) {
            setState({ busy: false, error: err?.response?.data?.error || 'Something went wrong. Please ask a salesperson.', done: '' });
        }
    };

    const field = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/58 focus:border-[#C9A84C]/70 focus:outline-none';

    if (notFound) {
        return <div className="flex min-h-screen items-center justify-center bg-[#0F172A] p-6 text-center text-white/66">This vehicle link is no longer available. Please ask a salesperson for help.</div>;
    }
    if (!v) return <div className="min-h-screen bg-[#0F172A]" />;

    const img = v.images?.[0];
    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <div className="mx-auto max-w-lg px-4 pb-12">
                <p className="py-4 text-center text-xs font-bold uppercase tracking-widest text-[#C9A84C]">{v.dealership?.name || 'Dealership'}</p>
                {img ? <img src={img} alt={`${v.year} ${v.make} ${v.model}`} className="aspect-[4/3] w-full rounded-3xl object-cover" />
                    : <div className="flex aspect-[4/3] w-full items-center justify-center rounded-3xl bg-white/5"><Car size={48} className="text-white/58" /></div>}

                <h1 className="mt-5 font-outfit text-3xl font-black leading-tight">{v.year} {v.make} {v.model}</h1>
                {v.variant ? <p className="text-white/66">{v.variant}</p> : null}
                {v.price != null ? <p className="mt-3 font-outfit text-3xl font-black text-[#C9A84C]">R{Number(v.price).toLocaleString('en-ZA')}</p> : null}
                {v.status !== 'available' ? <p className="mt-2 inline-block rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold uppercase text-orange-300">{v.status}: ask about similar units</p> : null}

                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-2xl bg-white/5 p-3"><Gauge size={16} className="mx-auto mb-1 text-white/58" />{v.mileage != null ? `${Number(v.mileage).toLocaleString('en-ZA')} km` : '—'}</div>
                    <div className="rounded-2xl bg-white/5 p-3"><Palette size={16} className="mx-auto mb-1 text-white/58" />{v.colour || '—'}</div>
                    <div className="rounded-2xl bg-white/5 p-3 capitalize"><Calendar size={16} className="mx-auto mb-1 text-white/58" />{v.condition}</div>
                </div>

                {v.features?.length ? <ul className="mt-5 flex flex-wrap gap-2">{v.features.map((f) => <li key={f} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">{f}</li>)}</ul> : null}
                {v.description ? <p className="mt-5 text-sm leading-7 text-white/72">{v.description}</p> : null}
                <p className="mt-3 text-xs text-white/58">Stock ref {v.stock_number}</p>

                <div className="mt-8 rounded-3xl border border-white/10 bg-[#121A2B] p-5">
                    {state.done ? (
                        <div className="flex flex-col items-center gap-3 py-6 text-center"><CheckCircle2 size={40} className="text-green-400" /><p className="text-lg font-semibold">{state.done}</p></div>
                    ) : (
                        <form onSubmit={submit} className="space-y-3">
                            <h2 className="font-outfit text-xl font-black">Interested in this car?</h2>
                            <input required className={field} placeholder="Your name" autoComplete="name" value={form.name} onChange={set('name')} />
                            <input required className={field} placeholder="Mobile number, e.g. 082 123 4567" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
                            <input className={field} type="email" placeholder="Email (optional)" autoComplete="email" value={form.email} onChange={set('email')} />
                            <textarea className={field} rows={2} placeholder="Questions? Trade-in? Finance? (optional)" value={form.message} onChange={set('message')} />
                            <label className="flex items-start gap-3 text-sm text-white/75"><input type="checkbox" className="mt-1 h-4 w-4" checked={form.wants_test_drive} onChange={set('wants_test_drive')} /> I'd like a test drive</label>
                            <label className="flex items-start gap-3 text-xs text-white/66"><input type="checkbox" required className="mt-0.5 h-4 w-4" checked={form.popia_consent} onChange={set('popia_consent')} /> I consent to {v.dealership?.name || 'the dealership'} processing my details to contact me about this vehicle (POPIA).</label>
                            {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
                            <button disabled={state.busy} className="btn-gold w-full rounded-xl py-4 text-sm font-bold uppercase tracking-widest disabled:opacity-50">{state.busy ? 'Sending…' : form.wants_test_drive ? 'Book my test drive' : 'Contact me'}</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
