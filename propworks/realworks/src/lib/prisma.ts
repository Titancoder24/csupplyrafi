import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prismaClientSingleton = () => {
  // Fix for Vercel: SQLite requires write permissions (for journaling) but Vercel's filesystem is read-only.
  // We copy the database into /tmp (which is writable) during Serverless initialization.
  if (process.env.VERCEL) {
    const tmpDbPath = '/tmp/dev.db';
    if (!fs.existsSync(tmpDbPath)) {
      try {
        const sourceDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
        if (fs.existsSync(sourceDbPath)) {
          fs.copyFileSync(sourceDbPath, tmpDbPath);
        }
      } catch (e) {
        console.error("Failed to copy SQLite DB to /tmp on Vercel:", e);
      }
    }
    return new PrismaClient({
      datasources: {
        db: {
          url: 'file:/tmp/dev.db'
        }
      }
    });
  }

  return new PrismaClient();
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
