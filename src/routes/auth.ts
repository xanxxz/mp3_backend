import { FastifyInstance } from 'fastify';
import { pool } from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export default async function (fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    const { username, email, password } = request.body as any;
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users(username, email, password_hash) VALUES($1,$2,$3) RETURNING id, username, email',
      [username, email, hash]
    );
    reply.send(rows[0]);
  });

  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user) return reply.status(401).send({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return reply.status(401).send({ error: 'Wrong password' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    reply.send({ token, user: { id: user.id, username: user.username, email: user.email } });
  });
}
