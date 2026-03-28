const { Model } = require('objection');

class Lead extends Model {
    static get tableName() { return 'leads'; }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['tenant_id', 'customer_name', 'source'],
            properties: {
                id: { type: 'integer' },
                tenant_id: { type: 'integer' },
                customer_name: { type: 'string', minLength: 1, maxLength: 255 },
                customer_phone: { type: ['string', 'null'] },
                customer_email: { type: ['string', 'null'] },
                source: {
                    type: 'string',
                    enum: ['whatsapp', 'website', 'autotrader', 'cars_coza', 'facebook', 'walk_in', 'phone']
                },
                vehicle_interest: { type: ['string', 'null'] },
                budget_min: { type: ['number', 'null'] },
                budget_max: { type: ['number', 'null'] },
                status: {
                    type: 'string',
                    enum: ['new', 'contacted', 'qualified', 'test_drive_booked', 'negotiation', 'won', 'lost'],
                    default: 'new'
                },
                assigned_to: { type: ['integer', 'null'] },
                ai_score: { type: 'integer' },
                last_contact_at: { type: ['string', 'null'] },
                notes: { type: ['string', 'null'] },
            }
        };
    }
}

module.exports = Lead;
