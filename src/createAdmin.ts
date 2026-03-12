import { pool } from './db'; // твой postgres pool
import bcrypt from 'bcrypt';

async function createAdmin() {
  const email = 'admin1@admin.com';
  const phone = '1234567890';
  const name = 'Админ';
  const region = 'Москва';
  const password = 'Admin123'; // пароль админа
  const role = 'admin';

  try {
    const hashed = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (email, phone, name, region, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role`,
      [email, phone, name, region, hashed, role]
    );

    console.log('Админ создан:', rows[0]);
    process.exit(0);
  } catch (err: any) {
    if (err.code === '23505') {
      console.log('Админ с таким email уже существует');
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

createAdmin();