/**
 * Feedback AI — classifies CSI feedback and customer concerns.
 * Uses Claude when ANTHROPIC_API_KEY is configured; otherwise falls back to a
 * deterministic keyword heuristic so the module still works in dev/demo.
 */

'use strict';

const { AIEngine } = require('./ai_engine');

const CATEGORIES = ['workmanship', 'communication', 'turnaround_time', 'pricing', 'staff_attitude', 'vehicle_quality', 'finance_admin', 'facilities', 'praise', 'other'];

const CATEGORY_KEYWORDS = [
    ['turnaround_time', /\b(late|delay|delayed|slow|waited|waiting|took (too )?long|hours|days)\b/i],
    ['communication', /\b(no one called|never called|didn'?t call|update|informed|communicat|respond|reply|ignored)\b/i],
    ['pricing', /\b(expensive|price|overcharg|invoice|quote|cost|bill|charged)\b/i],
    ['workmanship', /\b(not fixed|still|again|scratch|damage|dirty|broken|noise|leak|came back)\b/i],
    ['staff_attitude', /\b(rude|attitude|unfriendly|unprofessional|arrogant|disrespect)\b/i],
    ['finance_admin', /\b(finance|bank|paperwork|natis|registration|licen[cs]e|documents)\b/i],
    ['vehicle_quality', /\b(defect|fault|warning light|faulty|problem with the car)\b/i],
    ['facilities', /\b(coffee|waiting area|parking|toilet|lounge)\b/i],
    ['praise', /\b(great|excellent|amazing|friendly|helpful|thank|awesome|fantastic|professional)\b/i],
];

const NEGATIVE = /\b(bad|terrible|worst|poor|angry|disappointed|unhappy|rude|never|not|late|expensive|useless|frustrat|complain)\b/gi;
const POSITIVE = /\b(good|great|excellent|amazing|happy|friendly|helpful|thank|awesome|fantastic|quick|professional)\b/gi;

function heuristic({ score, comment = '' }) {
    const text = String(comment || '');
    const neg = (text.match(NEGATIVE) || []).length;
    const pos = (text.match(POSITIVE) || []).length;
    let sentiment = 0;
    if (typeof score === 'number') sentiment = (score - 5) / 5; // 0→-1, 10→1
    if (neg || pos) sentiment = (sentiment + (pos - neg) / Math.max(pos + neg, 1)) / 2;
    sentiment = Math.max(-1, Math.min(1, Number(sentiment.toFixed(2))));

    let category = 'other';
    for (const [cat, rx] of CATEGORY_KEYWORDS) {
        if (rx.test(text)) { category = cat; break; }
    }
    if (category === 'other' && typeof score === 'number' && score >= 9) category = 'praise';

    const severity = (typeof score === 'number' && score <= 3) || sentiment <= -0.6 ? 'high'
        : (typeof score === 'number' && score <= 6) || sentiment < -0.2 ? 'medium' : 'low';

    return {
        sentiment,
        category,
        severity,
        summary: text ? text.slice(0, 160) : (typeof score === 'number' ? `Scored ${score}/10 with no comment.` : ''),
        needs_followup: (typeof score === 'number' && score <= 6) || sentiment < -0.3,
        engine: 'heuristic',
    };
}

/**
 * analyzeFeedback({ score, comment, context }) → { sentiment, category, severity, summary, needs_followup, engine }
 */
async function analyzeFeedback({ score, comment, context = '' }) {
    const base = heuristic({ score, comment });
    if (!process.env.ANTHROPIC_API_KEY || !comment) return base;

    const prompt = `You triage customer feedback for a South African car dealership.
Context: ${context || 'n/a'}
Score (0-10): ${score ?? 'n/a'}
Customer comment: """${String(comment).slice(0, 2000)}"""

Respond with ONLY valid JSON:
{"sentiment": <float -1..1>, "category": "<one of ${CATEGORIES.join(' | ')}>", "severity": "<low | medium | high>", "summary": "<one sentence a manager can act on>", "needs_followup": <boolean>}`;

    try {
        const response = await AIEngine.client.messages.create({
            model: AIEngine.MODEL,
            max_tokens: 250,
            messages: [{ role: 'user', content: prompt }],
        });
        const raw = response.content[0].text.trim().replace(/^```json\s*|```$/g, '');
        const json = JSON.parse(raw);
        return {
            sentiment: typeof json.sentiment === 'number' ? Math.max(-1, Math.min(1, json.sentiment)) : base.sentiment,
            category: CATEGORIES.includes(json.category) ? json.category : base.category,
            severity: ['low', 'medium', 'high'].includes(json.severity) ? json.severity : base.severity,
            summary: json.summary || base.summary,
            // A low score always needs a follow-up regardless of model opinion
            needs_followup: Boolean(json.needs_followup) || base.needs_followup,
            engine: 'claude',
        };
    } catch {
        return base;
    }
}

/**
 * generateListingCopy(vehicle) → { text, engine }
 * Advert copy for a stock unit (cf. Auto Trader UK "Co-Driver" descriptions).
 */
async function generateListingCopy(v) {
    const features = Array.isArray(v.features) ? v.features : safeJson(v.features, []);
    const km = v.mileage != null ? `${Number(v.mileage).toLocaleString('en-ZA')} km` : 'low mileage';
    const price = v.price != null ? `R${Number(v.price).toLocaleString('en-ZA')}` : '';
    const fallback = [
        `${v.year} ${v.make} ${v.model}${v.variant ? ' ' + v.variant : ''}${v.colour ? ' in ' + v.colour : ''}.`,
        `${v.condition === 'new' ? 'Brand new' : v.condition === 'demo' ? 'Dealer demo' : 'Pre-owned'} with ${km}.`,
        features.length ? `Highlights: ${features.slice(0, 6).join(', ')}.` : '',
        price ? `Priced at ${price}. Finance and trade-ins welcome — book your test drive today.` : 'Finance and trade-ins welcome — book your test drive today.',
    ].filter(Boolean).join(' ');

    if (!process.env.ANTHROPIC_API_KEY) return { text: fallback, engine: 'template' };

    const prompt = `Write a vehicle advert description (90-130 words) for a South African dealership listing on AutoTrader / Cars.co.za.
Use only these facts — never invent features, service history or warranty details:
${JSON.stringify({ year: v.year, make: v.make, model: v.model, variant: v.variant, colour: v.colour, mileage_km: v.mileage, condition: v.condition, price_zar: v.price, features, notes: v.description }, null, 0)}
Plain text, no headings, no emojis, prices in Rand (R). End with a call to action to book a test drive.`;

    try {
        const response = await AIEngine.client.messages.create({
            model: AIEngine.MODEL,
            max_tokens: 400,
            messages: [{ role: 'user', content: prompt }],
        });
        return { text: response.content[0].text.trim(), engine: 'claude' };
    } catch {
        return { text: fallback, engine: 'template' };
    }
}

function safeJson(val, dflt) {
    if (val == null) return dflt;
    if (typeof val !== 'string') return val;
    try { return JSON.parse(val); } catch { return dflt; }
}

module.exports = { analyzeFeedback, generateListingCopy, heuristic, safeJson, CATEGORIES };
