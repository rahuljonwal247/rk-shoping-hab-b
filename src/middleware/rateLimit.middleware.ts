// src/middleware/rateLimit.middleware.ts
import rateLimit from "express-rate-limit";
import { redis } from "../config/redis";

// @ts-ignore
import RedisStore from "rate-limit-redis";

function createStore(prefix: string) {
  if (!redis) return undefined; // fallback to memory store

  return new RedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
    prefix,
  });
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore("rl:general:"),
  message: {
    success: false,
    error: { code: "RATE_LIMIT", message: "Too many requests", statusCode: 429 },
  },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore("rl:auth:"),
  message: {
    success: false,
    error: { code: "RATE_LIMIT", message: "Too many auth attempts", statusCode: 429 },
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  store: createStore("rl:upload:"),
  message: {
    success: false,
    error: { code: "RATE_LIMIT", message: "Upload limit exceeded", statusCode: 429 },
  },
});