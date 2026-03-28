const { Model } = require('objection');

class Tenant extends Model {
    static get tableName() { return 'tenants'; }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['name', 'subdomain'],
            properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                subdomain: { type: 'string' },
                plan: { type: 'string', enum: ['starter', 'growth', 'enterprise'] },
                whatsapp_number: { type: ['string', 'null'] },
                logo_url: { type: ['string', 'null'] },
                primary_color: { type: 'string' },
                address: { type: ['string', 'null'] },
                city: { type: ['string', 'null'] },
                province: { type: ['string', 'null'] },
                active: { type: 'boolean' },
            }
        };
    }
}

module.exports = Tenant;
