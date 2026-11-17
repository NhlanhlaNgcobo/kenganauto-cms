import React, { useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Sparkles, Printer, Copy, Check } from 'lucide-react';
import { api, errMsg } from '../utils/api';

/**
 * Silent Salesman QR + AI listing copy for a single stock unit.
 * Rendered inside the Stock "View vehicle" slide-over.
 */
export default function ShowroomTools({ vehicle, onDescriptionSaved }) {
    const [qr, setQr] = useState(null); // { url, dataUrl }
    const [copy, setCopy] = useState(null); // { text, engine }
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const makeQr = async () => {
        setBusy('qr'); setError('');
        try {
            const r = await api.get(`/api/showroom/qr/${vehicle.id}`);
            const dataUrl = await QRCode.toDataURL(r.url, { width: 640, margin: 1, errorCorrectionLevel: 'M' });
            setQr({ url: r.url, dataUrl });
        } catch (e) { setError(errMsg(e, 'Could not create QR code')); }
        setBusy('');
    };

    const printQr = () => {
        const w = window.open('', '_blank', 'width=600,height=800');
        if (!w) return;
        const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
        const price = vehicle.price != null ? `R${Number(vehicle.price).toLocaleString('en-ZA')}` : '';
        w.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px}h1{margin:0 0 4px;font-size:28px}p{margin:4px 0;color:#444}img{width:320px;margin:24px auto}small{color:#888}</style></head><body><h1>${title}</h1><p>${vehicle.variant || ''}</p><p style="font-size:24px;font-weight:700">${price}</p><img src="${qr.dataUrl}" alt="QR"/><p><b>Scan for details &amp; to book a test drive</b></p><small>Stock ${vehicle.stock_number}</small><script>window.onload=()=>window.print()</script></body></html>`);
        w.document.close();
    };

    const makeCopy = async () => {
        setBusy('ai'); setError('');
        try { setCopy(await api.post(`/api/showroom/ai-description/${vehicle.id}`)); } catch (e) { setError(errMsg(e, 'Could not generate description')); }
        setBusy('');
    };

    const saveCopy = async () => {
        setBusy('save'); setError('');
        try {
            await api.patch(`/api/stock/${vehicle.id}`, { description: copy.text });
            onDescriptionSaved?.(copy.text);
        } catch (e) { setError(errMsg(e, 'Could not save description')); }
        setBusy('');
    };

    const btn = 'flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest hover:bg-white/5 disabled:opacity-50';

    return (
        <div className="space-y-4 rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/[0.04] p-4">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#C9A84C]">Showroom tools</p>
            <div className="flex gap-2">
                <button onClick={makeQr} disabled={busy === 'qr'} className={btn}><QrCode size={14} /> {busy === 'qr' ? 'Creating…' : 'Silent Salesman QR'}</button>
                <button onClick={makeCopy} disabled={busy === 'ai'} className={btn}><Sparkles size={14} /> {busy === 'ai' ? 'Writing…' : 'AI advert copy'}</button>
            </div>

            {qr ? (
                <div className="flex items-center gap-4">
                    <img src={qr.dataUrl} alt="Vehicle QR code" className="h-28 w-28 rounded-lg bg-white p-1" />
                    <div className="min-w-0 space-y-2 text-xs text-white/66">
                        <p>Print this for the windscreen. A scan opens the vehicle page, and an enquiry lands in Leads as a walk-in with high intent.</p>
                        <button onClick={printQr} className="flex items-center gap-1.5 font-semibold text-[#C9A84C] hover:underline"><Printer size={13} /> Print card</button>
                    </div>
                </div>
            ) : null}

            {copy ? (
                <div className="space-y-2">
                    <textarea value={copy.text} onChange={(e) => setCopy({ ...copy, text: e.target.value })} rows={6} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-6 text-white/80 focus:outline-none" />
                    <div className="flex items-center justify-between text-xs text-white/58">
                        <span>{copy.engine === 'claude' ? 'Written by AI from stock data only. Check it before publishing.' : 'Template draft (set ANTHROPIC_API_KEY for AI copy)'}</span>
                        <div className="flex gap-3">
                            <button onClick={() => { navigator.clipboard?.writeText(copy.text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center gap-1 text-white/70 hover:text-white">{copied ? <Check size={12} /> : <Copy size={12} />} Copy</button>
                            <button onClick={saveCopy} disabled={busy === 'save'} className="font-semibold text-[#C9A84C] hover:underline">{busy === 'save' ? 'Saving…' : 'Save to listing'}</button>
                        </div>
                    </div>
                </div>
            ) : null}

            {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </div>
    );
}
