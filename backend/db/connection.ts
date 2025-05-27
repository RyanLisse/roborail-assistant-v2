import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Database connection configuration
const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/rag_db";

// Create connection client
export const client = postgres(dbUrl, {
  max: 10, // Maximum connections in pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Type-safe database instance
export type Database = typeof db;