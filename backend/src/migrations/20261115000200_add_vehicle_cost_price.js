/**
 * The Vehicle model and Stock UI ("show cost", margin) use `cost_price`, but the column was never created,
 * so inserts that include it fall back to mock data. Add it.
 */
exports.up = async function (knex) {
    if (!(await knex.schema.hasColumn('vehicles', 'cost_price'))) {
        await knex.schema.alterTable('vehicles', (t) => { t.decimal('cost_price', 12, 2); });
    }
};

exports.down = async function (knex) {
    if (await knex.schema.hasColumn('vehicles', 'cost_price')) {
        await knex.schema.alterTable('vehicles', (t) => { t.dropColumn('cost_price'); });
    }
};
