const { Model } = require('objection');

class TradeIn extends Model {
    static get tableName() {
        return 'trade_ins';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['tenant_id', 'make', 'model', 'year'],
            properties: {
                id: { type: 'integer' },
                tenant_id: { type: 'integer' },
                lead_id: { type: 'integer' },
                year: { type: 'integer' },
                make: { type: 'string' },
                model: { type: 'string' },
                mileage: { type: 'integer' },
                condition: { type: 'string' },
                colour: { type: 'string' },
                registration: { type: 'string' },
                vin: { type: 'string' },
                estimated_value: { type: 'number' },
                dealer_offer: { type: 'number' },
                status: { type: 'string', enum: ['enquiry', 'valued', 'inspection_booked', 'offer_made', 'accepted', 'declined'] },
                photos: { type: 'array', items: { type: 'string' } },
            }
        };
    }

    static get relationMappings() {
        const Tenant = require('./Tenant');
        const Lead = require('./Lead');

        return {
            tenant: {
                relation: Model.BelongsToOneRelation,
                modelClass: Tenant,
                join: {
                    from: 'trade_ins.tenant_id',
                    to: 'tenants.id'
                }
            },
            lead: {
                relation: Model.BelongsToOneRelation,
                modelClass: Lead,
                join: {
                    from: 'trade_ins.lead_id',
                    to: 'leads.id'
                }
            }
        };
    }
}

module.exports = TradeIn;
