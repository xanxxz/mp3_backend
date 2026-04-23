"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const db_1 = require("../db");
async function default_1(fastify) {
    fastify.get('/:userId', async (request) => {
        const userId = Number(request.params.userId);
        const { rows } = await db_1.pool.query(`SELECT cart_items.id, products.title, products.price, cart_items.quantity
       FROM cart_items
       JOIN products ON products.id = cart_items.product_id
       WHERE cart_items.user_id = $1`, [userId]);
        return rows;
    });
    fastify.post('/:userId', async (request) => {
        const userId = Number(request.params.userId);
        const { product_id, quantity } = request.body;
        const { rows } = await db_1.pool.query('INSERT INTO cart_items(user_id, product_id, quantity) VALUES($1,$2,$3) RETURNING *', [userId, product_id, quantity || 1]);
        return rows[0];
    });
    fastify.delete('/:userId/:itemId', async (request) => {
        const { userId, itemId } = request.params;
        await db_1.pool.query('DELETE FROM cart_items WHERE id=$1 AND user_id=$2', [itemId, userId]);
        return { success: true };
    });
}
