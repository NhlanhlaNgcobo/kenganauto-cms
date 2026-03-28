const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// We need raw bodies for webhook validation, but our main app uses `express.json()`.
// This is typically handled by having the webhook route BEFORE the main `express.json()` in app.js.
// However, since we're attaching it later, we'll configure it directly.
// In app.js: app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), require('./modules/webhooks_stripe'));

router.post('/', async (req, res) => {
    const rawBody = req.body;
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';

    let event;

    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
        console.error(`[stripe-webhook] Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const Knex = require('objection').Model.knex();

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;

                // If this is a subscription creation/upgrade
                if (session.mode === 'subscription') {
                    const tenantId = session.subscription_data?.metadata?.tenant_id;
                    const planKey = session.subscription_data?.metadata?.plan;

                    if (tenantId) {
                        await Knex('tenants').where({ id: tenantId }).update({
                            stripe_customer_id: session.customer,
                            stripe_subscription_id: session.subscription,
                            plan: planKey,
                            setup_fee_paid: true, // Assuming checkout collected it
                        });
                        console.log(`[stripe-webhook] Tenant ${tenantId} subscribed to ${planKey}`);
                    }
                }
                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = subscription.customer;
                const status = subscription.status;
                const periodEnd = new Date(subscription.current_period_end * 1000);
                const priceId = subscription.items.data[0].price.id;

                await Knex('tenants').where({ stripe_customer_id: customerId }).update({
                    subscription_status: status,
                    current_period_end: periodEnd,
                    stripe_price_id: priceId
                });

                console.log(`[stripe-webhook] Subscription status updated for customer ${customerId} -> ${status}`);
                break;
            }
            case 'invoice.paid': {
                // Could record payments here if needed
                break;
            }
            default:
                console.log(`[stripe-webhook] Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (err) {
        console.error('[stripe-webhook] Sync error:', err);
        res.status(500).end();
    }
});

module.exports = router;
