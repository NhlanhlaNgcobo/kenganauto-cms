const { Model } = require('objection');

class Customer extends Model {
    static get tableName() {
        return 'customers';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['tenant_id', 'first_name', 'last_name'],
            properties: {
                id: { type: 'integer' },
                tenant_id: { type: 'integer' },
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                whatsapp_number: { type: 'string' },
                id_number: { type: 'string' },
                address: { type: 'string' },
                vehicle_owned_make: { type: 'string' },
                vehicle_owned_model: { type: 'string' },
                vehicle_owned_year: { type: 'integer' },
                registration: { type: 'string' },
                vin: { type: 'string' },
                purchase_date: { type: 'string', format: 'date-time' },
                loyalty_points: { type: 'integer', default: 0 },
                nps_score: { type: 'integer' },
                last_contact_at: { type: 'string', format: 'date-time' },
                tags: { type: 'array', items: { type: 'string' } }
            }
        };
    }

    static get relationMappings() {
        const Tenant = require('./Tenant');
        return {
            tenant: {
                relation: Model.BelongsToOneRelation,
                modelClass: Tenant,
                join: {
                    from: 'customers.tenant_id',
                    to: 'tenants.id'
                }
            }
            // Future mappings to Deals, Service Bookings, TradeIns, Finance could be added here
        };
    }
}

module.exports = Customer;
