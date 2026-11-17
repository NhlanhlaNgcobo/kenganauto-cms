const { Model } = require('objection');

class ReactivationCampaign extends Model {
    static get tableName() {
        return 'reactivation_campaigns';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['tenant_id', 'name', 'kind', 'channel', 'audience_type', 'template_body'],
            properties: {
                id: { type: 'integer' },
                tenant_id: { type: 'integer' },
                name: { type: 'string' },
                kind: { type: 'string' },
                channel: { type: 'string', enum: ['email', 'sms', 'whatsapp'] },
                audience_type: { type: 'string' },
                active: { type: 'boolean' },
                is_automatic: { type: 'boolean' },
                schedule_type: { type: 'string' },
                schedule_config: { type: ['object', 'array', 'string', 'null'] },
                filters: { type: ['object', 'array', 'string', 'null'] },
                template_subject: { type: ['string', 'null'] },
                template_body: { type: 'string' },
                last_processed_key: { type: ['string', 'null'] },
                last_run_at: { type: ['string', 'null'] },
                last_run_summary: { type: ['object', 'array', 'string', 'null'] },
                created_by: { type: ['integer', 'null'] },
                updated_by: { type: ['integer', 'null'] },
            },
        };
    }
}

module.exports = ReactivationCampaign;
