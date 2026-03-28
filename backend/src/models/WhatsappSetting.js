const { Model } = require('objection');

class WhatsappSetting extends Model {
    static get tableName() { return 'tenant_whatsapp_settings'; }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['tenant_id'],
            properties: {
                id: { type: 'integer' },
                tenant_id: { type: 'integer' },
                whatsapp_number: { type: ['string', 'null'] },
                encrypted_api_key: { type: ['string', 'null'] },
                encrypted_webhook_secret: { type: ['string', 'null'] },
                webhook_registered: { type: 'boolean' },
                registered_webhook_url: { type: ['string', 'null'] },
            }
        };
    }
}

module.exports = WhatsappSetting;
