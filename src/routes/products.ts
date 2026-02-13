import { FastifyInstance } from 'fastify';
import { pool } from '../db';

export default async function (fastify: FastifyInstance) {
  fastify.get('/', async () => {
    const { rows } = await pool.query('SELECT * FROM products');
    return rows;
  });

  fastify.get('/:id', async (request) => {
    const id = (request.params as any).id;
    const { rows } = await pool.query('SELECT * FROM products WHERE id=$1', [id]);
    return rows[0] || null;
  });
}
