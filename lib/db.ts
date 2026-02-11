import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { withAccelerate } from '@prisma/extension-accelerate';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const url = process.env.DATABASE_URL?.trim() ?? '';

function createPrismaClient(): PrismaClient {
  if (!url) {
    throw new Error(
      'DATABASE_URL이 설정되지 않았습니다. PostgreSQL 연결을 위해 .env에 DATABASE_URL을 설정하세요.'
    );
  }

  // prisma+postgres 또는 prisma:// (Accelerate) URL
  if (url.startsWith('prisma+postgres') || url.startsWith('prisma://')) {
    return new PrismaClient({ accelerateUrl: url }).$extends(withAccelerate()) as unknown as PrismaClient;
  }

  // postgresql:// 직접 연결
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}
