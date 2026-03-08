// src/modules/auth/auth.dto.ts
import { z } from 'zod';

export const RegisterDto = z.object({
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'SELLER']).default('CUSTOMER'),
  shopName: z.string().min(3).max(100).optional(),
});

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const ForgotPasswordDto = z.object({
  email: z.string().email(),
});

export const ResetPasswordDto = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

export const ChangePasswordDto = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});

export type RegisterInput = z.infer<typeof RegisterDto>;
export type LoginInput = z.infer<typeof LoginDto>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordDto>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordDto>;
