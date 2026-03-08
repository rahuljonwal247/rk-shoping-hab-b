// src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { redis, REDIS_KEYS } from '../../config/redis';
import { env } from '../../config/env';
import {
  AppError, ConflictError, UnauthorizedError, NotFoundError, ValidationError,
} from '../../types/errors';
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from './auth.dto';
import { sendEmail } from '../../utils/email';
import { Role } from '@prisma/client';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function generateAccessToken(payload: { id: string; role: Role; email: string; isVerified: boolean }) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES } as any);
}

function generateRefreshToken(userId: string) {
  return jwt.sign({ id: userId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  } as any);
}

export class AuthService {
  async register(data: RegisterInput): Promise<{ user: any; tokens: TokenPair }> {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('Email already registered');

    if (data.role === 'SELLER' && !data.shopName) {
      throw new ValidationError('Shop name is required for seller registration');
    }

    if (data.role === 'SELLER' && data.shopName) {
      const shopExists = await prisma.sellerProfile.findFirst({
        where: { shopName: data.shopName },
      });
      if (shopExists) throw new ConflictError('Shop name already taken');
    }

    const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: data.role as Role,
        },
      });

      if (data.role === 'SELLER' && data.shopName) {
        const slug = data.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await tx.sellerProfile.create({
          data: {
            userId: newUser.id,
            shopName: data.shopName,
            slug,
          },
        });
      }

      await tx.cart.create({ data: { userId: newUser.id } });
      return newUser;
    });

    // Store verify token in Redis (24h)
    await redis.setex(REDIS_KEYS.otpVerify(user.email), 86400, verifyToken);

    // Send verification email (non-blocking)
    sendEmail({
      to: user.email,
      subject: 'Verify your email',
      html: `<p>Click <a href="${env.FRONTEND_URL}/verify-email?token=${verifyToken}&email=${user.email}">here</a> to verify your email.</p>`,
    }).catch(() => {});

    const tokens = this.createTokenPair({ id: user.id, role: user.role, email: user.email, isVerified: user.isVerified });
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, tokens };
  }

  async login(data: LoginInput, ip: string): Promise<{ user: any; tokens: TokenPair }> {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      if (user) {
        await prisma.loginAttempt.create({
          data: { userId: user.id, ip, success: false },
        });
        // Check lockout
        const failedCount = await prisma.loginAttempt.count({
          where: {
            userId: user.id,
            success: false,
            createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          },
        });
        if (failedCount >= 5) {
          throw new AppError('Account locked due to too many failed attempts. Try again in 15 minutes.', 423, 'ACCOUNT_LOCKED');
        }
      }
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) throw new AppError('Account suspended', 403, 'ACCOUNT_SUSPENDED');

    await prisma.loginAttempt.create({ data: { userId: user.id, ip, success: true } });

    const tokens = this.createTokenPair({ id: user.id, role: user.role, email: user.email, isVerified: user.isVerified });
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, tokens };
  }

  async refreshTokens(token: string): Promise<TokenPair> {
    let payload: any;
    try {
      payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const stored = await prisma.refreshToken.findFirst({
      where: { token, userId: payload.id },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expired or invalid');
    }

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = this.createTokenPair({
      id: stored.user.id,
      role: stored.user.role,
      email: stored.user.email,
      isVerified: stored.user.isVerified,
    });
    await this.storeRefreshToken(stored.user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId, token: refreshToken } });
  }

  async forgotPassword(data: ForgotPasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return; // Don't reveal if email exists

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.setex(REDIS_KEYS.otpReset(data.email), 600, otp); // 10 min

    await sendEmail({
      to: data.email,
      subject: 'Password Reset OTP',
      html: `<p>Your OTP for password reset is: <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    });
  }

  async resetPassword(data: ResetPasswordInput): Promise<void> {
    const storedOtp = await redis.get(REDIS_KEYS.otpReset(data.email));
    if (!storedOtp || storedOtp !== data.otp) {
      throw new ValidationError('Invalid or expired OTP');
    }

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new NotFoundError('User');

    const passwordHash = await bcrypt.hash(data.newPassword, env.BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await redis.del(REDIS_KEYS.otpReset(data.email));
    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  }

  async verifyEmail(email: string, token: string): Promise<void> {
    const stored = await redis.get(REDIS_KEYS.otpVerify(email));
    if (!stored || stored !== token) throw new ValidationError('Invalid verification link');

    await prisma.user.update({ where: { email }, data: { isVerified: true } });
    await redis.del(REDIS_KEYS.otpVerify(email));
  }

  private createTokenPair(payload: { id: string; role: Role; email: string; isVerified: boolean }): TokenPair {
    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload.id),
    };
  }

  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
    // Cleanup old tokens
    const old = await prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    if (old.length > 5) {
      await prisma.refreshToken.deleteMany({
        where: { id: { in: old.slice(0, old.length - 5).map((t) => t.id) } },
      });
    }
  }
}

export const authService = new AuthService();
