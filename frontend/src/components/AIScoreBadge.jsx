/**
 * AIScoreBadge — KenganAuto CRM
 * ─────────────────────────────
 * Renders the coloured tier badge for any lead score.
 * Supports four sizes: 'xs' | 'sm' | 'md' | 'lg'
 * When `animated` is true, Burning (90+) pulses.
 */
import React from 'react';
import { Flame, Thermometer, Sun, Snowflake } from 'lucide-react';

/* Must mirror the backend TIERS definition exactly */
export const TIERS = {
    BURNING: { min: 90, label: 'Burning', color: '#DC2626', bg: 'rgba(220,38,38,0.15)', glow: 'rgba(220,38,38,0.55)', emoji: '🔥', icon: Flame, action: 'Drop everything — call NOW' },
    HOT: { min: 71, label: 'Hot', color: '#EA580C', bg: 'rgba(234,88,12,0.15)', glow: 'rgba(234,88,12,0.4)', emoji: '🌶️', icon: Thermometer, action: 'Contact immediately' },
    WARM: { min: 41, label: 'Warm', color: '#D97706', bg: 'rgba(217,119,6,0.15)', glow: 'rgba(217,119,6,0.3)', emoji: '☀️', icon: Sun, action: 'Follow up within 24 hours' },
    COLD: { min: 0, label: 'Cold', color: '#3B7FF5', bg: 'rgba(59,127,245,0.12)', glow: 'rgba(59,127,245,0.2)', emoji: '❄️', icon: Snowflake, action: 'Add to nurture sequence' },
};

export function getTier(score) {
    if (score >= 90) return TIERS.BURNING;
    if (score >= 71) return TIERS.HOT;
    if (score >= 41) return TIERS.WARM;
    return TIERS.COLD;
}

const SIZE_CONFIGS = {
    xs: { ring: 'w-8 h-8 text-[10px]', label: 'hidden', icon: 10, padding: 'p-0', gap: 'gap-1' },
    sm: { ring: 'w-9 h-9 text-xs', label: 'text-[9px]', icon: 12, padding: 'px-2 py-1 rounded-lg', gap: 'gap-1.5' },
    md: { ring: 'w-11 h-11 text-sm', label: 'text-[11px]', icon: 14, padding: 'px-3 py-1.5 rounded-xl', gap: 'gap-2' },
    lg: { ring: 'w-14 h-14 text-base', label: 'text-xs', icon: 16, padding: 'px-4 py-2 rounded-xl', gap: 'gap-2.5' },
};

/**
 * @param {number}  score        0–100
 * @param {'xs'|'sm'|'md'|'lg'} size  default 'sm'
 * @param {boolean} showLabel    show the tier label alongside the score
 * @param {boolean} showIcon     show the tier icon
 * @param {boolean} animated     pulse animation for Burning tier
 * @param {boolean} ring         circular ring mode (score inside circle)
 * @param {string}  className    extra class names
 */
