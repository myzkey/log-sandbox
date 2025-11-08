import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

const url = process.env.TURSO_DATABASE_URL ?? 'file:../../data/alb-logs.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client);
