// src/modules/users/seller.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { sellerService } from './seller.service';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { successResponse } from '../../types/api';

const router = Router();
router.use(authenticate, authorize('SELLER'));

router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await sellerService.getProfile(req.user!.id);
    res.json(successResponse(profile));
  } catch (err) { next(err); }
});

router.put('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await sellerService.updateProfile(req.user!.id, req.body);
    res.json(successResponse(profile, 'Profile updated'));
  } catch (err) { next(err); }
});

router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await sellerService.getDashboardStats(req.user!.id);
    res.json(successResponse(stats));
  } catch (err) { next(err); }
});

router.get('/revenue-chart', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const chart = await sellerService.getRevenueChart(req.user!.id, days);
    res.json(successResponse(chart));
  } catch (err) { next(err); }
});

export default router;
