// Re-export everything from the new schema and connection
export * from "./schema";
export * from "./connection";

// For backwards compatibility with existing Encore setup
import { SQLDatabase } from "encore.dev/storage/sqldb";

// Encore database instance for migrations
export const encoreDb = new SQLDatabase("rag_db", {
  migrations: "./migrations",
});
