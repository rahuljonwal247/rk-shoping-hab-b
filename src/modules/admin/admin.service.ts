// src/modules/admin/admin.service.ts
import { prisma } from '../../config/database';
import { NotFoundError } from '../../types/errors';
import { paginationMeta, PaginationQuery } from '../../types/api';

export class AdminService {
  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalRevenue, monthRevenue, lastMonthRevenue,
      totalOrders, monthOrders,
      totalUsers, newUsers,
      totalSellers, activeSellers,
      pendingProducts, openDisputes,
    ] = await Promise.all([
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCEEDED' } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCEEDED', createdAt: { gte: startOfMonth } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCEEDED', createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count({ where: { role: 'SELLER' } }),
      prisma.user.count({ where: { role: 'SELLER', isActive: true } }),
      prisma.product.count({ where: { isApproved: false, isPublished: false } }),
      prisma.dispute.count({ where: { status: 'OPEN' } }),
    ]);

    const revenueGrowth = lastMonthRevenue._sum.amount
      ? ((Number(monthRevenue._sum.amount) - Number(lastMonthRevenue._sum.amount)) / Number(lastMonthRevenue._sum.amount)) * 100
      : 0;

    return {
      revenue: {
        total: Number(totalRevenue._sum.amount) || 0,
        thisMonth: Number(monthRevenue._sum.amount) || 0,
        growth: Math.round(revenueGrowth * 100) / 100,
      },
      orders: { total: totalOrders, thisMonth: monthOrders },
      users: { total: totalUsers, newThisMonth: newUsers },
      sellers: { total: totalSellers, active: activeSellers },
      pendingProducts,
      openDisputes,
    };
  }

  async getUsers(query: PaginationQuery & { role?: string; status?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'banned') where.isActive = false;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isActive: true, isVerified: true, createdAt: true,
          sellerProfile: { select: { shopName: true } },
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, pagination: paginationMeta(total, page, limit) };
  }

  async updateUserStatus(id: string, isActive: boolean) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User');
    return prisma.user.update({ where: { id }, data: { isActive } });
  }

  async getCategories() {
    return prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: { children: true, _count: { select: { products: true } } },
        },
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(data: { name: string; parentId?: string; description?: string; image?: string }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return prisma.category.create({ data: { ...data, slug } });
  }

  async updateCategory(id: string, data: any) {
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundError('Category');
    if (data.name) data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return prisma.category.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundError('Category');
    return prisma.category.delete({ where: { id } });
  }

  async getDisputes(query: PaginationQuery & { status?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { include: { items: { take: 1 } } },
          customer: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.dispute.count({ where }),
    ]);

    return { disputes, pagination: paginationMeta(total, page, limit) };
  }

  async resolveDispute(id: string, resolution: string, status: 'RESOLVED' | 'CLOSED') {
    const dispute = await prisma.dispute.findUnique({ where: { id } });
    if (!dispute) throw new NotFoundError('Dispute');
    return prisma.dispute.update({ where: { id }, data: { resolution, status } });
  }

  async getRevenueReport(from: Date, to: Date) {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: { in: ['DELIVERED', 'SHIPPED'] },
      },
      include: {
        payment: { select: { amount: true, status: true } },
        items: { select: { price: true, quantity: true, sellerId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const dailyRevenue: Record<string, number> = {};
    for (const order of orders) {
      const day = order.createdAt.toISOString().split('T')[0];
      dailyRevenue[day] = (dailyRevenue[day] || 0) + Number(order.totalAmount);
    }

    return {
      orders: orders.length,
      totalRevenue: orders.reduce((s, o) => s + Number(o.totalAmount), 0),
      dailyRevenue: Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue })),
    };
  }
}

export const adminService = new AdminService();
