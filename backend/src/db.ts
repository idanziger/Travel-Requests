import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'travel_requests',
      password: 'password',
      port: 5432,
    });

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default pool;
