require('dotenv').config();
const app = require('./src/app');
const knex = require('./src/config/db');

// ── Production Security Assertions ──────────────────────────────────────────
// Fail fast if dangerous default values are used outside development.
if (process.env.NODE_ENV === 'production') {
    const UNSAFE_JWT = 'kengan_auto_dev_secret_change_in_prod';
    const UNSAFE_ENC = 'a'.repeat(64);

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === UNSAFE_JWT) {
        console.error('[FATAL] JWT_SECRET is not set or uses the insecure default. Set a secure secret in your .env file.');
        process.exit(1);
    }
    if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY === UNSAFE_ENC) {
        console.error('[FATAL] ENCRYPTION_KEY is not set or uses the insecure default. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        process.exit(1);
    }
    if (!process.env.DATABASE_URL) {
        console.error('[FATAL] DATABASE_URL is not set. Production requires a PostgreSQL connection string.');
        process.exit(1);
    }
    console.log('[security] Production assertions passed.');
}

const PORT = process.env.PORT || 3000;

async function start() {
    try {
        // Run all pending migrations on startup (safe to run multiple times)
        await knex.migrate.latest();
        console.log('[DB] Migrations applied successfully.');

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
