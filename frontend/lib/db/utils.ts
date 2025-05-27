import { generateId } from "ai";

// Utility functions for database operations
export function generateRandomId() {
  return generateId(12);
}