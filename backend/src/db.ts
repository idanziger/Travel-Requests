import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

// This 'Pool' is our connection manager. 
// It handles multiple requests to the database efficiently.
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'travel_requests',
  password: 'password', // Default password from docker-compose
  port: 5432,
});

// We'll use this function whenever we need to ask the database a question (a "query")
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default pool;
