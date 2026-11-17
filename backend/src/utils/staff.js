'use strict';

const knex = require('../config/db');

/** Active staff for a tenant as [{ id, name, role }] — used by targets & customer care pickers. */
async function listStaff(tenantId) {
    const rows = await knex('users')
        .where({ tenant_id: tenantId })
        .andWhere((q) => q.where('active', true).orWhereNull('active'))
        .select('id', 'first_name', 'last_name', 'role')
        .orderBy('first_name');
    return rows.map((u) => ({ id: u.id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim(), role: u.role }));
}

/** Month bounds for a YYYY-MM period as ISO date strings: [start, endExclusive]. */
function periodBounds(period) {
    const m = /^(\d{4})-(\d{2})$/.exec(period || '');
    const now = new Date();
    const y = m ? Number(m[1]) : now.getFullYear();
    const mo = m ? Number(m[2]) - 1 : now.getMonth();
    const pad = (n) => String(n).padStart(2, '0');
    const next = new Date(Date.UTC(y, mo + 1, 1));
    return {
        period: `${y}-${pad(mo + 1)}`,
        start: `${y}-${pad(mo + 1)}-01`,
        end: `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-01`,
        daysInMonth: new Date(Date.UTC(y, mo + 1, 0)).getUTCDate(),
        year: y,
        month: mo,
    };
}

module.exports = { listStaff, periodBounds };
