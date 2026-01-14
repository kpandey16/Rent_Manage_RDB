import { createClient } from "@libsql/client";

// Direct initialization - environment variables must be set
export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Helper to generate ULID-like IDs
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 12);
  return `${timestamp}${randomPart}`.toUpperCase();
}

// Helper to get current ISO datetime
export function getCurrentDateTime(): string {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

// Helper to get current date in YYYY-MM-DD format
export function getCurrentDate(): string {
  return new Date().toISOString().substring(0, 10);
}

// Helper to get current period in YYYY-MM format
export function getCurrentPeriod(): string {
  return new Date().toISOString().substring(0, 7);
}