export default function AIScoreBadge({
    score = 0,
    size = 'sm',
    showLabel = false,
    showIcon = false,
    animated = true,
    ring = false,
    className = '',
}) {
    const tier = getTier(score);
    const cfg = SIZE_CONFIGS[size] || SIZE_CONFIGS.sm;
    const Icon = tier.icon;
    const isBurning = score >= 90;

    if (ring) {
        /* Circular ring mode — dial around the score number */
        const radius = size === 'lg' ? 22 : size === 'md' ? 18 : size === 'sm' ? 15 : 12;
        const stroke = size === 'lg' ? 3 : 2.5;
        const svgSize = radius * 2 + stroke * 2 + 4;
        const circumference = 2 * Math.PI * radius;
        const dash = (score / 100) * circumference;

        return (
            <div className={`relative inline-flex items-center justify-center ${className}`}
                style={{ filter: isBurning && animated ? `drop-shadow(0 0 6px ${tier.glow})` : undefined }}>
                <svg
                    width={svgSize} height={svgSize}
                    className={isBurning && animated ? 'animate-pulse' : ''}
                    style={{ transform: 'rotate(-90deg)' }}
                >
                    {/* Background track */}
                    <circle
                        cx={svgSize / 2} cy={svgSize / 2} r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.07)"
                        strokeWidth={stroke}
                    />
                    {/* Progress arc */}
                    <circle
                        cx={svgSize / 2} cy={svgSize / 2} r={radius}
                        fill="none"
                        stroke={tier.color}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${circumference}`}
                        style={{ transition: 'stroke-dasharray 0.6s ease' }}
                    />
                </svg>
                {/* Score in centre */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`font-black leading-none ${cfg.ring}`} style={{ color: tier.color, fontSize: size === 'xs' ? 9 : size === 'sm' ? 11 : size === 'md' ? 13 : 16 }}>
                        {score}
                    </span>
                    {showLabel && (
                        <span className={`font-bold uppercase tracking-wider leading-none mt-0.5 ${cfg.label}`} style={{ color: tier.color, opacity: 0.7, fontSize: 7 }}>
                            {tier.label}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    /* ── Pill/badge mode ── */
    return (
        <div
            className={`inline-flex items-center ${cfg.gap} font-black tracking-tight whitespace-nowrap select-none ${cfg.padding} ${className}`}
            style={{
                background: tier.bg,
                color: tier.color,
                border: `1px solid ${tier.color}30`,
                boxShadow: isBurning && animated ? `0 0 12px ${tier.glow}` : undefined,
                animation: isBurning && animated ? 'pulse-score 2s ease-in-out infinite' : undefined,
            }}
        >
            {showIcon && <Icon size={cfg.icon} strokeWidth={2.5} />}
            <span>{score}</span>
            {showLabel && (
                <span className={`font-bold uppercase tracking-wider opacity-70 ${cfg.label}`}>
                    {tier.label}
                </span>
            )}
        </div>
    );
}

/* ── Score Breakdown panel ── */
export function ScoreBreakdown({ breakdown = [], signals = {}, insights = null, loading = false }) {
    if (loading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-8 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                ))}
            </div>
        );
    }

    const positives = breakdown.filter(b => b.points > 0);
    const negatives = breakdown.filter(b => b.points < 0);
    const total = breakdown.reduce((s, b) => s + b.points, 0);

    return (
        <div className="space-y-4">
            {/* Score ring summary */}
            {positives.length > 0 && (
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Positive Signals</p>
                    <div className="space-y-1.5">
                        {positives.map((b, i) => (
                            <div key={i} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#22C55E' }} />
                                    <span className="text-xs text-white/50 truncate">{b.label}</span>
                                </div>
                                <span className="text-xs font-black flex-shrink-0" style={{ color: '#22C55E' }}>+{b.points}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {negatives.length > 0 && (
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Negative Signals</p>
                    <div className="space-y-1.5">
                        {negatives.map((b, i) => (
                            <div key={i} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#EF4444' }} />
                                    <span className="text-xs text-white/50 truncate">{b.label}</span>
                                </div>
                                <span className="text-xs font-black flex-shrink-0" style={{ color: '#EF4444' }}>{b.points}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-xs font-black uppercase tracking-widest text-white/30">Rule Score</span>
                <span className="text-sm font-black text-white">{Math.min(100, Math.max(0, total))}/100</span>
            </div>

            {/* Claude adjustment note */}
            {insights?.score_adjustment !== undefined && insights.score_adjustment !== 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-white/25">Kengan AI Adjustment</span>
                    <span className="text-xs font-bold" style={{ color: insights.score_adjustment > 0 ? '#22C55E' : '#EF4444' }}>
                        {insights.score_adjustment > 0 ? '+' : ''}{insights.score_adjustment}
                    </span>
                </div>
            )}
        </div>
    );
}

/* ── Seriousness meter bar ── */
export function SeriousnessMeter({ value = 5 }) {
    const pct = (value / 10) * 100;
    const color = value >= 8 ? '#22C55E' : value >= 5 ? '#D97706' : '#3B7FF5';

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
                />
            </div>
            <span className="text-sm font-black flex-shrink-0" style={{ color, minWidth: 24 }}>{value}/10</span>
        </div>
    );
}
