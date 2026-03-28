exports.up = function (knex) {
    return knex.schema.createTable('api_settings', table => {
        table.increments('id').primary();
        table.integer('tenant_id').notNullable(); // 1 = superadmin scale
        table.string('service_name').notNullable();
        table.text('encrypted_key').notNullable();
        table.string('iv').notNullable(); // Initialization vector for crypto
        table.string('status').defaultTo('unverified');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());

        table.unique(['tenant_id', 'service_name']);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('api_settings');
};
