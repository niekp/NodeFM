/**
 * Build a part of the query
 * @param {string} key AND/OR/ORDER BY
 * @param {string} array List of conditions
 * @param {string} seperator 'AND' or ',' for ORDER BY
 */
function buildQuery(key, array = [], seperator = 'AND') {
    let query = '';
    if (array.length)
        query += ` ${key} `;

    let first = true;
    for (let comparison of array) {
        if (!first)
            query += ` ${seperator} `;
        query += comparison + ' ';
        first = false;
    }
    return query;
}

/**
 * Build up a where with multiple conditions and generate it at once
 */
class queryBuilder {
    constructor() {
        this.where = [];
        this.having = [];
        this.order = [];
    };

    /**
     * @param {string} where 
     */
    addWhere(where) {
        this.where.push(where);
    };

    /**
     * @param {string} having 
     */
    addHaving(having) {
        this.having.push(having);
    };

    /**
     * @param {string} order 
     */
    addOrder(order) {
        this.order.push(order);
    };

    /**
     * Get the WHERE part of the query
     */
    getWhere() {
        return buildQuery('WHERE', this.where);
    };

    /**
     * Get the HAVING part of the query
     */
    getHaving() {
        return buildQuery('HAVING', this.having);
    };

    /**
     * Get the ORDER BY part of the query
     */
    getOrder() {
        return buildQuery('ORDER BY', this.order, ',');
    };
}

exports.queryBuilder = queryBuilder;
