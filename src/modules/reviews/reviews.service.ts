// src/modules/reviews/reviews.service.ts
import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, ConflictError } from '../../types/errors';
import { paginationMeta } from '../../types/api';

export class ReviewsService {
  async getProductReviews(productId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      }),
      prisma.review.count({ where: { productId } }),
    ]);

    const distribution = await prisma.review.groupBy({
      by: ['rating'],
      where: { productId },
      _count: true,
    });

    return {
      reviews,
      distribution,
      pagination: paginationMeta(total, page, limit),
    };
  }

  async createReview(userId: string, data: { productId: string; rating: number; title?: string; body?: string; orderId?: string }) {
    const existing = await prisma.review.findFirst({
      where: { productId: data.productId, userId },
    });
    if (existing) throw new ConflictError('You have already reviewed this product');

    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) throw new NotFoundError('Product');

    const review = await prisma.review.create({
      data: { ...data, userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });

    // Update product rating
    const stats = await prisma.review.aggregate({
      where: { productId: data.productId },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.product.update({
      where: { id: data.productId },
      data: {
        avgRating: Math.round((stats._avg.rating || 0) * 10) / 10,
        totalReviews: stats._count,
      },
    });

    return review;
  }

  async replyToReview(reviewId: string, sellerId: string, reply: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: true },
    });
    if (!review) throw new NotFoundError('Review');
    if (review.product.sellerId !== sellerId) throw new ForbiddenError('You do not own this product');

    return prisma.review.update({
      where: { id: reviewId },
      data: { reply, repliedAt: new Date() },
    });
  }

  async deleteReview(reviewId: string, userId: string, role: string) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundError('Review');
    if (role !== 'ADMIN' && review.userId !== userId) throw new ForbiddenError('Not your review');

    await prisma.review.delete({ where: { id: reviewId } });

    // Recalculate rating
    const stats = await prisma.review.aggregate({
      where: { productId: review.productId },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.product.update({
      where: { id: review.productId },
      data: {
        avgRating: Math.round((stats._avg.rating || 0) * 10) / 10,
        totalReviews: stats._count,
      },
    });
  }
}

export const reviewsService = new ReviewsService();
