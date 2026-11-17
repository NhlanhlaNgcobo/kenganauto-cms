/**
 * CMS-parity modules (Nov 2026)
 *  - csi_surveys      : post-sale / post-service customer satisfaction (0-10)
 *  - concerns         : customer concern / complaint case log (CRP equivalent)
 *  - concern_events   : audit trail for every concern action
 *  - sales_targets    : monthly targets per dealership or per user (scorecards)
 *
 * JSON-ish columns are stored as text so the migration runs on SQLite (dev) and PostgreSQL (prod).
 */

exports.up = async function (knex) {
    if (!(await knex.schema.hasTable('csi_surveys'))) {
        await knex.schema.createTable('csi_surveys', (t) => {
            t.increments('id').primary();
            t.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            t.string('customer_name').notNullable();
            t.string('customer_phone');
            t.string('context_type').notNullable().defaultTo('service'); // service | sale
            t.integer('context_id');
            t.string('context_label');
            t.integer('staff_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
            t.string('status').notNullable().defaultTo('sent'); // sent | responded | expired
            t.integer('score'); // 0-10
            t.text('comment');
            t.float('sentiment'); // -1..1
            t.string('ai_category');
            t.text('ai_summary');
            t.timestamp('sent_at').defaultTo(knex.fn.now());
            t.timestamp('responded_at');
            t.timestamps(true, true);
            t.index(['tenant_id', 'status']);
            t.index(['tenant_id', 'responded_at']);
        });
    }

    if (!(await knex.schema.hasTable('concerns'))) {
        await knex.schema.createTable('concerns', (t) => {
            t.increments('id').primary();
            t.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            t.integer('survey_id').unsigned().references('id').inTable('csi_surveys').onDelete('SET NULL');
            t.string('customer_name').notNullable();
            t.string('customer_phone');
            t.string('department').notNullable().defaultTo('service'); // sales | service | parts | finance | general
            t.string('severity').notNullable().defaultTo('medium'); // low | medium | high
            t.string('subject').notNullable();
            t.text('description');
            t.string('status').notNullable().defaultTo('open'); // open | in_progress | resolved | closed
            t.string('source').notNullable().defaultTo('manual'); // manual | csi_auto
            t.string('ai_category');
            t.integer('assigned_to').unsigned().references('id').inTable('users').onDelete('SET NULL');
            t.text('resolution');
            t.timestamp('due_at');
            t.timestamp('resolved_at');
            t.timestamps(true, true);
            t.index(['tenant_id', 'status']);
        });
    }

    if (!(await knex.schema.hasTable('concern_events'))) {
        await knex.schema.createTable('concern_events', (t) => {
            t.increments('id').primary();
            t.integer('tenant_id').unsigned().notNullable();
            t.integer('concern_id').unsigned().references('id').inTable('concerns').onDelete('CASCADE').notNullable();
            t.integer('actor_id').unsigned();
            t.string('action').notNullable();
            t.text('detail');
            t.timestamp('created_at').defaultTo(knex.fn.now());
            t.index(['concern_id']);
        });
    }

    if (!(await knex.schema.hasTable('sales_targets'))) {
        await knex.schema.createTable('sales_targets', (t) => {
            t.increments('id').primary();
            t.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            t.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE'); // null = whole dealership
            t.string('metric').notNullable(); // leads | test_drives | sales_won | service_bookings | csi_score
            t.string('period').notNullable(); // YYYY-MM
            t.float('target_value').notNullable();
            t.integer('created_by').unsigned();
            t.timestamps(true, true);
            t.index(['tenant_id', 'period']);
        });
    }
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('sales_targets');
    await knex.schema.dropTableIfExists('concern_events');
    await knex.schema.dropTableIfExists('concerns');
    await knex.schema.dropTableIfExists('csi_surveys');
};
