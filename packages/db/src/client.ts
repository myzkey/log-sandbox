import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import path from 'path';
import fs from 'fs';

// Use absolute path for local database
const getDbUrl = () => {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }

  // For CI/CD or when DB doesn't exist, use in-memory database
  if (process.env.CI || process.env.NODE_ENV === 'test') {
    return 'file::memory:?cache=shared';
  }

  // For local development, use absolute path from project root
  // Try to find the monorepo root by looking for pnpm-workspace.yaml
  let projectRoot = process.cwd();
  let currentDir = projectRoot;

  // Search up to 3 levels for the workspace root
  for (let i = 0; i < 3; i++) {
    if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      projectRoot = currentDir;
      break;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }

  const dbPath = path.join(projectRoot, 'data', 'alb-logs.db');

  // If database file doesn't exist, use in-memory database
  if (!fs.existsSync(dbPath)) {
    console.warn(`Database file not found at ${dbPath}, using in-memory database`);
    return 'file::memory:?cache=shared';
  }

  return `file:${dbPath}`;
};

const url = getDbUrl();
const authToken = process.env.TURSO_AUTH_TOKEN;

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client);
