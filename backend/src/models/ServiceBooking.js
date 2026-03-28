const { Model } = require('objection');

class ServiceBooking extends Model {
    static get tableName() {
        return 'service_bookings';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['tenant_id', 'vehicle_registration', 'vehicle_make', 'vehicle_model', 'service_type', 'booking_date', 'booking_time'],
            properties: {
                id: { type: 'integer' },
                tenant_id: { type: 'integer' },
                customer_id: { type: 'integer' },
                vehicle_registration: { type: 'string' },
                vehicle_make: { type: 'string' },
                vehicle_model: { type: 'string' },
                service_type: { type: 'string', enum: ['minor', 'major', 'warranty', 'tyres', 'body_repair', 'other'] },
                description: { type: 'string' },
                booking_date: { type: 'string', format: 'date' },
                booking_time: { type: 'string', format: 'time' },
                advisor_id: { type: 'integer' },
                status: { type: 'string', enum: ['booked', 'checked_in', 'in_progress', 'awaiting_parts', 'quality_check', 'ready_for_collection', 'completed', 'cancelled'] },
                reminder_48h_sent: { type: 'boolean' },
                reminder_2h_sent: { type: 'boolean' },
                job_card_number: { type: 'string' },
                invoice_amount: { type: 'number' }
            }
        };
    }

    static get relationMappings() {
        const Tenant = require('./Tenant');
        const User = require('./User');
        // const Customer = require('./Customer'); // If initialized

        return {
            tenant: {
                relation: Model.BelongsToOneRelation,
                modelClass: Tenant,
                join: {
                    from: 'service_bookings.tenant_id',
                    to: 'tenants.id'
                }
            },
            advisor: {
                relation: Model.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: 'service_bookings.advisor_id',
                    to: 'users.id'
                }
            }
        };
    }
}

module.exports = ServiceBooking;
