// src/modules/reviews/reviews.routes.ts
import { Router } from 'express';
import { reviewsController } from './reviews.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

router.get('/product/:productId', reviewsController.getProductReviews.bind(reviewsController));
router.post('/', authenticate, authorize('CUSTOMER'), reviewsController.create.bind(reviewsController));
router.put('/:id/reply', authenticate, authorize('SELLER'), reviewsController.reply.bind(reviewsController));
router.delete('/:id', authenticate, reviewsController.delete.bind(reviewsController));

export default router;
