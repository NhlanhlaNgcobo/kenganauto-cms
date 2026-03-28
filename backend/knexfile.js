require('dotenv').config();

module.exports = {
    development: {
        client: 'better-sqlite3',
        connection: {
            filename: './dev_database.sqlite'
        },
        useNullAsDefault: true,
        migrations: {
            directory: './src/migrations'
        },
        seeds: {
            directory: './src/seeds'
        }
    },
    production: {
        client: 'pg',
        connection: process.env.DATABASE_URL,
        migrations: {
            directory: './src/migrations'
        },
        pool: { min: 2, max: 10 }
    }
};
