import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../utils/theme';

/** Sidebar row that switches the dashboard between dark and light. */
export default function ThemeToggle() {
    const { theme, toggle } = useTheme();
    const reduce = useReducedMotion();
    const isLight = theme === 'light';
    const Icon = isLight ? Sun : Moon;

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isLight}
            onClick={toggle}
            className="sidebar-icon-btn w-full"
        >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.04] text-white/66">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                        key={theme}
                        initial={reduce ? false : { y: 14, opacity: 0, rotate: -40 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        exit={reduce ? { opacity: 0 } : { y: -14, opacity: 0, rotate: 40 }}
                        transition={{ duration: 0.22, ease: [0.2, 0.7, 0.3, 1] }}
                        className="flex"
                    >
                        <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                    </motion.span>
                </AnimatePresence>
            </div>
            <span className="flex-1 text-left text-sm font-semibold text-white/76">Light mode</span>
            <span
                aria-hidden="true"
                className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ${isLight ? 'bg-[#C9A84C]' : 'bg-white/12'}`}
            >
                <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${isLight ? 'translate-x-4' : ''}`} />
            </span>
        </button>
    );
}
