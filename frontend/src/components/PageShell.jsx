import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// The heading carries the page; no eyebrow/kicker label above it (impeccable craft-floor ban).
export function PageShell({ title, description, actions, children, maxWidth = 'max-w-7xl' }) {
    const reduce = useReducedMotion();
    const headerAnim = reduce
        ? {}
        : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: [0.2, 0.7, 0.3, 1] } };

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <div className={`mx-auto w-full ${maxWidth} px-4 py-8 md:px-8`}>
                <motion.header className="mb-8 flex flex-wrap items-start justify-between gap-4" {...headerAnim}>
                    <div className="max-w-3xl">
                        <h1 className="font-outfit text-3xl font-black text-white md:text-4xl">{title}</h1>
                        {description ? <p className="mt-3 text-sm leading-7 text-white/66 md:text-base">{description}</p> : null}
                    </div>
                    {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
                </motion.header>

                <div className="space-y-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

export function Surface({ children, className = '' }) {
    return (
        <section className={`rounded-3xl border border-white/10 bg-[#121A2B] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.18)] ${className}`}>
            {children}
        </section>
    );
}
