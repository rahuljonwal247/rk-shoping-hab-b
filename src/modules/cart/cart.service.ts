// src/modules/cart/cart.service.ts
import { prisma } from '../../config/database';
import { NotFoundError, ValidationError } from '../../types/errors';

export class CartService {
  async getCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                seller: { select: { id: true, shopName: true } },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        where: { userId },
        data: { userId },
        include: { items: { include: { product: { include: { images: true, seller: true } }, variant: true } } },
      } as any) as any;
    }

    const total = cart!.items.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0);
    return { ...cart, total, itemCount: cart!.items.length };
  }

  async addItem(userId: string, variantId: string, quantity: number) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId, isActive: true },
      include: { product: { select: { isPublished: true, isApproved: true } } },
    });
    if (!variant) throw new NotFoundError('Product variant');
    if (!variant.product.isPublished || !variant.product.isApproved) {
      throw new ValidationError('Product is not available');
    }
    if (variant.stock < quantity) throw new ValidationError('Insufficient stock');

    const cart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const existing = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > variant.stock) throw new ValidationError('Insufficient stock');
      return prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      });
    }

    return prisma.cartItem.create({
      data: { cartId: cart.id, productId: variant.productId, variantId, quantity },
    });
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundError('Cart');

    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundError('Cart item');

    const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } });
    if (!variant || variant.stock < quantity) throw new ValidationError('Insufficient stock');

    return prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundError('Cart');

    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundError('Cart item');

    await prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clearCart(userId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
}

export const cartService = new CartService();
