// src/modules/reviews/reviews.controller.ts
import { Request, Response, NextFunction } from 'express';
import { reviewsService } from './reviews.service';
import { successResponse } from '../../types/api';

export class ReviewsController {
  async getProductReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query as any;
      const result = await reviewsService.getProductReviews(req.params.productId, page, limit);
      res.json(successResponse({ reviews: result.reviews, distribution: result.distribution }, undefined, result.pagination));
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await reviewsService.createReview(req.user!.id, req.body);
      res.status(201).json(successResponse(review, 'Review submitted'));
    } catch (err) { next(err); }
  }

  async reply(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await reviewsService.replyToReview(req.params.id, req.user!.id, req.body.reply);
      res.json(successResponse(review, 'Reply added'));
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await reviewsService.deleteReview(req.params.id, req.user!.id, req.user!.role);
      res.json(successResponse(null, 'Review deleted'));
    } catch (err) { next(err); }
  }
}

export const reviewsController = new ReviewsController();
