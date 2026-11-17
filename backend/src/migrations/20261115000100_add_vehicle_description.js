/**
 * The Vehicle model and Stock UI use `description`, but the column was never created.
 * Needed so AI-generated advert copy can be saved to the listing.
 */
exports.up = async function (knex) {
    if (!(await knex.schema.hasColumn('vehicles', 'description'))) {
        await knex.schema.alterTable('vehicles', (t) => { t.text('description'); });
    }
};

exports.down = async function (knex) {
    if (await knex.schema.hasColumn('vehicles', 'description')) {
        await knex.schema.alterTable('vehicles', (t) => { t.dropColumn('description'); });
    }
};
