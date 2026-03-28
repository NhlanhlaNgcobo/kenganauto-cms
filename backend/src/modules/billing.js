const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const stripeService = require('../services/stripe_service');

router.use(authenticate);

/**
 * GET /api/billing/status
 * Returns current plan, usage limits, and Stripe subscription details
 */
router.get('/status', async (req, res) => {
    try {
        const tenant = req.tenant; // from tenantMiddleware

        // Find usage for this month
        const Knex = require('objection').Model.knex();
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        let usage = await Knex('tenant_usage')
            .where({ tenant_id: tenant.id, billing_period: currentMonth })
            .first();

        const limits = stripeService.getPlanLimits(tenant.plan);

        if (!usage) {
            usage = {
                conversations_used: 0,
                conversations_limit: limits.conversations
            };
        }

        return res.json({
            plan: tenant.plan || 'starter',
            status: tenant.subscription_status || 'trialing',
            trial_ends_at: tenant.trial_ends_at,
            current_period_end: tenant.current_period_end,
            setup_fee_paid: tenant.setup_fee_paid,
            usage: {
                conversations: {
                    used: usage.conversations_used,
                    limit: limits.conversations
                },
                users: {
                    limit: limits.users
                },
                vehicles: {
                    limit: limits.vehicles
                }
            }
        });
    } catch (err) {
        console.error('[billing] GET /status error:', err);
        res.status(500).json({ error: 'Failed to fetch billing status' });
    }
});

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout session to upgrade plan or pay setup fee
 */
router.post('/checkout', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { planKey, successUrl, cancelUrl } = req.body;

        if (!stripeService.PLANS[planKey]) {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }

        const customer = await stripeService.getOrCreateCustomer(tenant);

        // Update DB with customer ID if newly created
        if (!tenant.stripe_customer_id) {
            const Knex = require('objection').Model.knex();
            await Knex('tenants').where({ id: tenant.id }).update({ stripe_customer_id: customer.id });
        }

        const session = await stripeService.createCheckoutSession({
            tenant,
            customerId: tenant.stripe_customer_id || customer.id,
            planKey,
            successUrl,
            cancelUrl
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('[billing] POST /checkout error:', err);
        res.status(500).json({ error: err.message || 'Failed to create checkout session' });
    }
});

/**
 * POST /api/billing/portal
 * Create a Stripe Customer Portal session (invoices, card changes)
 */
router.post('/portal', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { returnUrl } = req.body;

        if (!tenant.stripe_customer_id) {
            return res.status(400).json({ error: 'No active billing profile found.' });
        }

        const session = await stripeService.createPortalSession(tenant.stripe_customer_id, returnUrl);
        res.json({ url: session.url });
    } catch (err) {
        console.error('[billing] POST /portal error:', err);
        res.status(500).json({ error: 'Failed to open customer portal' });
    }
});

module.exports = router;
