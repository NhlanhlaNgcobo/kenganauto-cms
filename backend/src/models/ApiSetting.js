const { Model } = require('objection');

class ApiSetting extends Model {
    static get tableName() {
        return 'api_settings';
    }

    $beforeUpdate() {
        this.updated_at = new Date().toISOString();
    }
}

module.exports = ApiSetting;
