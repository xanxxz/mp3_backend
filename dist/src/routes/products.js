"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const db_1 = require("../db");
async function default_1(fastify) {
    fastify.get('/', async () => {
        const { rows } = await db_1.pool.query('SELECT * FROM products');
        return rows;
    });
    fastify.get('/:id', async (request) => {
        const id = request.params.id;
        const { rows } = await db_1.pool.query('SELECT * FROM products WHERE id=$1', [id]);
        return rows[0] || null;
    });
}
