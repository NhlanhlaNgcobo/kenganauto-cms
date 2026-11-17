/**
 * KenganAuto Notification System & Communication Service
 * ─────────────────────────────────────────────────────────────
 * Centralized dispatcher for Email (Resend), WhatsApp (360dialog), and SMS (Clickatell).
 */

'use strict';

const axios = require('axios');
const whatsappService = require('./whatsapp_service');
const resendService = require('./resend_service');
const clickatellService = require('./clickatell_service');
const twilioService = require('./twilio_service');
const pino = require('pino');
const logger = pino({ name: 'notification-service' });

const RESEND_API_KEY = process.env.RESEND_API_KEY || 'mock_resend_key';
const CLICKATELL_API_KEY = process.env.CLICKATELL_API_KEY || 'mock_clickatell_key';

// MOCK Database for demonstration
let mockNotificationSettings = {
    tenant_id: 1,
    hours: { start: '08:00', end: '19:00' },
    email: {
        new_lead: { active: true, roles: ['sales_exec', 'sales_manager'] },
        finance_app: { active: true, roles: ['finance_manager'] },
        service_confirm: { active: true, roles: ['customer'] },
        service_reminder: { active: true, roles: ['customer'] },
        trade_in_offer: { active: true, roles: ['customer'] },
        deal_won: { active: true, roles: ['sales_exec', 'sales_manager'] },
        weekly_summary: { active: true, roles: ['dealer_principal'] },
        monthly_report: { active: true, roles: ['dealer_principal'] }
    },
    whatsapp: {
        hot_lead: { active: true, roles: ['sales_exec'] },
        customer_arrived: { active: true, roles: ['service_advisor'] },
        vehicle_ready: { active: true, roles: ['customer'] },
        finance_app: { active: true, roles: ['finance_manager'] },
        dp_daily_summary: { active: true, roles: ['dealer_principal'] }
    },
    sms: {
        service_confirm: { active: true, roles: ['customer'] },
        service_reminder: { active: true, roles: ['customer'] },
        finance_outcome: { active: true, roles: ['customer'] }
    }
};

/**
 * Checks if the current time is within allowed notification hours for Staff alerts
 */
function isWithinHours() {
    const now = new Date();
    const [startH, startM] = mockNotificationSettings.hours.start.split(':').map(Number);
    const [endH, endM] = mockNotificationSettings.hours.end.split(':').map(Number);
    const mNow = now.getHours() * 60 + now.getMinutes();
    const mStart = startH * 60 + startM;
    const mEnd = endH * 60 + endM;
    return mNow >= mStart && mNow <= mEnd;
}

/**
 * HTML Email Generator (KenganAuto Navy Blue Branding)
 */
