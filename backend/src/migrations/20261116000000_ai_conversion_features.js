/**
 * AI conversion features (research-backed, see docs/CMS_ANALYSIS_AND_GLOBAL_AI_RESEARCH.md §5):
 *  - leads.first_response_at / first_response_by / appointment_at  → speed-to-lead + AI impact measurement
 *  - tenants.ai_go_live_at                                          → before/after baseline
 *  - online_deals                                                   → buy/reserve online (digital retail)
 *  - inspections                                                    → AI service-lane inspection + upsell approvals
 */
exports.up = async function (knex) {
    const addCol = async (table, col, fn) => {
        if (!(await knex.schema.hasColumn(table, col))) await knex.schema.alterTable(table, fn);
    };
    await addCol('leads', 'first_response_at', (t) => t.timestamp('first_response_at'));
    await addCol('leads', 'first_response_by', (t) => t.string('first_response_by', 12)); // 'ai' | 'staff'
    await addCol('leads', 'appointment_at', (t) => t.timestamp('appointment_at'));
    await addCol('tenants', 'ai_go_live_at', (t) => t.timestamp('ai_go_live_at'));

    if (!(await knex.schema.hasTable('online_deals'))) {
        await knex.schema.createTable('online_deals', (t) => {
            t.increments('id').primary();
            t.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants').onDelete('CASCADE');
            t.integer('lead_id').unsigned().references('id').inTable('leads').onDelete('SET NULL');
            t.integer('vehicle_id').unsigned().references('id').inTable('vehicles').onDelete('SET NULL');
            t.integer('deal_id').unsigned().references('id').inTable('deals').onDelete('SET NULL');
            t.integer('trade_in_id').unsigned().references('id').inTable('trade_ins').onDelete('SET NULL');
            t.string('reference', 16).notNullable();
            t.string('payment_method', 12).notNullable(); // cash | finance
            t.decimal('vehicle_price', 12, 2);
            t.decimal('deposit', 12, 2);
            t.integer('term_months');
            t.decimal('est_monthly', 12, 2);
            t.decimal('trade_in_estimate', 12, 2);
            t.string('fulfilment', 12).notNullable(); // collect | delivery
            t.date('fulfilment_date');
            t.string('delivery_address', 300);
            t.string('status', 20).notNullable().defaultTo('reserved'); // reserved | docs_pending | approved | completed | cancelled
            t.timestamp('hold_expires_at');
            t.timestamps(true, true);
            t.index(['tenant_id', 'status']);
        });
    }

    if (!(await knex.schema.hasTable('inspections'))) {
        await knex.schema.createTable('inspections', (t) => {
            t.increments('id').primary();
            t.integer('tenant_id').unsigned().notNullable().references('id').inTable('tenants').onDelete('CASCADE');
            t.integer('booking_id').unsigned().notNullable().references('id').inTable('service_bookings').onDelete('CASCADE');
            t.text('findings').notNullable().defaultTo('[]'); // [{item, area, severity, recommendation, est_price, status}]
            t.text('photos').notNullable().defaultTo('[]');   // [url]
            t.string('engine', 12).notNullable();             // claude | checklist
            t.text('summary');
            t.timestamp('sent_at');
            t.timestamps(true, true);
            t.index(['tenant_id', 'booking_id']);
        });
    }
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('inspections');
    await knex.schema.dropTableIfExists('online_deals');
    for (const [table, col] of [['leads', 'first_response_at'], ['leads', 'first_response_by'], ['leads', 'appointment_at'], ['tenants', 'ai_go_live_at']]) {
        if (await knex.schema.hasColumn(table, col)) await knex.schema.alterTable(table, (t) => t.dropColumn(col));
    }
};
