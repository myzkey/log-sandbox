#!/usr/bin/env tsx
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath =
  process.env.TURSO_DATABASE_URL?.replace('file:', '') ??
  path.join(__dirname, '../../../data/alb-logs.db')

console.log(`Migrating database at: ${dbPath}`)

const sqlite = new Database(dbPath)
const db = drizzle(sqlite)

// Run migrations
migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') })

console.log('Migration completed successfully!')

sqlite.close()
