/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    const hasDateOfBirth = await knex.schema.hasColumn('customers', 'date_of_birth');
    if (!hasDateOfBirth) {
        await knex.schema.alterTable('customers', (table) => {
            table.date('date_of_birth');
        });
    }

    const hasCampaignsTable = await knex.schema.hasTable('reactivation_campaigns');
    if (!hasCampaignsTable) {
        await knex.schema.createTable('reactivation_campaigns', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.string('name').notNullable();
            table.string('kind').notNullable();
            table.enum('channel', ['email', 'sms', 'whatsapp']).notNullable();
            table.string('audience_type').notNullable();
            table.boolean('active').defaultTo(true);
            table.boolean('is_automatic').defaultTo(false);
            table.string('schedule_type').defaultTo('once');
            table.jsonb('schedule_config').defaultTo('{}');
            table.jsonb('filters').defaultTo('{}');
            table.string('template_subject');
            table.text('template_body').notNullable();
            table.string('last_processed_key');
            table.timestamp('last_run_at');
            table.jsonb('last_run_summary').defaultTo('{}');
            table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
            table.integer('updated_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
            table.timestamps(true, true);

            table.index(['tenant_id', 'active']);
            table.index(['tenant_id', 'kind']);
        });
    }

    const hasRunsTable = await knex.schema.hasTable('reactivation_campaign_runs');
    if (!hasRunsTable) {
        await knex.schema.createTable('reactivation_campaign_runs', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.integer('campaign_id').unsigned().references('id').inTable('reactivation_campaigns').onDelete('CASCADE').notNullable();
            table.string('trigger_source').defaultTo('manual');
            table.integer('audience_count').defaultTo(0);
            table.integer('delivered_count').defaultTo(0);
            table.integer('failed_count').defaultTo(0);
            table.integer('skipped_count').defaultTo(0);
            table.jsonb('audience_snapshot').defaultTo('[]');
            table.jsonb('result_meta').defaultTo('{}');
            table.timestamp('created_at').defaultTo(knex.fn.now());

            table.index(['tenant_id', 'created_at']);
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('reactivation_campaign_runs');
    await knex.schema.dropTableIfExists('reactivation_campaigns');

    const hasDateOfBirth = await knex.schema.hasColumn('customers', 'date_of_birth');
    if (hasDateOfBirth) {
        await knex.schema.alterTable('customers', (table) => {
            table.dropColumn('date_of_birth');
        });
    }
};
