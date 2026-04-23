import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '/root/mp3_backend/.env' });

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
