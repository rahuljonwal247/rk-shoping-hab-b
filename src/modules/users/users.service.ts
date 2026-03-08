// src/modules/users/users.service.ts
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { NotFoundError, ValidationError } from '../../types/errors';
import { env } from '../../config/env';
import { uploadFileToS3 } from '../../utils/s3';

export class UsersService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, avatar: true, role: true, isVerified: true,
        createdAt: true, sellerProfile: true,
        addresses: { orderBy: { isDefault: 'desc' } },
        _count: { select: { orders: true, reviews: true } },
      },
    });
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatar: true },
    });
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const url = await uploadFileToS3(file, `avatars`);
    return prisma.user.update({
      where: { id: userId },
      data: { avatar: url },
      select: { id: true, avatar: true },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ValidationError('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  async getAddresses(userId: string) {
    return prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  }

  async addAddress(userId: string, data: any) {
    if (data.isDefault) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return prisma.address.create({ data: { userId, ...data } });
  }

  async updateAddress(userId: string, addressId: string, data: any) {
    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundError('Address');
    if (data.isDefault) {
      await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return prisma.address.update({ where: { id: addressId }, data });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundError('Address');
    await prisma.address.delete({ where: { id: addressId } });
  }

  async getWishlist(userId: string) {
    return prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: { images: { where: { isPrimary: true }, take: 1 }, variants: { take: 1, orderBy: { price: 'asc' } } },
        },
      },
    });
  }

  async toggleWishlist(userId: string, productId: string) {
    const existing = await prisma.wishlist.findUnique({ where: { userId_productId: { userId, productId } } });
    if (existing) {
      await prisma.wishlist.delete({ where: { id: existing.id } });
      return { added: false };
    }
    await prisma.wishlist.create({ data: { userId, productId } });
    return { added: true };
  }

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { notifications, total, unread };
  }

  async markNotificationsRead(userId: string, ids?: string[]) {
    await prisma.notification.updateMany({
      where: { userId, ...(ids ? { id: { in: ids } } : {}) },
      data: { isRead: true },
    });
  }
}

export const usersService = new UsersService();
