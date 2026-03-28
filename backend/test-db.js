const knex = require('./src/config/db');

async function test() {
    try {
        console.log('Testing Knex connection...');
        const tables = await knex.raw("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tables in DB:', tables.map(t => t.name));

        await knex('tenants').insert({
            name: 'Test Dealership',
            subdomain: 'test',
            plan: 'starter'
        });
        console.log('Insert success!');
    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await knex.destroy();
    }
}

test();