function generateEmailTemplate(title, bodyHtml) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9;">
        <div style="background-color: #0A0F1E; padding: 20px; text-align: center; border-bottom: 4px solid #C9A84C;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px;">KENGAN<span style="color: #C9A84C;">AUTO</span></h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff; color: #333333; line-height: 1.6;">
            <h2 style="color: #0A0F1E; margin-top: 0;">${title}</h2>
            ${bodyHtml}
        </div>
        <div style="background-color: #e5e5e5; padding: 15px; text-align: center; font-size: 12px; color: #666666;">
            &copy; ${new Date().getFullYear()} KenganAuto OS. Confidential communication.
        </div>
    </div>
    `;
}

class NotificationService {
    constructor() {
        this._queue = [];
    }

    // --- SETTINGS MGT ---
    getSettings() { return mockNotificationSettings; }
    updateSettings(newSet) { mockNotificationSettings = { ...mockNotificationSettings, ...newSet }; }

    // --- INTERNAL QUEUE (Legacy Dashboard Suppport) ---
    _pushToQueue(type, message) {
        this._queue.push({
            id: Date.now(), tenant_id: 1, type, message, read: false, created_at: new Date().toISOString()
        });
        if (this._queue.length > 500) this._queue.shift();
    }
    getUnread(tenantId) { return this._queue.filter(n => n.tenant_id === tenantId && !n.read).slice(-50); }
    markRead(id) { const n = this._queue.find(x => x.id === id); if (n) n.read = true; }

    // --- EMAIL DISPATCHER ---
    async sendEmail(to, subject, title, bodyHtml) {
        const html = generateEmailTemplate(title, bodyHtml);
        logger.info(`[EMAIL] To: ${to} | Subject: ${subject}`);
        this._pushToQueue('EMAIL_SENT', `Sent to ${to}: ${subject}`);
        try {
            await resendService.sendEmail({ to, subject, html });
            return { success: true };
        } catch (e) {
            logger.error(`[EMAIL FAIL] ${to}: ${e.message}`);
            return { success: false, error: e.message };
        }
    }

    // --- WHATSAPP DISPATCHER ---
    async sendWhatsApp(to, message, bypassHours = false, tenantId = 1) {
        if (!bypassHours && !isWithinHours()) {
            logger.warn(`[WA BLOCKED] Night-time routing active. Queueing msg for ${to}`);
            return { success: false, queued: true };
        }
        if (!to) {
            // No phone number — just log to queue (e.g. internal alerts without customer phone)
            this._pushToQueue('WHATSAPP_ALERT', message);
            return { success: true, queued_to_log: true };
        }
        logger.info(`[WA] To: ${to} | Msg: ${message}`);
        this._pushToQueue('WHATSAPP_SENT', `Sent to ${to}: ${message}`);
        try {
            await whatsappService.sendText(tenantId, to, message);
            return { success: true };
        } catch (e) { return { success: false, error: e.message }; }
    }

    // --- SMS DISPATCHER (Clickatell Fallback) ---
    async sendSMS(to, message) {
        logger.info(`[SMS] To: ${to} | Msg: ${message}`);
        this._pushToQueue('SMS_SENT', `Sent to ${to}: ${message}`);
        try {
            const res = await clickatellService.sendSMS(to, message);
            if (res.success) return { success: true };
            logger.warn(`[SMS] Clickatell failed (check keys), trying Twilio fallback...`);
            return await twilioService.sendSMS(to, message);
        } catch (e) {
            logger.error(`[SMS FAIL] ${to}: ${e.message}`);
            return { success: false, error: e.message };
        }
    }

    /* ── HIGH-LEVEL TRIGGERS ── */

    async triggerNewLeadAlert(email, phone, lead) {
        if (mockNotificationSettings.email.new_lead.active) {
            const html = `
                <p>A new lead has been assigned to you.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Customer:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${lead.name}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${lead.phone}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Interest:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${lead.vehicle}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>AI Score:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #ef4444; font-weight: bold;">${lead.ai_score}/100</td></tr>
                </table>
                <p style="margin-top: 15px;"><strong>Chatbot Summary:</strong><br/>${lead.summary}</p>
                <a href="#" style="display: inline-block; padding: 10px 20px; background-color: #C9A84C; color: #0A0F1E; text-decoration: none; font-weight: bold; border-radius: 5px; margin-top: 15px;">View Lead in OS</a>
            `;
            await this.sendEmail(email, 'ACTION REQUIRED: New Lead Assigned', 'New Lead Assigned', html);
        }
        if (mockNotificationSettings.whatsapp.hot_lead.active && lead.ai_score >= 70) {
            await this.sendWhatsApp(phone, `🔥 HOT LEAD ALERT: ${lead.name} is looking at a ${lead.vehicle}. AI Score: ${lead.ai_score}. Contact immediately!`);
        }
    }

    async triggerFinanceSubmission(email, phone, clientName, amount) {
        if (mockNotificationSettings.email.finance_app.active) {
            await this.sendEmail(email, 'New Finance Application Submitted', 'Finance Application', `<p>A new finance application has been successfully submitted by ${clientName} for <strong>R ${amount}</strong>.</p>`);
        }
        if (mockNotificationSettings.whatsapp.finance_app.active) {
            await this.sendWhatsApp(phone, `💼 FINANCE: New app submitted by ${clientName} for R${amount}. Please review in F&I portal.`);
        }
    }

    async triggerServiceConfirmation(email, phone, booking) {
        if (mockNotificationSettings.email.service_confirm.active) {
            const html = `
                <p>Hi ${booking.name},</p>
                <p>Your service booking is confirmed.</p>
                <ul><li><strong>Date:</strong> ${booking.date}</li><li><strong>Time:</strong> ${booking.time}</li><li><strong>Location:</strong> KenganAuto Service Center</li></ul>
                <p>Please remember to bring your service booklet.</p>
            `;
            await this.sendEmail(email, 'Service Booking Confirmation', 'Booking Confirmed', html);
        }
        if (mockNotificationSettings.sms.service_confirm.active) {
            await this.sendSMS(phone, `KenganAuto: Service confirmed for ${booking.date} at ${booking.time}. Please bring service book.`);
        }
    }

    async triggerDealWon(email, spName, managerEmail, dealValue) {
        if (mockNotificationSettings.email.deal_won.active) {
            const html = `<p>Congratulations ${spName}! A deal valued at R${dealValue} has been moved to WON.</p>`;
            await this.sendEmail(email, '🎉 DEAL WON: Congratulations!', 'Deal Won', html);
            await this.sendEmail(managerEmail, `Deal Won by ${spName}`, 'Deal Won Alert', html);
        }
    }

    async triggerTestMessage(channel, to) {
        if (channel === 'email') return await this.sendEmail(to, 'KenganAuto Test Email', 'System Test', '<p>This is a test notification from your KenganAuto OS Settings.</p>');
        if (channel === 'whatsapp') return await this.sendWhatsApp(to, 'This is a test WhatsApp message from KenganAuto OS.', true);
        if (channel === 'sms') return await this.sendSMS(to, 'KenganAuto OS Test SMS');
    }

    /**
     * Called when a lead reaches a qualified intent (Test Drive, Finance, Service, Trade-In).
     * Notifies the sales team via the internal CRM queue.
     * @param {object} options - { tenant, lead, conversationId, intent, channel }
     */
    async notifyLeadQualified({ tenant, lead, conversationId, intent, channel }) {
        const tenantId = tenant?.id || 1;
        const leadName = lead?.customer_name || lead?.name || 'Unknown Customer';
        const vehicle = lead?.vehicle_interest || lead?.vehicle || 'a vehicle';
        const intentLabel = intent?.replace(/_/g, ' ').toLowerCase() || 'qualified intent';

        const message = `🎯 QUALIFIED LEAD: ${leadName} expressed a ${intentLabel} interest in ${vehicle} via ${channel || 'chatbot'}. (Tenant: ${tenant?.name || tenantId})`;
        this._pushToQueue('LEAD_QUALIFIED', message);
        logger.info({ tenantId, leadName, intent, channel }, 'Lead qualified notification triggered');

        // WhatsApp alert to team if hot enough (score >= 70)
        if (mockNotificationSettings.whatsapp.hot_lead.active && (lead?.ai_score >= 70 || intent === 'TEST_DRIVE')) {
            try {
                await whatsappService.sendText(tenantId, null, message); // null phone = internal queue log only
            } catch { /* non-fatal */ }
        }
    }

    /**
     * Called when a customer requests a human agent (frustrated or explicit handoff).
     * This triggers an urgent escalation alert to team.
     * @param {object} options - { tenant, lead, conversationId, channel }
     */
    async notifyHumanHandoff({ tenant, lead, conversationId, channel }) {
        const tenantId = tenant?.id || 1;
        const leadName = lead?.customer_name || lead?.name || 'Unknown Customer';
        const phone = lead?.customer_phone || lead?.phone || 'No phone';

        const message = `🚨 HUMAN HANDOFF REQUIRED: ${leadName} (${phone}) is requesting a real agent via ${channel || 'chatbot'}. Conversation ID: ${conversationId || 'N/A'}`;
        this._pushToQueue('HUMAN_HANDOFF', message);
        logger.warn({ tenantId, leadName, channel, conversationId }, 'Human handoff triggered');
    }
}

module.exports = new NotificationService();
