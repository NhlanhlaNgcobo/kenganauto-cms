const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const crypto = require('crypto');
const path = require('path');
const tenantMiddleware = require('./middleware/tenant');
const authRouter = require('./modules/auth');
const chatbotRouter = require('./modules/chatbot');
const whatsappSettingsRouter = require('./modules/whatsapp_settings');
const webhooksRouter = require('./modules/webhooks');
const webhooksStripeRouter = require('./modules/webhooks_stripe');
const widgetSettingsRouter = require('./modules/widget_settings');
const billingRouter = require('./modules/billing');
const superadminRouter = require('./modules/superadmin');
const leadsRouter = require('./modules/leads');
const financeRouter = require('./modules/finance');
const tradeInsRouter = require('./modules/trade_ins');
const stockModule = require('./modules/stock');
const serviceModule = require('./modules/service');
const partsModule = require('./modules/parts');
const customersModule = require('./modules/customers');
const retentionModule = require('./modules/retention');
const supportModule = require('./modules/support');
const analyticsModule = require('./modules/analytics');
const notificationsModule = require('./modules/notifications');
const integrationsModule = require('./modules/integrations');
require('./config/db'); // Initialize Objection with Knex

// Shim crypto.randomUUID for chatbot.js uuid() calls
if (!global.crypto) global.crypto = crypto;

const app = express();

// Standard Scaffolding
app.use(helmet());
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(morgan('dev'));
// Stripe Webhooks need raw body for signature validation
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhooksStripeRouter);

app.use(express.json());

// 1. Identify Tenant based on Subdomain
app.use(tenantMiddleware);

// 2. Platform Routes
app.use('/auth', authRouter);
app.use('/chat', chatbotRouter);
app.use('/api/whatsapp', whatsappSettingsRouter);
app.use('/api/webhooks/whatsapp', webhooksRouter.router);
app.use('/api/widget', widgetSettingsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/superadmin', superadminRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/finance', financeRouter);
app.use('/api/trade-ins', tradeInsRouter);
app.use('/api/stock', stockModule.router);
app.use('/api/service', serviceModule.router);
app.use('/api/parts', partsModule.router);
app.use('/api/customers', customersModule.router);
app.use('/api/retention', retentionModule.router);
app.use('/api/support', supportModule.router);
app.use('/api/analytics', analyticsModule.router);
app.use('/api/notifications', notificationsModule.router);
app.use('/api/integrations', integrationsModule.router);

// 3. Static: serve the embeddable widget.js from /public
// CDN-ready: in production, deploy /public to your CDN
app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('widget.js')) {
            // Allow any dealership website to load this file
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    },
}));

// 4. Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'active',
        tenant: req.tenant ? req.tenant.name : 'Unknown',
        subdomain: req.subdomain
    });
});

/**
 * Platform Modules Routes (Scaffolding API)
 */
app.get('/api/dashboard/stats', (req, res) => {
    // Isolated per tenant via req.tenant
    res.json({
        leads: 34,
        test_drives: 11,
        finance_apps: 6,
        trade_ins: 9,
        ai_resolution: '83%'
    });
});

module.exports = app;

