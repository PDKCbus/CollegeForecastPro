import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

// Database connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// Initialize database tables
export async function initializeDatabase() {
  try {
    console.log('Initializing database tables...');
    
    // Test connection
    await client`SELECT 1`;
    console.log('Database connection successful');
    
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}