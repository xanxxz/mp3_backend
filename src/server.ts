import Fastify from 'fastify';
import cors from '@fastify/cors';
import { pool } from './db';
import fastifyStatic from '@fastify/static';
import path from 'path';
import productData from '../mocks/products';

const app = Fastify({ logger: true });

app.register(cors, { origin: true });

app.register(fastifyStatic, {
  root: path.join(__dirname, '../public'), // папка public на одном уровне с src
  prefix: '/images/', // URL для доступа к картинкам
});

// --- БРЕНДЫ ---
app.get('/brands', async () => {
  const { rows } = await pool.query('SELECT * FROM brands ORDER BY name');
  return rows;
});


// --- КАТЕГОРИИ ---
app.get('/categories', async () => {
  const { rows } = await pool.query('SELECT * FROM categories ORDER BY id');
  return rows;
});


// --- ВСЕ ПРОДУКТЫ С ФИЛЬТРАМИ ---
app.get('/products', async (req, reply) => {
  const { brand, category, subcategory } = req.query as {
    brand?: string;
    category?: string;
    subcategory?: string;
  };

  const values: any[] = [];
  const where: string[] = [];

  if (brand) {
    const brandId = Number(brand);
    if (!isNaN(brandId)) {
      values.push(brandId);
      where.push(`p.brand_id = $${values.length}::int`);
    }
  }

  if (subcategory) {
    const subcatId = Number(subcategory);
    if (!isNaN(subcatId)) {
      values.push(subcatId);
      where.push(`p.subcategory_id = $${values.length}::int`);
    }
  }

  if (category) {
    const categoryId = Number(category);
    if (!isNaN(categoryId)) {
      values.push(categoryId);
      where.push(`
        p.subcategory_id IN (
          SELECT id FROM categories WHERE parent_id = $${values.length}::int
        )
      `);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const query = `
    SELECT 
      p.id,
      p.name,
      p.art,
      p.description,
      p.price,
      p.brand_id AS "brandId",
      p.subcategory_id AS "subcategoryId",
      p.in_stock AS "inStock",
      COALESCE(
        JSON_AGG(pi.image_url ORDER BY pi.sort_order)
        FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) AS images
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
    ${whereSql}
    GROUP BY p.id
    ORDER BY p.name
  `;

  try {
    const { rows } = await pool.query(query, values);

    const productsWithUrls = rows.map((p) => {
      const imgs: string[] = Array.isArray(p.images)
        ? p.images
        : JSON.parse(p.images || '[]');

      return {
        ...p,
        images: imgs.map((img) =>
          img.startsWith('/images/') ? img : `/images/${img}`
        ),
      };
    });

    return productsWithUrls;
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Ошибка при получении продуктов',
    });
  }
});

// --- ОДИН ПРОДУКТ С КАРТИНКАМИ И ХАРАКТЕРИСТИКАМИ ---
app.get('/products/:id', async (req, reply) => {
  const { id } = req.params as { id: string };

  const query = `
    SELECT 
      p.id,
      p.name,
      p.art,
      p.description,
      p.price,
      p.brand_id AS "brandId",
      p.subcategory_id AS "subcategoryId",
      p.in_stock AS "inStock",
      COALESCE(
        JSON_AGG(DISTINCT pi.image_url ORDER BY pi.sort_order)
        FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) AS images,
      COALESCE(
        JSON_AGG(DISTINCT jsonb_build_object('name', pc.name, 'value', pc.value))
        FILTER (WHERE pc.id IS NOT NULL),
        '[]'
      ) AS characteristics
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
    LEFT JOIN product_characteristics pc ON pc.product_id = p.id
    WHERE p.id = $1
    GROUP BY p.id
  `;

  const { rows } = await pool.query(query, [id]);

  if (!rows.length) return reply.code(404).send({ message: 'Product not found' });

  const product = rows[0];

  product.images = product.images.map((img: string) =>
    img.startsWith('/images/') ? img : `/images/${img}`
  );

  return product;
});

// --- КОРЗИНА (in-memory) ---
interface CartItem {
  productId: string;
  quantity: number;
}

const cart: CartItem[] = [];

// Показать корзину
app.get('/cart', async () => {
  // возвращаем товары с полной информацией из productData
  const fullCart = cart.map((item) => {
    const product = productData.find((p) => p.id === item.productId);
    if (!product) return null;
    return { ...product, quantity: item.quantity };
  }).filter(Boolean);

  return fullCart;
});

// Добавить товар в корзину
app.post('/cart', async (req, reply) => {
  const { productId, quantity } = req.body as { productId: string; quantity?: number };
  const qty = quantity ?? 1;

  const product = productData.find((p) => p.id === productId);
  if (!product) return reply.code(404).send({ message: 'Product not found' });

  const existing = cart.find((c) => c.productId === productId);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({ productId, quantity: qty });
  }

  return { message: 'Product added to cart', cart };
});

// Удалить товар из корзины
app.delete('/cart/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const index = cart.findIndex((c) => c.productId === id);
  if (index === -1) return reply.code(404).send({ message: 'Product not in cart' });

  cart.splice(index, 1);
  return { message: 'Product removed from cart', cart };
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
