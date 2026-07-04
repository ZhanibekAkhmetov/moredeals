import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

function getDatabaseUrl(databaseUrl = process.env.DATABASE_URL): string {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to connect to PostgreSQL.');
  }

  return databaseUrl;
}

export function createPrismaAdapter(databaseUrl?: string): PrismaPg {
  return new PrismaPg({ connectionString: getDatabaseUrl(databaseUrl) });
}

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  return new PrismaClient({
    adapter: createPrismaAdapter(databaseUrl),
  });
}

export * from '@prisma/client';
