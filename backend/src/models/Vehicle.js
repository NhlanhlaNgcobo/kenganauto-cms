const { Model } = require('objection');

class Vehicle extends Model {
    static get tableName() {
        return 'vehicles';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['tenant_id', 'make', 'model', 'year', 'price', 'condition', 'stock_number', 'vin'],
            properties: {
                id: { type: 'integer' },
                tenant_id: { type: 'integer' },
                make: { type: 'string' },
                model: { type: 'string' },
                year: { type: 'integer' },
                variant: { type: 'string' },
                colour: { type: 'string' },
                mileage: { type: 'integer' },
                price: { type: 'number' },
                cost_price: { type: 'number' },
                condition: { type: 'string', enum: ['new', 'demo', 'used'] },
                stock_number: { type: 'string' },
                vin: { type: 'string' },
                status: { type: 'string', enum: ['available', 'reserved', 'sold'] },
                images: { type: 'array', items: { type: 'string' } },
                features: { type: 'array', items: { type: 'string' } },
                description: { type: 'string' },
                days_in_stock: { type: 'integer' }
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
                    from: 'vehicles.tenant_id',
                    to: 'tenants.id'
                }
            }
        };
    }
}

module.exports = Vehicle;
