const Knex = require('knex');
const { Model } = require('objection');
const knexConfig = require('../../knexfile');

// Initialize knex based on environment
const knex = Knex(knexConfig.development);

// Give the knex instance to objection
Model.knex(knex);

module.exports = knex;
