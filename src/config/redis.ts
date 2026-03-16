// src/config/redis.ts
import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

let redis: Redis | null = null;

if (env.REDIS_URL) {
  try {
    const client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
    });

    client.connect().then(() => {
      logger.info("✅ Redis connected");
      redis = client;
    }).catch(() => {
      logger.warn("⚠️ Redis not available. Running without Redis.");
    });

  } catch {
    logger.warn("⚠️ Redis connection failed");
  }
} else {
  logger.info("ℹ️ Redis URL not configured. Running without Redis.");
}

export { redis };

export const REDIS_KEYS = {
  refreshToken: (id: string) => `refresh:${id}`,
  rateLimit: (ip: string) => `rate:${ip}`,
  otpReset: (email: string) => `otp:reset:${email}`,
  otpVerify: (email: string) => `otp:verify:${email}`,
  cartCount: (userId: string) => `cart:count:${userId}`,
  productCache: (slug: string) => `product:${slug}`,
  categoryCache: () => `categories:tree`,
} as const;