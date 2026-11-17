/**
 * KenganInsightsPanel — Lead Detail AI Analysis Display
 * ──────────────────────────────────────────────────────
 * Shows the Claude AI deep analysis for a lead:
 *   - Score ring (live rule-based) + tier
 *   - Seriousness meter
 *   - Timeline badge
 *   - Recommended vehicle
 *   - Salesperson next action (highlighted)
 *   - Score breakdown (positive/negative signals)
 *   - Trigger rescore button
 */
import React, { useState, useCallback } from 'react';
import {
    Zap, RefreshCw, Target, Clock, Car, ArrowRight,
    ChevronDown, ChevronUp, Flame, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import AIScoreBadge, { ScoreBreakdown, SeriousnessMeter, getTier } from './AIScoreBadge';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function authHeaders() {
    const token = localStorage.getItem('ka_token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
}

const TIMELINE_COLORS = {
    'Immediate (this week)': { color: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
    'Short-term (1 month)': { color: '#EA580C', bg: 'rgba(234,88,12,0.12)' },
    'Medium-term (1-3 months)': { color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
    'Long-term (3+ months)': { color: '#60A5FA', bg: 'rgba(59,127,245,0.12)' },
    'Unknown': { color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
};

/* ════════════════════════════════════════════════════════════ */
export default function KenganInsightsPanel({ lead, onRescoreComplete }) {
    const [scoreData, setScoreData] = useState(null);
    const [rescoring, setRescoring] = useState(false);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [breakdownOpen, setBreakdownOpen] = useState(false);
    const [error, setError] = useState(null);

    const currentScore = scoreData?.score ?? lead?.ai_score ?? 0;
    const currentTier = getTier(currentScore);
    const insights = scoreData?.insights ?? (lead?.ai_insights ? (typeof lead.ai_insights === 'string' ? tryParse(lead.ai_insights) : lead.ai_insights) : null);
    const breakdown = scoreData?.breakdown ?? [];
    const signals = scoreData?.signals ?? {};

    function tryParse(str) { try { return JSON.parse(str); } catch { return null; } }

    /* Load score breakdown from API */
    const loadScore = useCallback(async () => {
        if (!lead?.id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_BASE}/api/leads/${lead.id}/score`, { headers: authHeaders() });
            setScoreData(res.data);
        } catch {
            setError('Could not load score data.');
        } finally {
            setLoading(false);
        }
    }, [lead?.id]);

    /* Trigger Claude rescore */
    const triggerRescore = useCallback(async () => {
        if (!lead?.id) return;
        setRescoring(true);
        setError(null);
        try {
            await axios.post(`${API_BASE}/api/leads/${lead.id}/score`, {}, { headers: authHeaders() });
            // Wait 3s for async Claude analysis to complete, then reload
            setTimeout(async () => {
                await loadScore();
                setRescoring(false);
                onRescoreComplete?.();
            }, 3500);
        } catch {
            setError('Rescore failed. Check your API key.');
            setRescoring(false);
        }
    }, [lead?.id, loadScore, onRescoreComplete]);

    /* Load score on first expand */
    const handleToggleExpand = useCallback(async () => {
        if (!expanded && !scoreData) {
            await loadScore();
        }
        setExpanded(p => !p);
    }, [expanded, scoreData, loadScore]);

    const tlStyle = TIMELINE_COLORS[insights?.timeline] || TIMELINE_COLORS['Unknown'];

    return (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(13,21,38,0.6)', border: `1px solid ${currentTier.color}22` }}>
            {/* ── Header ── */}
            <button
                onClick={handleToggleExpand}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                style={{ borderBottom: expanded ? `1px solid ${currentTier.color}18` : 'none' }}
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg" style={{ background: `${currentTier.color}18` }}>
                        <Zap size={14} style={{ color: currentTier.color }} />
                    </div>
                    <div className="text-left">
                        <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'rgba(240,237,232,0.62)' }}>Kengan AI Scoring</p>
                        <p className="text-sm font-bold text-white leading-tight">
                            {currentTier.emoji} {currentTier.label} Lead
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Score ring */}
                    <AIScoreBadge score={currentScore} size="md" ring animated />
                    {expanded ? <ChevronUp size={14} className="text-white/58" /> : <ChevronDown size={14} className="text-white/58" />}
                </div>
            </button>

            {/* ── Body ── */}
            {expanded && (
                <div className="px-5 py-4 space-y-5">

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl text-xs text-red-400"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                            <AlertTriangle size={13} /> {error}
                        </div>
                    )}

                    {/* ── Tier action ── */}
                    <div className="p-3 rounded-xl flex items-start gap-3"
                        style={{ background: `${currentTier.color}10`, border: `1px solid ${currentTier.color}20` }}>
                        <Flame size={14} className="flex-shrink-0 mt-0.5" style={{ color: currentTier.color }} />
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest mb-0.5 opacity-60" style={{ color: currentTier.color }}>Recommended Action</p>
                            <p className="text-sm font-bold" style={{ color: currentTier.color }}>{currentTier.action}</p>
                        </div>
                    </div>

                    {/* ── AI Insights (from Claude) ── */}
                    {insights ? (
                        <div className="space-y-4">
                            {/* Summary */}
                            {insights.summary && (
                                <div className="p-3.5 rounded-xl text-[13px] leading-relaxed"
                                    style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.1)', color: 'rgba(240,237,232,0.75)' }}>
                                    {insights.summary}
                                </div>
                            )}

                            {/* Stats row */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Seriousness */}
                                <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Target size={11} className="text-white/58" />
                                        <p className="text-[11px] font-black uppercase tracking-widest text-white/58">Seriousness</p>
                                    </div>
                                    <SeriousnessMeter value={insights.seriousness || 5} />
                                </div>

                                {/* Timeline */}
                                <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Clock size={11} className="text-white/58" />
                                        <p className="text-[11px] font-black uppercase tracking-widest text-white/58">Timeline</p>
                                    </div>
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[12px] font-black"
                                        style={{ background: tlStyle.bg, color: tlStyle.color }}>
                                        {insights.timeline || 'Unknown'}
                                    </span>
                                </div>
                            </div>

                            {/* Best vehicle match */}
                            {insights.recommended_vehicle && (
                                <div className="flex items-center gap-3 p-3 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <Car size={14} className="text-white/58 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-white/58 mb-0.5">Best Match Vehicle</p>
                                        <p className="text-sm font-bold text-white truncate">{insights.recommended_vehicle}</p>
                                    </div>
                                </div>
                            )}

                            {/* Next action */}
                            {insights.next_action && (
                                <div className="flex items-start gap-3 p-3 rounded-xl"
                                    style={{ background: 'rgba(59,127,245,0.08)', border: '1px solid rgba(59,127,245,0.15)' }}>
                                    <ArrowRight size={14} className="text-[#3B7FF5] flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-widest text-[#3B7FF5]/50 mb-0.5">Next Action</p>
                                        <p className="text-[13px] text-[#60A5FA] leading-relaxed">{insights.next_action}</p>
                                    </div>
                                </div>
                            )}

                            {/* AI-powered badge */}
                            {insights.ai_powered && (
                                <div className="flex items-center gap-1.5 text-[12px] text-white/58">
                                    <Zap size={10} />
                                    Analysis by Claude claude-sonnet-4-5 · {insights.scored_at ? new Date(insights.scored_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-xs text-white/58 mb-3">
                                {loading ? 'Loading AI analysis…' : 'No Claude analysis yet for this lead.'}
                            </p>
                            {!loading && (
                                <button onClick={triggerRescore}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                                    style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
                                    <Zap size={13} /> Generate Analysis
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── Score Breakdown (expandable) ── */}
                    {(breakdown.length > 0 || !scoreData) && (
                        <div>
                            <button
                                onClick={async () => {
                                    if (!scoreData) await loadScore();
                                    setBreakdownOpen(p => !p);
                                }}
                                className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/58 hover:text-white/58 transition-colors w-full"
                            >
                                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                <span className="flex-shrink-0 flex items-center gap-1.5">
                                    {breakdownOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                    Score Breakdown
                                </span>
                                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                            </button>

                            {breakdownOpen && (
                                <div className="mt-3">
                                    <ScoreBreakdown
                                        breakdown={breakdown}
                                        signals={signals}
                                        insights={insights}
                                        loading={loading}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Rescore button ── */}
                    <button
                        onClick={triggerRescore}
                        disabled={rescoring}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
                        style={{ background: rescoring ? 'rgba(255,255,255,0.03)' : 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.12)', color: rescoring ? 'rgba(201,168,76,0.4)' : '#C9A84C' }}
                    >
                        {rescoring
                            ? <><RefreshCw className="animate-spin" size={13} /> Claude is analysing…</>
                            : <><RefreshCw size={13} /> Rescore with AI</>
                        }
                    </button>

                    {rescoring && (
                        <p className="text-center text-[12px] text-white/58">
                            Analysis usually takes 3–5 seconds. Score will update automatically.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
