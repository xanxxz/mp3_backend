import { pool } from './db';
import { brands } from '../mocks/brands';
import { categories } from '../mocks/categories';
import products from '../mocks/products';

async function seed() {
  // Бренды
  for (const brand of brands) {
    await pool.query(
      'INSERT INTO brands(id, name, product_count) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',
      [brand.id, brand.name, brand.productCount]
    );
  }

  // Категории
  for (const cat of categories) {
    await pool.query(
      'INSERT INTO categories(id, name, parent_id, product_count, path) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING',
      [cat.id, cat.name, cat.parentId || null, cat.productCount, cat.path]
    );
  }

  // Продукты + изображения + характеристики
  for (const p of products) {
    await pool.query(
      'INSERT INTO products(id, art, name, price, brand_id, subcategory_id, in_stock, description) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO NOTHING',
      [p.id, p.art, p.name, p.price, p.brandId, p.subcategoryId, p.inStock, p.description]
    );

    for (let i = 0; i < p.images.length; i++) {
      await pool.query(
        'INSERT INTO product_images(product_id, image_url, sort_order) VALUES($1,$2,$3)',
        [p.id, p.images[i], i]
      );
    }

    for (const c of p.characteristics) {
      await pool.query(
        'INSERT INTO product_characteristics(product_id, name, value) VALUES($1,$2,$3)',
        [p.id, c.name, c.value]
      );
    }
  }

  console.log('Seed completed');
  pool.end();
}

seed();