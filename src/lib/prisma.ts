import { PrismaClient } from "@prisma/client";

/**
 * PrismaClient 싱글턴 인스턴스.
 * 개발 모드(핫 리로드)에서 커넥션 풀 고갈을 방지합니다.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
