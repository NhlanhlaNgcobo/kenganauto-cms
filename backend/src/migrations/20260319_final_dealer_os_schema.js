/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    // 1. Enabling RLS requires PostgreSQL
    if (knex.client.config.client === 'pg') {
        await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    }

    return knex.schema
        // 1. tenants
        .createTable('tenants', (table) => {
            table.increments('id').primary();
            table.string('name').notNullable();
            table.string('subdomain').unique().notNullable();
            table.enum('plan', ['starter', 'growth', 'enterprise']).defaultTo('starter');
            table.string('whatsapp_number');
            table.string('logo_url');
            table.string('primary_color').defaultTo('#0176D3');
            table.string('address');
            table.string('city');
            table.string('province');
            table.boolean('active').defaultTo(true);
            table.timestamps(true, true);
        })
        // 2. users
        .createTable('users', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.string('first_name').notNullable();
            table.string('last_name').notNullable();
            table.string('email').notNullable();
            table.string('password_hash').notNullable();
            table.enum('role', ['admin', 'salesperson', 'finance_manager', 'service_advisor', 'parts_manager']).notNullable();
            table.string('phone');
            table.boolean('active').defaultTo(true);
            table.timestamp('last_login');
            table.timestamps(true, true);

            table.unique(['tenant_id', 'email']);
        })
        // 3. leads
        .createTable('leads', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.string('customer_name').notNullable();
            table.string('customer_phone').index();
            table.string('customer_email').index();
            table.enum('source', ['whatsapp', 'website', 'autotrader', 'cars_coza', 'facebook', 'walk_in', 'phone']).notNullable();
            table.string('vehicle_interest');
            table.decimal('budget_min', 12, 2);
            table.decimal('budget_max', 12, 2);
            table.enum('status', ['new', 'contacted', 'qualified', 'test_drive_booked', 'negotiation', 'won', 'lost']).defaultTo('new');
            table.integer('assigned_to').unsigned().references('id').inTable('users');
            table.integer('ai_score').defaultTo(0);
            table.timestamp('last_contact_at');
            table.text('notes');
            table.timestamps(true, true);

            table.index(['tenant_id', 'status']);
        })
        // 4. conversations
        .createTable('conversations', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.integer('lead_id').unsigned().references('id').inTable('leads').onDelete('CASCADE');
            table.enum('channel', ['whatsapp', 'website', 'facebook']).notNullable();
            table.jsonb('messages').defaultTo('[]');
            table.text('ai_summary');
            table.string('intent_detected');
            table.decimal('sentiment_score', 3, 2);
            table.timestamps(true, true);

            table.index(['tenant_id', 'lead_id']);
        })
        // 5. vehicles
        .createTable('vehicles', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.string('make').notNullable();
            table.string('model').notNullable();
            table.integer('year').notNullable();
            table.string('variant');
            table.string('colour');
            table.integer('mileage');
            table.decimal('price', 12, 2).notNullable();
            table.enum('condition', ['new', 'demo', 'used']).notNullable();
            table.string('stock_number').unique().notNullable();
            table.string('vin').unique().notNullable();
            table.enum('status', ['available', 'reserved', 'sold']).defaultTo('available');
            table.jsonb('images').defaultTo('[]');
            table.jsonb('features').defaultTo('[]');
            table.integer('days_in_stock').defaultTo(0);
            table.timestamps(true, true);

            table.index(['tenant_id', 'status', 'make', 'model']);
            table.index('vin');
        })
        // 8. trade_ins (Defining before deals for reference)
        .createTable('trade_ins', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.integer('lead_id').unsigned().references('id').inTable('leads').onDelete('CASCADE');
            table.integer('year').notNullable();
            table.string('make').notNullable();
            table.string('model').notNullable();
            table.integer('mileage');
            table.string('condition');
            table.string('colour');
            table.string('registration');
            table.string('vin');
            table.decimal('estimated_value', 12, 2);
            table.decimal('dealer_offer', 12, 2);
            table.enum('status', ['enquiry', 'valued', 'accepted', 'declined']).defaultTo('enquiry');
            table.jsonb('photos').defaultTo('[]');
            table.timestamps(true, true);

            table.index(['tenant_id', 'lead_id']);
        })
        // 6. deals
        .createTable('deals', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.integer('lead_id').unsigned().references('id').inTable('leads').notNullable();
            table.integer('vehicle_id').unsigned().references('id').inTable('vehicles').notNullable();
            table.integer('salesperson_id').unsigned().references('id').inTable('users');
            table.enum('stage', ['presented', 'test_drive', 'negotiation', 'finance_submitted', 'approved', 'contracted', 'delivered']).notNullable();
            table.decimal('sale_price', 12, 2);
            table.integer('trade_in_id').unsigned().references('id').inTable('trade_ins');
            table.decimal('finance_amount', 12, 2);
            table.decimal('deposit', 12, 2);
            table.decimal('monthly_installment', 12, 2);
            table.string('bank_name');
            table.timestamp('deal_date');
            table.timestamp('delivered_at');
            table.decimal('profit_margin', 12, 2);
            table.timestamps(true, true);

            table.index(['tenant_id', 'stage']);
        })
        // 7. finance_applications
        .createTable('finance_applications', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.integer('lead_id').unsigned().references('id').inTable('leads').notNullable();
            table.integer('deal_id').unsigned().references('id').inTable('deals');
            table.decimal('monthly_income', 12, 2);
            table.string('employment_status');
            table.string('employer_name');
            table.integer('years_employed');
            table.decimal('existing_debt', 12, 2);
            table.decimal('deposit_amount', 12, 2);
            table.decimal('vehicle_price', 12, 2);
            table.integer('term_months');
            table.decimal('interest_rate', 5, 2);
            table.decimal('monthly_installment', 12, 2);
            table.enum('status', ['pending', 'submitted', 'approved', 'declined']).defaultTo('pending');
            table.string('bank_reference');
            table.timestamps(true, true);

            table.index(['tenant_id', 'status']);
        })
        // 9. service_bookings
        .createTable('service_bookings', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.integer('customer_id').unsigned(); // Reference customers table below
            table.string('vehicle_registration').notNullable();
            table.string('vehicle_make').notNullable();
            table.string('vehicle_model').notNullable();
            table.enum('service_type', ['minor', 'major', 'warranty', 'tyres', 'body_repair', 'other']).notNullable();
            table.text('description');
            table.date('booking_date').notNullable();
            table.time('booking_time').notNullable();
            table.integer('advisor_id').unsigned().references('id').inTable('users');
            table.enum('status', ['booked', 'confirmed', 'in_progress', 'completed', 'cancelled']).defaultTo('booked');
            table.boolean('reminder_48h_sent').defaultTo(false);
            table.boolean('reminder_2h_sent').defaultTo(false);
            table.string('job_card_number');
            table.decimal('invoice_amount', 12, 2);
            table.timestamps(true, true);

            table.index(['tenant_id', 'booking_date', 'status']);
        })
        // 10. parts_enquiries
        .createTable('parts_enquiries', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.string('customer_name').notNullable();
            table.string('customer_phone');
            table.string('vehicle_make').notNullable();
            table.string('vehicle_model').notNullable();
            table.string('part_name').notNullable();
            table.string('part_number');
            table.integer('quantity').defaultTo(1);
            table.enum('status', ['enquiry', 'quoted', 'ordered', 'ready', 'collected']).defaultTo('enquiry');
            table.decimal('price_quoted', 12, 2);
            table.timestamps(true, true);

            table.index(['tenant_id', 'status']);
        })
        // 11. customers
        .createTable('customers', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.string('first_name').notNullable();
            table.string('last_name').notNullable();
            table.string('email').index();
            table.string('phone').index();
            table.string('whatsapp_number');
            table.string('id_number');
            table.string('address');
            table.string('vehicle_owned_make');
            table.string('vehicle_owned_model');
            table.integer('vehicle_owned_year');
            table.string('registration');
            table.string('vin');
            table.timestamp('purchase_date');
            table.integer('loyalty_points').defaultTo(0);
            table.integer('nps_score');
            table.timestamp('last_contact_at');
            table.jsonb('tags').defaultTo('[]');
            table.timestamps(true, true);

            table.index(['tenant_id', 'last_name', 'phone']);
        })
        // 12. automation_sequences
        .createTable('automation_sequences', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.string('name').notNullable();
            table.string('trigger_type').notNullable();
            table.jsonb('steps').defaultTo('[]');
            table.boolean('active').defaultTo(true);
            table.timestamps(true, true);

            table.index(['tenant_id', 'trigger_type']);
        })
        // 13. analytics_events
        .createTable('analytics_events', (table) => {
            table.increments('id').primary();
            table.integer('tenant_id').unsigned().references('id').inTable('tenants').onDelete('CASCADE').notNullable();
            table.string('event_type').notNullable();
            table.integer('entity_id').unsigned();
            table.jsonb('metadata').defaultTo('{}');
            table.timestamps(true, true);

            table.index(['tenant_id', 'event_type', 'created_at']);
        })
        .then(async () => {
            // --- Row Level Security (PostgreSQL) Implementation ---
            // Note: This requires the current_setting('app.current_tenant') to be set in the middleware for each request
            // Only runs if on PostgreSQL
            if (knex.client.config.client !== 'pg') return;

            const tables = [
                'users', 'leads', 'conversations', 'vehicles', 'deals', 'finance_applications',
                'trade_ins', 'service_bookings', 'parts_enquiries', 'customers',
                'automation_sequences', 'analytics_events'
            ];

            for (const tableName of tables) {
                await knex.raw(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`);
                await knex.raw(`
           DO $$
           BEGIN
             IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '${tableName}' AND policyname = 'tenant_isolation_policy') THEN
               CREATE POLICY tenant_isolation_policy ON ${tableName}
               USING (tenant_id = current_setting('app.current_tenant')::integer);
             END IF;
           END
           $$;
         `);
            }
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('analytics_events')
        .dropTableIfExists('automation_sequences')
        .dropTableIfExists('customers')
        .dropTableIfExists('parts_enquiries')
        .dropTableIfExists('service_bookings')
        .dropTableIfExists('finance_applications')
        .dropTableIfExists('deals')
        .dropTableIfExists('trade_ins')
        .dropTableIfExists('vehicles')
        .dropTableIfExists('conversations')
        .dropTableIfExists('leads')
        .dropTableIfExists('users')
        .dropTableIfExists('tenants');
};
