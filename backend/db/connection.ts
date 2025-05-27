import { drizzle } from "drizzle-orm/postgres-js";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as schema from "./schema";

// Encore SQL database instance
const encoreDB = new SQLDatabase("rag_db", {
  migrations: "./migrations",
});

// Create Drizzle instance with Encore database connection
export const db = drizzle(encoreDB.connectionString, { schema });

// Type-safe database instance
export type Database = typeof db;