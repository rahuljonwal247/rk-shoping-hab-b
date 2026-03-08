// tests/unit/auth.service.test.ts
import { AuthService } from '../../src/modules/auth/auth.service';
import { ConflictError, UnauthorizedError } from '../../src/types/errors';

// Mock Prisma
jest.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sellerProfile: { create: jest.fn(), findFirst: jest.fn() },
    cart: { create: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    loginAttempt: { create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn((cb: any) => cb({
      user: { create: jest.fn() },
      sellerProfile: { create: jest.fn() },
      cart: { create: jest.fn() },
    })),
  },
}));

jest.mock('../../src/config/redis', () => ({
  redis: {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
  REDIS_KEYS: {
    otpVerify: (e: string) => `otp:verify:${e}`,
    otpReset: (e: string) => `otp:reset:${e}`,
  },
}));

jest.mock('../../src/utils/email', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../src/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_ACCESS_EXPIRES: '15m',
    JWT_REFRESH_EXPIRES: '7d',
    BCRYPT_ROUNDS: 1, // Low rounds for test speed
    FRONTEND_URL: 'http://localhost:3000',
    SENDGRID_API_KEY: '',
  },
}));

const { prisma } = require('../../src/config/database');

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw ConflictError if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' });
      await expect(
        service.register({ email: 'test@test.com', password: 'Test@123', firstName: 'A', lastName: 'B', role: 'CUSTOMER' })
      ).rejects.toThrow(ConflictError);
    });

    it('should create user and return tokens for CUSTOMER', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const mockUser = {
        id: 'uuid-1',
        email: 'new@test.com',
        firstName: 'New',
        lastName: 'User',
        role: 'CUSTOMER',
        isVerified: false,
        passwordHash: 'hashed',
      };
      prisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          sellerProfile: { create: jest.fn() },
          cart: { create: jest.fn() },
        });
      });

      const result = await service.register({
        email: 'new@test.com',
        password: 'Test@123',
        firstName: 'New',
        lastName: 'User',
        role: 'CUSTOMER',
      });

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedError for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'wrong' }, '127.0.0.1')).rejects.toThrow(UnauthorizedError);
    });
  });
});
