import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import bcrypt from 'bcrypt';
import { pool } from './db';
import fs from 'fs';
import path from 'path';

const app = Fastify({ logger: true });

// CORS
app.register(cors, {
  origin: 'http://localhost:5173', // фронт
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // OPTIONS добавится автоматически
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, 
});

// JWT
app.register(fastifyJwt, { secret: process.env.JWT_SECRET! });

// --- Middleware для защищённых роутов ---
app.decorate('authenticate', async (req: any, reply: any) => {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401).send({ message: 'Unauthorized' });
  }
});

// Middleware для админа
app.decorate('adminOnly', async (req: any, reply: any) => {
  try {
    await req.jwtVerify();
    if (req.user.role !== 'admin') {
      return reply.code(403).send({ message: 'Доступ запрещён' });
    }
  } catch {
    return reply.code(401).send({ message: 'Unauthorized' });
  }
});

// Пути к JSON
const productsFile = path.join(__dirname, 'data/products.json');
const categoriesFile = path.join(__dirname, 'data/categories.json');

// --- Получить все категории ---
app.get('/categories', async (req, reply) => {
  try {
    const categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf-8'));
    return categories;
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ message: 'Ошибка при получении категорий' });
  }
});

// --- Получить все товары ---
app.get('/products', async (req, reply) => {
  try {
    const products = JSON.parse(fs.readFileSync(productsFile, 'utf-8'));
    return products;
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ message: 'Ошибка при получении товаров' });
  }
});

// --- Получить товар по ID ---
app.get<{
  Params: { id: string }
}>('/products/:id', async (req, reply) => {
  try {
    const products = JSON.parse(fs.readFileSync(productsFile, 'utf-8'));
    const product = products.find((p: { id: string; }) => p.id === req.params.id);

    if (!product) return reply.code(404).send({ message: 'Товар не найден' });
    return product;
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ message: 'Ошибка при получении товара' });
  }
});

// --- ДОБАВЛЕНИЕ ТОВАРА ---
app.post('/admin/products', { preValidation: [(app as any).adminOnly] }, async (req: any, reply) => {
  try {
    const newProduct = req.body; // должен соответствовать ProductData
    const products = JSON.parse(fs.readFileSync(productsFile, 'utf-8'));
    products.push(newProduct);
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
    return reply.code(201).send(newProduct);
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ message: 'Ошибка при добавлении товара' });
  }
});

// --- ДОБАВЛЕНИЕ КАТЕГОРИИ ---
app.post('/admin/categories', { preValidation: [(app as any).adminOnly] }, async (req: any, reply) => {
  try {
    const newCategory = req.body; // должен соответствовать Category
    const categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf-8'));

    categories.push(newCategory);

    fs.writeFileSync(categoriesFile, JSON.stringify(categories, null, 2));
    return reply.code(201).send(newCategory);
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ message: 'Ошибка при добавлении категории' });
  }
});

