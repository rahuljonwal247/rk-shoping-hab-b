// src/modules/users/seller.service.ts
import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError } from '../../types/errors';

export class SellerService {
  async getProfile(userId: string) {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, avatar: true } },
        _count: { select: { products: true } },
      },
    });
    if (!profile) throw new NotFoundError('Seller profile');
    return profile;
  }

  async updateProfile(userId: string, data: any) {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundError('Seller profile');
    return prisma.sellerProfile.update({ where: { userId }, data });
  }

  async getDashboardStats(sellerId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get order IDs with seller items
    const sellerOrderIds = await prisma.orderItem.findMany({
      where: { sellerId },
      select: { orderId: true },
      distinct: ['orderId'],
    });
    const orderIds = sellerOrderIds.map((o) => o.orderId);

    const [
      totalProducts, publishedProducts,
      totalOrders, monthOrders,
      revenueData, monthRevenueData,
      pendingOrders, lowStockVariants,
    ] = await Promise.all([
      prisma.product.count({ where: { sellerId } }),
      prisma.product.count({ where: { sellerId, isPublished: true, isApproved: true } }),
      orderIds.length,
      prisma.order.count({ where: { id: { in: orderIds }, createdAt: { gte: startOfMonth } } }),
      prisma.orderItem.aggregate({
        where: { sellerId, order: { status: { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED'] } } },
        _sum: { price: true },
      }),
      prisma.orderItem.aggregate({
        where: {
          sellerId,
          order: { status: { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED'] }, createdAt: { gte: startOfMonth } },
        },
        _sum: { price: true },
      }),
      prisma.order.count({ where: { id: { in: orderIds }, status: 'PENDING' } }),
      prisma.productVariant.count({ where: { product: { sellerId }, stock: { lte: 5 }, isActive: true } }),
    ]);

    return {
      products: { total: totalProducts, published: publishedProducts },
      orders: { total: totalOrders, thisMonth: monthOrders, pending: pendingOrders },
      revenue: {
        total: Number(revenueData._sum.price) || 0,
        thisMonth: Number(monthRevenueData._sum.price) || 0,
      },
      lowStockCount: lowStockVariants,
    };
  }

  async getRevenueChart(sellerId: string, days = 30) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const items = await prisma.orderItem.findMany({
      where: {
        sellerId,
        order: {
          status: { in: ['DELIVERED', 'SHIPPED', 'CONFIRMED'] },
          createdAt: { gte: from },
        },
      },
      include: { order: { select: { createdAt: true } } },
    });

    const daily: Record<string, number> = {};
    for (const item of items) {
      const day = item.order.createdAt.toISOString().split('T')[0];
      daily[day] = (daily[day] || 0) + Number(item.price) * item.quantity;
    }

    return Object.entries(daily)
      .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const sellerService = new SellerService();
