import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Database connection configuration
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/roborail_db";

// Create PostgreSQL connection
const sql = postgres(connectionString);

// Create Drizzle database instance with schema
export const db = drizzle(sql, { schema });

// Export types for use in other modules
export type Database = typeof db;
export { sql };