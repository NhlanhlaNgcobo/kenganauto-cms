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
const dashboardModule = require('./modules/dashboard');
const followupsModule = require('./modules/followups');
const customerCareModule = require('./modules/customer_care');
const targetsModule = require('./modules/targets');
const showroomModule = require('./modules/showroom');
const dealerSite = require('./modules/dealer_site');
const aiImpactModule = require('./modules/ai_impact');
const onlineDealsModule = require('./modules/online_deals');
const inspectionsModule = require('./modules/inspections');
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

// Inspection photo uploads need a larger body limit than the global parser allows
app.use('/api/inspections', express.json({ limit: '30mb' }), inspectionsModule.router);
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
app.use('/api/dashboard', dashboardModule.router);
app.use('/api/followups', followupsModule.router);
app.use('/api/customer-care', customerCareModule.router);
app.use('/api/targets', targetsModule.router);
app.use('/api/showroom', showroomModule.router);
app.use('/api/public/dealer', dealerSite.publicRouter);
app.use('/api/website-activity', dealerSite.activityRouter);
app.use('/api/ai-impact', aiImpactModule.router);
app.use('/api/online-deals', onlineDealsModule.router);
app.use('/media/inspections', express.static(path.join(__dirname, '..', 'uploads', 'inspections'), { maxAge: '1d' }));

// Vehicle photos for dealer websites (the same files the dashboard serves from frontend/public/demo-vehicles).
// CORP cross-origin so a dealer's own domain can embed them.
app.use('/media/vehicles', express.static(path.join(__dirname, '..', '..', 'frontend', 'public', 'demo-vehicles'), {
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
}));

// 3. Static: serve the embeddable widget.js from /public
// CDN-ready: in production, deploy /public to your CDN
app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('widget.js')) {
            // Allow any dealership website to load this file
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
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

module.exports = app;

