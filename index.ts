import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth';
import productRoutes from './src/routes/products';
import cartRoutes from './src/routes/cart';

dotenv.config();

const fastify = Fastify({ logger: true });
fastify.register(cors, { origin: '*' });

// Роуты
fastify.register(authRoutes, { prefix: '/auth' });
fastify.register(productRoutes, { prefix: '/products' });
fastify.register(cartRoutes, { prefix: '/cart' });

const start = async () => {
  try {
    await fastify.listen({ port: Number(process.env.PORT) || 4000 });
    console.log('Server started on port', process.env.PORT);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
