import { createClient, type Client } from "@libsql/client";

let dbInstance: Client | undefined;

// Lazy initialization function - creates client only when first called
export function getDb(): Client {
  if (!dbInstance) {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error("TURSO_DATABASE_URL environment variable is not set");
    }
    dbInstance = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return dbInstance;
}

// For backwards compatibility, export db that calls getDb()
export const db = {
  execute: (...args: Parameters<Client['execute']>) => getDb().execute(...args),
  batch: (...args: Parameters<Client['batch']>) => getDb().batch(...args),
  transaction: (...args: Parameters<Client['transaction']>) => getDb().transaction(...args),
  close: () => getDb().close(),
};

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
