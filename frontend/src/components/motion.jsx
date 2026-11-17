/**
 * Motion primitives built on framer-motion.
 *
 * The same principles carry over:
 *  - one orchestrated entrance, then calm
 *  - scroll reveals fire once, from a visible resting baseline
 *  - transform/opacity only (compositor-friendly)
 *  - every effect degrades to "just show it" under prefers-reduced-motion
 *
 * Primitives: Reveal, Stagger + StaggerItem, CountUp, Magnetic, TiltCard.
 */

import React from 'react';
import {
    motion,
    useReducedMotion,
    useInView,
    useMotionValue,
    useSpring,
    animate,
} from 'framer-motion';

const EASE = [0.2, 0.7, 0.3, 1];

/* ── Reveal — fade/translate in once on scroll ─────────────── */
export function Reveal({ children, y = 24, delay = 0, duration = 0.6, className = '', as = 'div', amount = 0.2, style }) {
    const reduce = useReducedMotion();
    const MotionTag = motion[as] || motion.div;
    if (reduce) return <div className={className} style={style}>{children}</div>;
    return (
        <MotionTag
            className={className}
            style={style}
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount }}
            transition={{ duration, ease: EASE, delay }}
        >
            {children}
        </MotionTag>
    );
}

/* ── Stagger container + item (for grids / lists) ──────────── */
export function Stagger({ children, className = '', stagger = 0.07, delayChildren = 0, amount = 0.2, once = true }) {
    const reduce = useReducedMotion();
    if (reduce) return <div className={className}>{children}</div>;
    return (
        <motion.div
            className={className}
            initial="hidden"
            whileInView="show"
            viewport={{ once, amount }}
            variants={{ show: { transition: { staggerChildren: stagger, delayChildren } } }}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({ children, className = '', y = 22, style }) {
    const reduce = useReducedMotion();
    if (reduce) return <div className={className} style={style}>{children}</div>;
    return (
        <motion.div
            className={className}
            style={style}
            variants={{
                hidden: { opacity: 0, y },
                show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
            }}
        >
            {children}
        </motion.div>
    );
}

/* ── CountUp — animate a number into view ──────────────────── */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-ZA'), duration = 1.1, className = '' }) {
    const ref = React.useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.4 });
    const reduce = useReducedMotion();
    const numeric = Number.isFinite(value);
    const [display, setDisplay] = React.useState(() => format(numeric ? (reduce ? value : 0) : value));

    React.useEffect(() => {
        if (!numeric) { setDisplay(format(value)); return; }
        if (!inView) return;
        if (reduce) { setDisplay(format(value)); return; }
        const controls = animate(0, value, {
            duration,
            ease: EASE,
            onUpdate: (v) => setDisplay(format(v)),
        });
        return () => controls.stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inView, value, numeric, reduce]);

    return <span ref={ref} className={className}>{display}</span>;
}

/* ── Magnetic — pointer-follow wrapper for CTAs ────────────── */
export function Magnetic({ children, className = '', strength = 0.3 }) {
    const reduce = useReducedMotion();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
    const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });
    const ref = React.useRef(null);

    if (reduce) return <span className={className}>{children}</span>;

    const onMove = (e) => {
        if (window.matchMedia('(pointer:coarse)').matches) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * (strength + 0.1));
    };
    const reset = () => { x.set(0); y.set(0); };

    return (
        <motion.span
            ref={ref}
            className={`mag inline-flex ${className}`}
            style={{ x: sx, y: sy }}
            onPointerMove={onMove}
            onPointerLeave={reset}
        >
            {children}
        </motion.span>
    );
}

/* ── TiltCard — subtle 3D pointer parallax ─────────────────── */
export function TiltCard({ children, className = '', max = 8 }) {
    const reduce = useReducedMotion();
    const rx = useMotionValue(0);
    const ry = useMotionValue(0);
    const srx = useSpring(rx, { stiffness: 200, damping: 20 });
    const sry = useSpring(ry, { stiffness: 200, damping: 20 });
    const ref = React.useRef(null);

    if (reduce) return <div className={className}>{children}</div>;

    const onMove = (e) => {
        if (window.matchMedia('(pointer:coarse)').matches) return;
        const r = ref.current.getBoundingClientRect();
        ry.set((e.clientX - r.left - r.width / 2) / r.width * max);
        rx.set(-(e.clientY - r.top - r.height / 2) / r.height * max);
    };
    const reset = () => { rx.set(0); ry.set(0); };

    return (
        <div style={{ perspective: 1100 }}>
            <motion.div
                ref={ref}
                className={`tilt-card ${className}`}
                style={{ rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d' }}
                onPointerMove={onMove}
                onPointerLeave={reset}
            >
                {children}
            </motion.div>
        </div>
    );
}

