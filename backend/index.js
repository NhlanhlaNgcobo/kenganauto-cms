require('dotenv').config();
const app = require('./src/app');
const knex = require('./src/config/db');

const PORT = process.env.PORT || 3000;

async function start() {
    try {
        // Optional: Run migrations automatically in scaffolding
        // await knex.migrate.latest();

        app.listen(PORT, () => {
            console.log(`DealerOS Backend active on port ${PORT}`);
            console.log(`Multi-tenancy RLS enabled (PG 13+)`);
        });
    } catch (err) {
        console.error('Server failed to start:', err);
        process.exit(1);
    }
}

start();
