/**
 * Dealer website integration
 *  - website_events: what visitors do on the dealership's own website (views, enquiries, test drives,
 *    finance applications, trade-in valuations, service bookings) so the dashboard can show it live.
 *  - service_bookings.customer_name/phone/email: the service module and CSI follow-ups already expect
 *    these, but the columns were never created, so web bookings had no contact details.
 */
exports.up = async function (knex) {
    if (!(await knex.schema.hasTable('website_events'))) {
        await knex.schema.createTable('website_events', (t) => {
            t.increments('id').primary();
            t.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            t.string('type').notNullable(); // vehicle_view | enquiry | test_drive | finance | trade_in | service | callback
            t.string('label').notNullable(); // human-readable line for the activity feed
            t.integer('vehicle_id').unsigned();
            t.integer('lead_id').unsigned();
            t.string('visitor_id'); // anonymous browser id (no PII)
            t.text('meta'); // JSON
            t.timestamp('created_at').defaultTo(knex.fn.now());
            t.index(['tenant_id', 'created_at']);
            t.index(['tenant_id', 'type']);
        });
    }
    for (const col of ['customer_name', 'customer_phone', 'customer_email']) {
        if (!(await knex.schema.hasColumn('service_bookings', col))) {
            await knex.schema.alterTable('service_bookings', (t) => { t.string(col); });
        }
    }
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('website_events');
    for (const col of ['customer_name', 'customer_phone', 'customer_email']) {
        if (await knex.schema.hasColumn('service_bookings', col)) {
            await knex.schema.alterTable('service_bookings', (t) => { t.dropColumn(col); });
        }
    }
};
