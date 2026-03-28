const { Model } = require('objection');

class PartsEnquiry extends Model {
    static get tableName() {
        return 'parts_enquiries';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['tenant_id', 'customer_name', 'vehicle_make', 'vehicle_model', 'part_name'],
            properties: {
                id: { type: 'integer' },
                tenant_id: { type: 'integer' },
                customer_name: { type: 'string' },
                customer_phone: { type: 'string' },
                vehicle_make: { type: 'string' },
                vehicle_model: { type: 'string' },
                part_name: { type: 'string' },
                part_number: { type: 'string' },
                quantity: { type: 'integer' },
                status: { type: 'string', enum: ['enquiry', 'quoted', 'ordered', 'ready', 'collected'] },
                price_quoted: { type: 'number' }
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
                    from: 'parts_enquiries.tenant_id',
                    to: 'tenants.id'
                }
            }
        };
    }
}

module.exports = PartsEnquiry;
