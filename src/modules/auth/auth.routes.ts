// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { authController } from './auth.controller';
import { validateBody } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rateLimit.middleware';
import {
  RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto,
} from './auth.dto';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 */
router.post('/register', authLimiter, validateBody(RegisterDto), authController.register.bind(authController));
router.post('/login', authLimiter, validateBody(LoginDto), authController.login.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));
router.post('/forgot-password', authLimiter, validateBody(ForgotPasswordDto), authController.forgotPassword.bind(authController));
router.post('/reset-password', authLimiter, validateBody(ResetPasswordDto), authController.resetPassword.bind(authController));
router.get('/verify-email', authController.verifyEmail.bind(authController));

export default router;
