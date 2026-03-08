// src/modules/payments/payments.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { paymentsService } from './payments.service';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { successResponse } from '../../types/api';

const router = Router();

// Stripe webhook - raw body required
router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    await paymentsService.handleWebhook(req.body, sig);
    res.json({ received: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/intent/:orderId', authenticate, authorize('CUSTOMER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await paymentsService.createPaymentIntent(req.params.orderId, req.user!.id);
    res.json(successResponse(result));
  } catch (err) { next(err); }
});

export default router;
