import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function CollapsibleSection({ title, subtitle, defaultOpen = false, action, children }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-white/10 last:border-b-0">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 py-4 text-left"
            >
                <div>
                    <p className="text-base font-semibold text-white">{title}</p>
                    {subtitle ? <p className="mt-1 text-sm leading-6 text-white/58">{subtitle}</p> : null}
                </div>
                <div className="flex items-center gap-3">
                    {action}
                    {open ? <ChevronUp size={18} className="text-white/66" /> : <ChevronDown size={18} className="text-white/66" />}
                </div>
            </button>

            {open ? <div className="pb-5">{children}</div> : null}
        </div>
    );
}
