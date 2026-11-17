/**
 * Records the measurement fields the AI Impact report relies on when a STAFF member
 * touches a lead: first response (if nobody — human or AI — has answered yet) and the
 * appointment time when a lead first reaches a test drive / negotiation stage.
 * Never throws; measurement must not break the user's action.
 */

'use strict';

const knex = require('../config/db');

async function recordStaffTouch(tenantId, leadId, { status } = {}) {
    try {
        const now = new Date().toISOString();
        await knex('leads').where({ tenant_id: tenantId, id: leadId }).whereNull('first_response_at')
            .update({ first_response_at: now, first_response_by: 'staff' });
        if (['test_drive_booked', 'negotiation', 'won'].includes(status)) {
            await knex('leads').where({ tenant_id: tenantId, id: leadId }).whereNull('appointment_at').update({ appointment_at: now });
        }
    } catch (e) {
        console.error('[lead-touch]', e.message);
    }
}

module.exports = { recordStaffTouch };
