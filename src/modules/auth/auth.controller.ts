// src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { successResponse } from '../../types/api';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      res.status(201).json(successResponse({
        user: result.user,
        accessToken: result.tokens.accessToken,
      }, 'Registration successful'));
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || 'unknown';
      const result = await authService.login(req.body, ip);
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json(successResponse({
        user: result.user,
        accessToken: result.tokens.accessToken,
      }, 'Login successful'));
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'No refresh token', statusCode: 401 },
        });
      }
      const tokens = await authService.refreshTokens(token);
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json(successResponse({ accessToken: tokens.accessToken }));
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken;
      if (token && req.user) {
        await authService.logout(req.user.id, token);
      }
      res.clearCookie('refreshToken');
      res.json(successResponse(null, 'Logged out successfully'));
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.forgotPassword(req.body);
      res.json(successResponse(null, 'If that email is registered, you will receive an OTP shortly'));
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.resetPassword(req.body);
      res.json(successResponse(null, 'Password reset successfully'));
    } catch (err) {
      next(err);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, token } = req.query as { email: string; token: string };
      await authService.verifyEmail(email, token);
      res.json(successResponse(null, 'Email verified successfully'));
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
