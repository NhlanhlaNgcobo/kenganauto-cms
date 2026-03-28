const knex = require('knex')({
    client: 'better-sqlite3',
    connection: {
        filename: './backend/dev_database.sqlite'
    },
    useNullAsDefault: true
});

async function check() {
    try {
        const tenants = await knex('tenants').select('*');
        console.log('--- TENANTS ---');
        console.table(tenants);

        const users = await knex('users').select('id', 'email', 'role', 'tenant_id', 'active');
        console.log('--- USERS ---');
        console.table(users);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
