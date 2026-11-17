/**
 * Instant AI lead responder — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * The best-evidenced conversion lever in the research (Impel: +26% lead-to-sale,
 * Maruti Suzuki / Hyundai India on WhatsApp): answer every new lead within seconds,
 * day or night, and move it towards an appointment.
 *
 * respond() runs right after a lead is captured. It drafts a short WhatsApp reply
 * (Claude when ANTHROPIC_API_KEY is set, a tailored template otherwise), queues it,
 * logs the conversation, and stamps leads.first_response_at / first_response_by = 'ai'
 * so the AI Impact report can measure speed-to-lead honestly.
 */

'use strict';

const knex = require('../config/db');
const claude = require('./claude');
const whatsappSvc = require('./whatsapp_service');

const nowIso = () => new Date().toISOString();
const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'there';
const zar = (n) => `R${Math.round(Number(n) || 0).toLocaleString('en-ZA')}`;

function isAfterHours(d = new Date()) {
    const day = d.getDay(); const h = d.getHours();
    if (day === 0) return true;
    if (day === 6) return h < 8 || h >= 13;
    return h < 8 || h >= 17;
}

function template(tenant, kind, { contact, vehicle, extra = {} }) {
    const name = firstName(contact.name);
    const car = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'the car you asked about';
    const later = isAfterHours() ? 'first thing tomorrow morning' : 'within the hour';
    switch (kind) {
        case 'test_drive':
            return `Hi ${name}, it's ${tenant.name}. Thanks for booking a test drive in the ${car}${extra.slot ? ` for ${extra.slot}` : ''}. We've provisionally held that slot for you. Please bring your driver's licence. Reply YES to confirm or suggest another time.`;
        case 'finance':
            return `Hi ${name}, it's ${tenant.name}. We've received your finance pre-qualification${vehicle ? ` for the ${car}` : ''}${extra.est_monthly ? ` (est. ${zar(extra.est_monthly)} pm)` : ''}. To submit to the banks we'll need your ID, 3 months' payslips and 3 months' bank statements. You can send them here on WhatsApp. Our F&I manager will call you ${later}.`;
        case 'trade_in':
            return `Hi ${name}, it's ${tenant.name}. Thanks for valuing your ${extra.trade || 'car'}. Your estimate is ${extra.range || 'with our team'}. A quick 15-minute inspection gives you a firm offer. What day suits you to pop in?`;
        case 'online_deal':
            return `Hi ${name}, it's ${tenant.name}. Your ${car} is reserved for you (ref ${extra.reference}) for 48 hours. Next step: ${extra.payment === 'finance' ? "send your ID, 3 months' payslips and bank statements here so we can submit to the banks" : 'we\'ll send the sale agreement for signature'}. Your sales executive will call you ${later}.`;
        case 'callback':
            return `Hi ${name}, it's ${tenant.name}. Thanks for your callback request${vehicle ? ` about the ${car}` : ''}. A sales executive will call you ${later}. Is there a time that works best?`;
        default:
            return `Hi ${name}, it's ${tenant.name}. Thanks for your enquiry${vehicle ? ` about the ${car}` : ''}. It's available and we'd love to show it to you. Would you like to book a test drive? Reply with a day and time that suits you.`;
    }
}

async function draft(tenant, kind, ctx) {
    const fallback = template(tenant, kind, ctx);
    if (!claude.enabled()) return { text: fallback, engine: 'template' };
    const { contact, vehicle, extra = {}, message } = ctx;
    const facts = {
        dealership: tenant.name, location: [tenant.address, tenant.city].filter(Boolean).join(', '),
        lead_type: kind, customer_first_name: firstName(contact.name),
        vehicle: vehicle ? { year: vehicle.year, make: vehicle.make, model: vehicle.model, variant: vehicle.variant, price_zar: Number(vehicle.price), status: vehicle.status } : null,
        customer_message: message || null, details: extra, after_hours: isAfterHours(),
    };
    const text = await claude.ask({
        system: `You write the first WhatsApp reply from a South African car dealership to a customer who has just submitted a form on the dealer's website. Write in warm, plain South African English, under 70 words, no emojis, no markdown. Thank them, confirm what they asked for using only the facts given, and end with one clear question that moves them towards a visit or test drive. Never invent prices, availability, discounts or finance approvals that are not in the facts. If after_hours is true, say a team member will follow up in the morning.`,
        content: `Facts (JSON): ${JSON.stringify(facts)}\n\nIf the customer's message asks something the facts can't answer, say a sales executive will confirm. Here is a reply that is acceptable if you have nothing better:\n${fallback}`,
        maxTokens: 400,
    });
    return text ? { text, engine: 'claude' } : { text: fallback, engine: 'template' };
}

/**
 * respond(tenant, leadId, kind, { contact, vehicle, extra, message, visitorId })
 * Never throws: lead capture must succeed even if the reply fails.
 */
async function respond(tenant, leadId, kind, ctx) {
    const started = Date.now();
    try {
        const lead = await knex('leads').where({ id: leadId, tenant_id: tenant.id }).first();
        if (!lead || lead.first_response_at) return null;
        const { text, engine } = await draft(tenant, kind, ctx);
        const sentAt = nowIso();

        Promise.resolve().then(() => whatsappSvc.sendText(tenant.id, ctx.contact.phone, text)).catch((e) => console.error('[instant-responder] send failed', e.message));

        await knex('conversations').insert({
            tenant_id: tenant.id, lead_id: leadId, channel: 'whatsapp',
            messages: JSON.stringify([{ role: 'assistant', content: text, timestamp: sentAt, auto: true }]),
            ai_summary: `Instant AI reply to a website ${kind.replace('_', ' ')} (${engine}).`,
            intent_detected: { test_drive: 'TEST_DRIVE', finance: 'FINANCE_APPLICATION', trade_in: 'TRADE_IN', online_deal: 'PURCHASE' }[kind] || 'VEHICLE_ENQUIRY',
            created_at: sentAt, updated_at: sentAt,
        }).catch((e) => console.error('[instant-responder] conversation log failed', e.message));

        await knex('leads').where({ id: leadId }).update({
            first_response_at: sentAt, first_response_by: 'ai', last_contact_at: sentAt,
            status: lead.status === 'new' ? 'contacted' : lead.status, updated_at: sentAt,
        });

        const secs = Math.max(1, Math.round((Date.now() - new Date(lead.created_at).getTime()) / 1000));
        await knex('website_events').insert({
            tenant_id: tenant.id, type: 'ai_reply',
            label: `AI replied to ${firstName(ctx.contact.name)} on WhatsApp in ${secs < 60 ? `${secs}s` : `${Math.round(secs / 60)} min`}`,
            lead_id: leadId, vehicle_id: ctx.vehicle?.id || null, visitor_id: ctx.visitorId || null,
            meta: JSON.stringify({ engine, ms: Date.now() - started }), created_at: nowIso(),
        }).catch(() => {});
        return { text, engine, seconds: secs };
    } catch (e) {
        console.error('[instant-responder]', e.message);
        return null;
    }
}

/** Fire-and-forget wrapper used by capture endpoints. */
function respondLater(tenant, leadId, kind, ctx) {
    setImmediate(() => { respond(tenant, leadId, kind, ctx); });
}

module.exports = { respond, respondLater, template, isAfterHours };
