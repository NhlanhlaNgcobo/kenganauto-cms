import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ScanSearch, Send, Check, X, Loader2, ImagePlus } from 'lucide-react';
import { api, errMsg, API_URL } from '../utils/api';

const zar = (n) => `R ${Math.round(Number(n) || 0).toLocaleString('en-ZA')}`;
const SEV = {
    urgent: { label: 'Urgent', cls: 'bg-red-500/10 text-red-300' },
    soon: { label: 'Soon', cls: 'bg-orange-500/10 text-orange-300' },
    monitor: { label: 'Monitor', cls: 'bg-white/5 text-white/66' },
};

/** Downscale a photo in the browser (max 1280px JPEG) so uploads stay small and fast. */
async function toPayload(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    return { media_type: 'image/jpeg', data: dataUrl.split(',')[1], preview: dataUrl };
}

/**
 * Service-lane inspection for one booking: check-in photos → AI (or checklist) findings,
 * priced, which the advisor approves/declines with the customer or sends on WhatsApp.
 */
export default function InspectionPanel({ booking }) {
    const [state, setState] = useState({ inspection: null, ai_enabled: false, loaded: false });
    const [photos, setPhotos] = useState([]);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState('');
    const fileRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const d = await api.get(`/api/inspections/booking/${booking.id}`);
            setState({ inspection: d.inspection, ai_enabled: d.ai_enabled, loaded: true });
        } catch (e) { setError(errMsg(e, 'Could not load inspection')); setState((s) => ({ ...s, loaded: true })); }
    }, [booking.id]);
    useEffect(() => { setPhotos([]); setSent(''); setError(''); load(); }, [load]);

    const addPhotos = async (files) => {
        setError('');
        try {
            const next = await Promise.all([...files].slice(0, 6 - photos.length).map(toPayload));
            setPhotos((p) => [...p, ...next].slice(0, 6));
        } catch { setError('That file could not be read as a photo.'); }
    };

    const run = async () => {
        setRunning(true); setError('');
        try {
            const d = await api.post(`/api/inspections/booking/${booking.id}`, { photos: photos.map(({ media_type, data }) => ({ media_type, data })) });
            setState((s) => ({ ...s, inspection: d.inspection })); setPhotos([]);
        } catch (e) { setError(errMsg(e, 'Inspection failed')); } finally { setRunning(false); }
    };

    const decide = async (i, status) => {
        const insp = state.inspection;
        const current = insp.findings[i].status;
        const nextStatus = current === status ? 'pending' : status;
        try {
            const d = await api.patch(`/api/inspections/${insp.id}/findings/${i}`, { status: nextStatus });
            setState((s) => ({ ...s, inspection: { ...s.inspection, findings: d.findings } }));
        } catch (e) { setError(errMsg(e)); }
    };

    const send = async () => {
        setError('');
        try { await api.post(`/api/inspections/${state.inspection.id}/send`); setSent('Sent to the customer on WhatsApp. Ask them to reply with the items they approve.'); }
        catch (e) { setError(errMsg(e, 'Could not send')); }
    };

    const insp = state.inspection;
    const approved = insp ? insp.findings.filter((f) => f.status === 'approved').reduce((a, f) => a + Number(f.est_price || 0), 0) : 0;
    const proposed = insp ? insp.findings.reduce((a, f) => a + Number(f.est_price || 0), 0) : 0;

    return (
        <section className="mb-6 rounded-2xl border border-white/10 p-4" aria-labelledby={`insp-${booking.id}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 id={`insp-${booking.id}`} className="flex items-center gap-2 text-sm font-bold text-white"><ScanSearch size={16} className="text-[#C9A84C]" aria-hidden="true" /> Vehicle inspection</h3>
                    <p className="mt-1 text-xs leading-5 text-white/58">
                        {state.ai_enabled ? 'Add check-in photos of tyres, brakes, wipers and body. AI lists what it can see, with prices.' : 'Runs the standard multi-point checklist. Add an Anthropic API key to analyse check-in photos with AI.'}
                    </p>
                </div>
            </div>

            {photos.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                    {photos.map((p, i) => (
                        <div key={i} className="relative">
                            <img src={p.preview} alt={`Check-in photo ${i + 1}`} className="h-20 w-full rounded-lg object-cover" />
                            <button type="button" onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white" aria-label={`Remove photo ${i + 1}`}><X size={12} /></button>
                        </div>
                    ))}
                </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
                <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={photos.length >= 6} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/5 disabled:opacity-50">
                    {photos.length ? <ImagePlus size={14} aria-hidden="true" /> : <Camera size={14} aria-hidden="true" />} {photos.length ? `Add more (${photos.length}/6)` : 'Add photos'}
                </button>
                <button type="button" onClick={run} disabled={running} className="inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-3 py-2 text-xs font-bold text-[#0A0F1E] disabled:opacity-60">
                    {running ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ScanSearch size={14} aria-hidden="true" />}
                    {running ? 'Inspecting…' : insp ? 'Run again' : 'Run inspection'}
                </button>
            </div>

            {error ? <p className="mt-3 text-xs text-red-300" role="alert">{error}</p> : null}

            {insp ? (
                <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="text-xs text-white/66">
                        <span className="mr-2 rounded-full bg-white/5 px-2 py-0.5 font-semibold text-white/80">{insp.engine === 'claude' ? 'AI photo analysis' : 'Checklist'}</span>
                        {insp.summary}
                    </p>
                    {insp.photos?.length ? (
                        <div className="mt-3 flex gap-2 overflow-x-auto">
                            {insp.photos.map((u) => <img key={u} src={`${API_URL}${u}`} alt="Check-in photo" className="h-14 w-20 shrink-0 rounded-md object-cover" loading="lazy" />)}
                        </div>
                    ) : null}
                    <ul className="mt-3 divide-y divide-white/8">
                        {insp.findings.length === 0 ? <li className="py-3 text-sm text-white/66">Nothing needing work was found.</li> : null}
                        {insp.findings.map((f, i) => (
                            <li key={`${f.item}-${i}`} className="py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                                            {f.item}
                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEV[f.severity]?.cls || SEV.monitor.cls}`}>{SEV[f.severity]?.label || f.severity}</span>
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-white/66">{f.recommendation}</p>
                                    </div>
                                    <p className="shrink-0 text-sm font-semibold tabular-nums text-white">{zar(f.est_price)}</p>
                                </div>
                                <div className="mt-2 flex gap-2" role="group" aria-label={`Customer decision for ${f.item}`}>
                                    <button type="button" aria-pressed={f.status === 'approved'} onClick={() => decide(i, 'approved')}
                                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${f.status === 'approved' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300' : 'border-white/10 text-white/66 hover:bg-white/5'}`}>
                                        <Check size={12} aria-hidden="true" /> Approved
                                    </button>
                                    <button type="button" aria-pressed={f.status === 'declined'} onClick={() => decide(i, 'declined')}
                                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${f.status === 'declined' ? 'border-red-400/40 bg-red-500/10 text-red-300' : 'border-white/10 text-white/66 hover:bg-white/5'}`}>
                                        <X size={12} aria-hidden="true" /> Declined
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {insp.findings.length ? (
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                            <p className="text-sm text-white/80">Approved <strong className="tabular-nums text-white">{zar(approved)}</strong> <span className="text-white/58">of {zar(proposed)}</span></p>
                            <button type="button" onClick={send} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/5">
                                <Send size={14} aria-hidden="true" /> {insp.sent_at || sent ? 'Send again on WhatsApp' : 'Send to customer on WhatsApp'}
                            </button>
                        </div>
                    ) : null}
                    {sent ? <p className="mt-2 text-xs text-emerald-300" role="status">{sent}</p> : null}
                </div>
            ) : null}
        </section>
    );
}
