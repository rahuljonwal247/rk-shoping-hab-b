// src/modules/users/users.controller.ts
import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { successResponse } from '../../types/api';

export class UsersController {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.getProfile(req.user!.id);
      res.json(successResponse(user));
    } catch (err) { next(err); }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.updateProfile(req.user!.id, req.body);
      res.json(successResponse(user, 'Profile updated'));
    } catch (err) { next(err); }
  }

  async updateAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded', statusCode: 400 } });
      const user = await usersService.updateAvatar(req.user!.id, req.file);
      res.json(successResponse(user, 'Avatar updated'));
    } catch (err) { next(err); }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      await usersService.changePassword(req.user!.id, currentPassword, newPassword);
      res.json(successResponse(null, 'Password changed successfully'));
    } catch (err) { next(err); }
  }

  async getAddresses(req: Request, res: Response, next: NextFunction) {
    try {
      const addresses = await usersService.getAddresses(req.user!.id);
      res.json(successResponse(addresses));
    } catch (err) { next(err); }
  }

  async addAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const address = await usersService.addAddress(req.user!.id, req.body);
      res.status(201).json(successResponse(address, 'Address added'));
    } catch (err) { next(err); }
  }

  async updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const address = await usersService.updateAddress(req.user!.id, req.params.id, req.body);
      res.json(successResponse(address, 'Address updated'));
    } catch (err) { next(err); }
  }

  async deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.deleteAddress(req.user!.id, req.params.id);
      res.json(successResponse(null, 'Address deleted'));
    } catch (err) { next(err); }
  }

  async getWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const wishlist = await usersService.getWishlist(req.user!.id);
      res.json(successResponse(wishlist));
    } catch (err) { next(err); }
  }

  async toggleWishlist(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.toggleWishlist(req.user!.id, req.body.productId);
      res.json(successResponse(result, result.added ? 'Added to wishlist' : 'Removed from wishlist'));
    } catch (err) { next(err); }
  }

  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query as any;
      const result = await usersService.getNotifications(req.user!.id, page, limit);
      res.json(successResponse(result));
    } catch (err) { next(err); }
  }

  async markNotificationsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.markNotificationsRead(req.user!.id, req.body.ids);
      res.json(successResponse(null, 'Notifications marked as read'));
    } catch (err) { next(err); }
  }
}

export const usersController = new UsersController();
