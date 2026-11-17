const Stripe = require('stripe');

// For development, use a placeholder or test key from .env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2023-10-16', // Note: use appropriate version
});

const PLANS = {
    starter: {
        price_id: process.env.STRIPE_PRICE_STARTER || 'price_starter_placeholder', // R5500/mo
        limits: { conversations: 500, users: 2, vehicles: 50 },
    },
    growth: {
        price_id: process.env.STRIPE_PRICE_GROWTH || 'price_growth_placeholder', // R12500/mo
        limits: { conversations: 2500, users: 5, vehicles: 200 },
    },
    enterprise: {
        price_id: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_placeholder', // R22000/mo
        limits: { conversations: 10000, users: 20, vehicles: 1000 },
    }
};

/**
 * Ensures a Stripe customer exists for the tenant.
 */
async function getOrCreateCustomer(tenant) {
    if (tenant.stripe_customer_id) {
        return stripe.customers.retrieve(tenant.stripe_customer_id);
    }

    const customer = await stripe.customers.create({
        name: tenant.name,
        email: `billing@${tenant.subdomain}.local`, // ideally use an actual admin email
        metadata: {
            tenant_id: tenant.id,
            subdomain: tenant.subdomain
        }
    });

    // We would normally patch the DB here, but passing back to caller is cleaner
    return customer;
}

/**
 * Creates a Stripe Checkout session to upgrade/subscribe to a plan.
 */
async function createCheckoutSession({ tenant, customerId, planKey, successUrl, cancelUrl }) {
    const plan = PLANS[planKey];
    if (!plan) throw new Error(`Invalid plan: ${planKey}`);

    const sessionArgs = {
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
            {
                price: plan.price_id,
                quantity: 1,
            }
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        // Top-level metadata is accessible in the webhook event response
        metadata: {
            tenant_id: String(tenant.id),
            plan: planKey,
        },
        subscription_data: {
            metadata: {
                tenant_id: String(tenant.id),
                plan: planKey,
            }
        }
    };

    return stripe.checkout.sessions.create(sessionArgs);
}

/**
 * Creates a Stripe Customer Portal session (for invoice downloads/card updates)
 */
async function createPortalSession(customerId, returnUrl) {
    return stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
}

function getPlanLimits(planKey) {
    return PLANS[planKey] ? PLANS[planKey].limits : PLANS.starter.limits;
}

module.exports = {
    stripe,
    PLANS,
    getOrCreateCustomer,
    createCheckoutSession,
    createPortalSession,
    getPlanLimits
};
