const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
    // Delete existing entries (important for SQLite to avoid unique constraint errors during re-seeding)
    await knex('users').del();
    await knex('tenants').del();

    const superadmin_pass = await bcrypt.hash('superadmin123', 12);
    const demo_pass = await bcrypt.hash('demo123', 12);

    // 1. Create the SUPERADMIN (Platform) tenant
    await knex('tenants').insert({
        id: 1,
        name: 'KenganAuto Platform',
        subdomain: 'app',
        plan: 'enterprise',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    // 2. Create the DEMO DEALERSHIP tenant
    await knex('tenants').insert({
        id: 2,
        name: 'Sunshine Motors (Demo)',
        subdomain: 'demo',
        plan: 'growth',
        whatsapp_number: '+27821234567',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    // 3. Create SuperAdmin User
    await knex('users').insert({
        tenant_id: 1,
        first_name: 'Platform',
        last_name: 'Admin',
        email: 'admin@kenganauto.co.za',
        password_hash: superadmin_pass,
        role: 'admin',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    // 4. Create Demo Dealer User (Regular Admin)
    await knex('users').insert({
        tenant_id: 2,
        first_name: 'Demo',
        last_name: 'Dealer',
        email: 'admin@demo.co.za',
        password_hash: demo_pass,
        role: 'admin',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    console.log('Seed Success: Environment ready for testing.');
};
