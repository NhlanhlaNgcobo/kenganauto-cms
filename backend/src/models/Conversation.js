const { Model } = require('objection');

class Conversation extends Model {
    static get tableName() { return 'conversations'; }

    /**
     * JSON columns that need serialize/deserialize handling.
     * PostgreSQL handles jsonb natively; SQLite stores as TEXT.
     * These hooks make the model work transparently with both.
     */
    static get jsonbColumns() {
        return ['messages'];
    }

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

    /** Serialize JSON columns to string before writing to SQLite */
    $formatDatabaseJson(json) {
        json = super.$formatDatabaseJson(json);
        for (const col of Conversation.jsonbColumns) {
            if (json[col] !== undefined && typeof json[col] !== 'string') {
                json[col] = JSON.stringify(json[col]);
            }
        }
        return json;
    }

    /** Deserialize JSON strings to objects after reading from SQLite */
    $parseDatabaseJson(json) {
        json = super.$parseDatabaseJson(json);
        for (const col of Conversation.jsonbColumns) {
            if (json[col] && typeof json[col] === 'string') {
                try { json[col] = JSON.parse(json[col]); } catch { json[col] = []; }
            }
        }
        return json;
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
