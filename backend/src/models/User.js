const { Model } = require('objection');

class User extends Model {
    static get tableName() { return 'users'; }

    static get jsonSchema() {
        return {
            type: 'object',
            required: ['tenant_id', 'first_name', 'last_name', 'email', 'role', 'password_hash'],
            properties: {
                id: { type: 'integer' },
                tenant_id: { type: 'integer' },
                first_name: { type: 'string', minLength: 1, maxLength: 100 },
                last_name: { type: 'string', minLength: 1, maxLength: 100 },
                email: { type: 'string', format: 'email' },
                password_hash: { type: 'string' },
                role: { type: 'string', enum: ['admin', 'salesperson', 'finance_manager', 'service_advisor', 'parts_manager'] },
                phone: { type: ['string', 'null'] },
                active: { type: 'boolean' },
                last_login: { type: ['string', 'null'] },
            }
        };
    }

    // Hide password_hash in JSON responses
    $formatJson(json) {
        json = super.$formatJson(json);
        delete json.password_hash;
        return json;
    }
}

module.exports = User;
