import { FastifyInstance } from 'fastify';
import { pool } from '../db';

export default async function (fastify: FastifyInstance) {
  fastify.get('/:userId', async (request) => {
    const userId = Number((request.params as any).userId);
    const { rows } = await pool.query(
      `SELECT cart_items.id, products.title, products.price, cart_items.quantity
       FROM cart_items
       JOIN products ON products.id = cart_items.product_id
       WHERE cart_items.user_id = $1`,
      [userId]
    );
    return rows;
  });

  fastify.post('/:userId', async (request) => {
    const userId = Number((request.params as any).userId);
    const { product_id, quantity } = request.body as any;
    const { rows } = await pool.query(
      'INSERT INTO cart_items(user_id, product_id, quantity) VALUES($1,$2,$3) RETURNING *',
      [userId, product_id, quantity || 1]
    );
    return rows[0];
  });

  fastify.delete('/:userId/:itemId', async (request) => {
    const { userId, itemId } = request.params as any;
    await pool.query('DELETE FROM cart_items WHERE id=$1 AND user_id=$2', [itemId, userId]);
    return { success: true };
  });
}
