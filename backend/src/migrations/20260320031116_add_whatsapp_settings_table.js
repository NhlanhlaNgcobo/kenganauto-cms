/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('tenant_whatsapp_settings', (table) => {
        table.increments('id').primary();
        table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
        table.string('whatsapp_number');
        table.string('encrypted_api_key');
        table.string('encrypted_webhook_secret');
        table.boolean('webhook_registered').defaultTo(false);
        table.string('registered_webhook_url');
        table.timestamps(true, true);

        table.unique(['tenant_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTableIfExists('tenant_whatsapp_settings');
};
