import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Use only auth-schema for migrations - app schema is created via raw SQL in initDatabase.ts
  // This avoids drizzle-kit introspection issues with the app schema
  schema: './src/db/auth-schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  ...(process.env.DATABASE_URL && {
    dbCredentials: {
      url: process.env.DATABASE_URL,
    },
  }),
  // PGlite doesn't need connection details - migrations are applied in code
  // In production with DATABASE_URL, drizzle-kit can connect to Neon
  migrations: {
    prefix: 'timestamp', // Ensures unique migration filenames across branches
  },
});
