const Knex = require('knex');
const { Model } = require('objection');
const knexConfig = require('../../knexfile');

// Select DB config based on environment (development → SQLite, production → PostgreSQL)
const env = process.env.NODE_ENV || 'development';
const knex = Knex(knexConfig[env] || knexConfig.development);

// Give the knex instance to objection
Model.knex(knex);

module.exports = knex;