// --- РЕГИСТРАЦИЯ ---
app.post('/register', async (req, reply) => {
  const { email, phone, name, region, password } = req.body as {
    email: string;
    phone: string;
    name: string;
    region: string;
    password: string;
  };

  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, phone, name, region, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, region`,
      [email, phone, name, region, hashed]
    );

    return rows[0];
  } catch (err: any) {
    if (err.code === '23505') return reply.code(400).send({ message: 'Email уже используется' });
    app.log.error(err);
    return reply.code(500).send({ message: 'Ошибка регистрации' });
  }
});

// --- АВТОРИЗАЦИЯ ---
app.post('/login', async (req, reply) => {
  const { email, password } = req.body as { email: string; password: string };

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  if (!user) return reply.code(401).send({ message: 'Неверный email или пароль' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return reply.code(401).send({ message: 'Неверный email или пароль' });

  const token = app.jwt.sign({ userId: user.id, role: user.role });
  return { token, user: { id: user.id, email: user.email, name: user.name, region: user.region, role: user.role } };
});

// --- СБРОС ПАРОЛЯ ---
app.post('/reset-password', async (req, reply) => {
  const { email } = req.body as { email: string };
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

  if (!rows.length) return reply.code(404).send({ message: 'Пользователь не найден' });

  const newPassword = Math.random().toString(36).slice(-10); // простой генератор
  const hashed = await bcrypt.hash(newPassword, 10);

  await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashed, email]);

  console.log(`Новый пароль для ${email}:`, newPassword); // для dev
  return { message: 'Пароль сброшен, новый пароль отправлен на email' };
});

// --- ЗАЩИЩЁННЫЙ РОУТ (пример) ---
app.get('/me', { preValidation: [(app as any).authenticate] }, async (req: any) => {
  const { rows } = await pool.query(
    `SELECT id, email, phone, name, region, role, created_at
     FROM users
     WHERE id = $1`,
    [(req as any).user.userId]
  );

  return rows[0];
});

interface CartItemBody {
  productId: string;
  quantity?: number;
}

// Получить корзину текущего пользователя
// GET /cart
// cart.ts
app.get('/cart', { preValidation: [(app as any).authenticate] }, async (req: any, reply) => {
  try {
    const userId = req.user.userId;
    const { rows } = await pool.query(
      `SELECT product_id, quantity
       FROM cart
       WHERE user_id = $1`,
      [userId]
    );

    return rows.map(r => ({
      productId: r.product_id,
      quantity: r.quantity,
    }));
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ message: 'Ошибка получения корзины' });
  }
});

// Добавить товар в корзину или увеличить количество
app.post('/cart', { preValidation: [(app as any).authenticate] }, async (req: any, reply) => {
  const userId = req.user.userId;
  const { productId, quantity = 1 } = req.body as CartItemBody;

  const existing = await pool.query(
    'SELECT quantity FROM cart WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );

  if (existing.rows.length) {
    await pool.query(
      'UPDATE cart SET quantity = quantity + $1 WHERE user_id = $2 AND product_id = $3',
      [quantity, userId, productId]
    );
  } else {
    await pool.query(
      'INSERT INTO cart(user_id, product_id, quantity) VALUES($1, $2, $3)',
      [userId, productId, quantity]
    );
  }

  return reply.send({ message: 'Товар добавлен в корзину' });
});

// Изменить количество товара
app.put('/cart/:productId', { preValidation: [(app as any).authenticate] }, async (req: any, reply) => {
  const userId = req.user.userId;
  const { productId } = req.params as { productId: string };
  const { quantity } = req.body as { quantity: number };

  if (quantity <= 0) {
    await pool.query('DELETE FROM cart WHERE user_id = $1 AND product_id = $2', [userId, productId]);
  } else {
    await pool.query(
      'UPDATE cart SET quantity = $1 WHERE user_id = $2 AND product_id = $3',
      [quantity, userId, productId]
    );
  }

  return reply.send({ message: 'Количество обновлено' });
});

// Удалить товар из корзины
app.delete('/cart/:productId', { preValidation: [(app as any).authenticate] }, async (req: any, reply) => {
  const userId = req.user.userId;
  const { productId } = req.params as { productId: string };

  await pool.query('DELETE FROM cart WHERE user_id = $1 AND product_id = $2', [userId, productId]);

  return reply.send({ message: 'Товар удален' });
});

interface CheckoutItem {
  productId: string;
  quantity: number;
  price: number;
}

interface CheckoutBody {
  items: CheckoutItem[];
  total: number;
  name: string;
  phone: string;
  address: string;
  comment?: string;
  cardNumber?: string; // для истории
}

// Создать заказ
app.post('/orders', { preValidation: [(app as any).authenticate] }, async (req: any, reply) => {
  const userId = req.user.userId;

  try {
    // 1. Получаем товары из корзины
    const { rows: cartItems } = await pool.query(
      'SELECT product_id, quantity FROM cart WHERE user_id = $1',
      [userId]
    );

    if (!cartItems.length) {
      return reply.code(400).send({ message: 'Корзина пуста' });
    }

    // 2. Считаем total (цена из фронта)
    const total = req.body.total || 0;

    // 3. Генерируем код заказа
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();

    // 4. Вставляем заказ
    const { rows: orderRows } = await pool.query(
      'INSERT INTO orders (user_id, code, total) VALUES ($1, $2, $3) RETURNING id, code, total',
      [userId, code, total]
    );
    const order = orderRows[0];

    // 5. Можно удалить корзину
    await pool.query('DELETE FROM cart WHERE user_id = $1', [userId]);

    return { orderId: order.id, code: order.code, total: order.total, message: 'Заказ создан' };
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ message: 'Ошибка при создании заказа' });
  }
});

// Получить список заказов пользователя
app.get('/orders', { preValidation: [(app as any).authenticate] }, async (req: any, reply) => {
  const userId = req.user.userId;

  try {
    const { rows: orders } = await pool.query(
      'SELECT id, code, total, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // Если у тебя пока нет order_items или не нужно их показывать, просто возвращаем эти данные
    const formattedOrders = orders.map(o => ({
      orderId: o.id.toString(),
      code: o.code || o.id.toString(), // если код ещё не генерируется, используем id
      total: o.total,
      created_at: o.created_at,
    }));

    return formattedOrders;
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ message: 'Ошибка при получении заказов' });
  }
});

// --- СТАРТ СЕРВЕРА ---
const start = async () => {
  try {
    await app.listen({ port: 3001, host: '0.0.0.0' });
    console.log('🚀 API running on http://localhost:3001');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
