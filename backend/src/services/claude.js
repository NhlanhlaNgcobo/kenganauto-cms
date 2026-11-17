/**
 * Thin Claude helper for short, latency-sensitive tasks (lead replies, photo inspection).
 * Returns null when no ANTHROPIC_API_KEY is configured or the call fails, so every caller
 * keeps a deterministic fallback and the demo works offline.
 */

'use strict';

const { AIEngine } = require('./ai_engine');

const MODEL = 'claude-opus-5-5';

const enabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

/**
 * ask({ system, content, maxTokens }) → string | null
 * `content` is a string or an array of content blocks (text / image).
 */
async function ask({ system, content, maxTokens = 1024 }) {
    if (!enabled()) return null;
    try {
        const response = await AIEngine.client.beta.messages.create({
            model: MODEL,
            max_tokens: maxTokens,
            // Short, simple tasks: low effort keeps replies fast. If a request is declined by a
            // safety classifier, the API retries it on a fallback model inside the same call.
            output_config: { effort: 'low' },
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            system,
            messages: [{ role: 'user', content }],
        });
        if (response.stop_reason === 'refusal') return null;
        const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
        return text || null;
    } catch (err) {
        console.error('[claude] request failed:', err?.status || '', err?.message);
        return null;
    }
}

/** ask() and parse the first JSON object/array in the reply. */
async function askJson(opts) {
    const text = await ask(opts);
    if (!text) return null;
    const m = text.match(/[[{][\s\S]*[\]}]/);
    try { return m ? JSON.parse(m[0]) : null; } catch { return null; }
}

module.exports = { ask, askJson, enabled, MODEL };
