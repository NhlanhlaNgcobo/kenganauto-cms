const { Model } = require('objection');

class AutomationSequence extends Model {
    static get tableName() {
        return 'automation_sequences';
    }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['tenant_id', 'name', 'trigger_type'],
            properties: {
                id: { type: 'integer' },
                tenant_id: { type: 'integer' },
                name: { type: 'string' },
                trigger_type: { type: 'string' },
                steps: { type: 'array', items: { type: 'object' } }, // array of message shapes
                active: { type: 'boolean' }
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
                    from: 'automation_sequences.tenant_id',
                    to: 'tenants.id'
                }
            }
        };
    }
}

module.exports = AutomationSequence;
