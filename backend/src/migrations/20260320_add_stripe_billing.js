/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    return knex.schema
        .alterTable('tenants', (table) => {
            table.string('stripe_customer_id');
            table.string('stripe_subscription_id');
            table.string('stripe_price_id');
            table.timestamp('trial_ends_at');
            table.string('subscription_status').defaultTo('trialing');
            table.timestamp('current_period_end');
            table.boolean('setup_fee_paid').defaultTo(false);
        })
        .createTable('tenant_usage', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.string('billing_period').notNullable(); // e.g. "2026-03"
            table.integer('conversations_used').defaultTo(0);
            table.integer('conversations_limit').defaultTo(100);
            table.timestamps(true, true);

            table.unique(['tenant_id', 'billing_period']);
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('tenant_usage')
        .alterTable('tenants', (table) => {
            table.dropColumn('stripe_customer_id');
            table.dropColumn('stripe_subscription_id');
            table.dropColumn('stripe_price_id');
            table.dropColumn('trial_ends_at');
            table.dropColumn('subscription_status');
            table.dropColumn('current_period_end');
            table.dropColumn('setup_fee_paid');
        });
};
