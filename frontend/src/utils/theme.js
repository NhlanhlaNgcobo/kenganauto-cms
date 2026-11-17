import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'ka_theme';
const listeners = new Set();

function read() {
    try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
}

/** Apply the stored theme to <html>. Called once before React renders so there is no flash. */
export function applyStoredTheme() {
    document.documentElement.dataset.theme = read();
}

export function setTheme(next) {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    root.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch { /* private mode: theme just won't persist */ }
    listeners.forEach((fn) => fn());
    window.setTimeout(() => root.classList.remove('theme-switching'), 320);
}

function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function useTheme() {
    const theme = useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme || 'dark');
    const toggle = useCallback(() => setTheme(theme === 'light' ? 'dark' : 'light'), [theme]);
    return { theme, toggle };
}
