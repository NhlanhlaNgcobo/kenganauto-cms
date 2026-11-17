/**
 * Notifications Management Module — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * Manges toggles, roles, routing hours, and template previews.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const notificationService = require('../services/notification_service');

/* ─────────────────────────────────────────────────────────────
   GET /api/notifications/settings
   ───────────────────────────────────────────────────────────── */
router.get('/settings', authenticate, (req, res) => {
    try {
        const settings = notificationService.getSettings();
        res.json({ success: true, settings });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/* ─────────────────────────────────────────────────────────────
   PUT /api/notifications/settings  — Admin only
   ───────────────────────────────────────────────────────────── */
router.put('/settings', authenticate, (req, res) => {
    try {
        // Only admins and dealer principals should manage global notification routing
        if (!['admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only administrators can update notification settings.' });
        }
        notificationService.updateSettings(req.body);
        res.json({ success: true, settings: notificationService.getSettings() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/* ─────────────────────────────────────────────────────────────
   POST /api/notifications/test
   ───────────────────────────────────────────────────────────── */
router.post('/test', authenticate, async (req, res) => {
    try {
        const { channel, destination } = req.body;
        if (!channel || !destination) {
            return res.status(400).json({ error: 'Missing channel or destination.' });
        }

        await notificationService.triggerTestMessage(channel, destination);
        res.json({ success: true, message: `Test ${channel} dispatched.` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/notifications/preview/:template
   ───────────────────────────────────────────────────────────── */
router.get('/preview/:template', authenticate, async (req, res) => {
    try {
        const templateId = req.params.template;
        let bodyHtml = '<p>No preview defined for this template.</p>';
        let title = 'Template Preview';

        if (templateId === 'new_lead') {
            title = 'New Lead Assigned';
            bodyHtml = `
                <p>A new lead has been assigned to you.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Customer:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">Test Customer</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">082 555 1234</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Interest:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">VW Golf 8 R</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>AI Score:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #ef4444; font-weight: bold;">92/100</td></tr>
                </table>
                <p style="margin-top: 15px;"><strong>Chatbot Summary:</strong><br/>Customer wants to test drive this weekend.</p>
                <a href="#" style="display: inline-block; padding: 10px 20px; background-color: #C9A84C; color: #0A0F1E; text-decoration: none; font-weight: bold; border-radius: 5px; margin-top: 15px;">View Lead in OS</a>
            `;
        }

        // Just piggy back off the internal template generator
        const NotificationServiceProxy = require('../services/notification_service');
        // Actually generateEmailTemplate isn't exported in the class, so we rewrite it safely:
        const html = `
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

        res.send(html); // Render directly as HTML response!
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = { router };
