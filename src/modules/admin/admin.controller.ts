// src/modules/admin/admin.controller.ts
import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { successResponse } from '../../types/api';

export class AdminController {
  async dashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getDashboardStats();
      res.json(successResponse(stats));
    } catch (err) { next(err); }
  }

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getUsers(req.query as any);
      res.json(successResponse(result.users, undefined, result.pagination));
    } catch (err) { next(err); }
  }

  async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive } = req.body;
      const user = await adminService.updateUserStatus(req.params.id, isActive);
      res.json(successResponse(user, `User ${isActive ? 'activated' : 'banned'}`));
    } catch (err) { next(err); }
  }

  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const cats = await adminService.getCategories();
      res.json(successResponse(cats));
    } catch (err) { next(err); }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const cat = await adminService.createCategory(req.body);
      res.status(201).json(successResponse(cat, 'Category created'));
    } catch (err) { next(err); }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const cat = await adminService.updateCategory(req.params.id, req.body);
      res.json(successResponse(cat, 'Category updated'));
    } catch (err) { next(err); }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      await adminService.deleteCategory(req.params.id);
      res.json(successResponse(null, 'Category deleted'));
    } catch (err) { next(err); }
  }

  async getDisputes(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getDisputes(req.query as any);
      res.json(successResponse(result.disputes, undefined, result.pagination));
    } catch (err) { next(err); }
  }

  async resolveDispute(req: Request, res: Response, next: NextFunction) {
    try {
      const { resolution, status } = req.body;
      const dispute = await adminService.resolveDispute(req.params.id, resolution, status);
      res.json(successResponse(dispute, 'Dispute resolved'));
    } catch (err) { next(err); }
  }

  async revenueReport(req: Request, res: Response, next: NextFunction) {
    try {
      const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = req.query.to ? new Date(req.query.to as string) : new Date();
      const report = await adminService.getRevenueReport(from, to);
      res.json(successResponse(report));
    } catch (err) { next(err); }
  }
}

export const adminController = new AdminController();
