// src/config/database.ts
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const isProduction = process.env.NODE_ENV === 'production';

export const prisma = global.__prisma ?? new PrismaClient({
  log: isProduction
    ? [{ emit: 'event', level: 'error' }]
    : [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
  datasources: {
    db: {
      url: `${process.env.DATABASE_URL}${isProduction ? '?connection_limit=10&pool_timeout=20' : ''}`,
    },
  },
});

if (!isProduction) {
  global.__prisma = prisma;
}

prisma.$on('error' as never, (e: any) => {
  logger.error('Prisma error:', e);
});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected');
  } catch (err) {
    logger.error('❌ Database connection failed:', err);
    process.exit(1);
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
