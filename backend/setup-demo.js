const knex = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function setup() {
    try {
        console.log('Clearing DB...');
        await knex('users').del();
        await knex('tenants').del();

        const password_hash = await bcrypt.hash('password123', 12);

        // Created 2 tenants for testing
        const tenants = [
            { id: 1, name: 'Local Test Dealership', subdomain: 'local-dealership', plan: 'enterprise' },
            { id: 2, name: 'Demo Dealership', subdomain: 'demo', plan: 'enterprise' }
        ];

        for (const t of tenants) {
            console.log(`Creating ${t.name}...`);
            await knex('tenants').insert(t);

            await knex('users').insert({
                tenant_id: t.id,
                first_name: 'Admin',
                last_name: 'Tester',
                email: 'admin@kenganauto.co.za', // unified testing email
                password_hash: password_hash,
                role: 'admin'
            });
        }

        console.log('✅ TEST DATA CREATED!');
        console.log('Email: admin@kenganauto.co.za');
        console.log('Password: password123');
        console.log('Subdomains: local-dealership, demo');
    } catch (err) {
        console.error('FAILED:', err.message);
    } finally {
        await knex.destroy();
    }
}

setup();
