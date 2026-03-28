const { Model } = require('objection');

class Conversation extends Model {
    static get tableName() { return 'conversations'; }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['tenant_id', 'channel'],
            properties: {
                id: { type: 'integer' },
                tenant_id: { type: 'integer' },
                lead_id: { type: ['integer', 'null'] },
                channel: { type: 'string', enum: ['whatsapp', 'website', 'facebook'] },
                messages: { type: 'array', items: { type: 'object' } },
                ai_summary: { type: ['string', 'null'] },
                intent_detected: { type: ['string', 'null'] },
                sentiment_score: { type: ['number', 'null'] },
            }
        };
    }

    static get relationMappings() {
        const Lead = require('./Lead');
        return {
            lead: {
                relation: Model.BelongsToOneRelation,
                modelClass: Lead,
                join: {
                    from: 'conversations.lead_id',
                    to: 'leads.id'
                }
            }
        };
    }
}

module.exports = Conversation;
