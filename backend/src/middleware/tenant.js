const Tenant = require('../models/Tenant');

/**
 * Tenant Middleware
 * Detects tenant from the request headers or subdomain
 * and attaches it to the request object.
 */
const tenantMiddleware = async (req, res, next) => {
    const host = req.headers.host || '';

    // For local dev, we might just be on localhost:3000
    // Strip port and normalize to 'app' if local
    let subdomain = host.split(':')[0].split('.')[0];
    console.log(`[tenant] host: "${host}", resolved subdomain: "${subdomain}"`);
    if (subdomain === 'localhost' || subdomain === '127') subdomain = 'app';

    // Global Paths
    if (['app', 'www', 'platform'].includes(subdomain)) {
        req.tenant = { id: 1, slug: 'admin', is_global: true };
        return next();
    }

    try {
        const tenant = await Tenant.query().where('subdomain', subdomain).first();

        if (!tenant) {
            // Fallback for local testing if no tenant found: mock one or return error
            if (process.env.NODE_ENV === 'development') {
                // Still allow it but with a default ID if needed? No, let's be strict.
            }
            return res.status(404).json({ error: `Dealership "${subdomain}" not found.` });
        }

        // Attach slug for legacy module checks
        tenant.slug = (tenant.id === 1 || tenant.subdomain === 'app') ? 'admin' : tenant.subdomain;
        req.tenant = tenant;

        // Implement Row-Level Security Enforcer (PostgreSQL only)
        const knex = Tenant.knex();
        if (knex && knex.client.config.client === 'pg') {
            await knex.raw('SET LOCAL app.current_tenant = ?', [tenant.id]);
        }

        next();
    } catch (err) {
        console.error('Tenant identification error:', err);
        res.status(500).json({ error: 'Internal Server Error during tenant identification' });
    }
};

module.exports = tenantMiddleware;
