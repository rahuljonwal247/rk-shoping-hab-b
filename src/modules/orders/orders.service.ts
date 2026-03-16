// src/modules/orders/orders.service.ts
import Stripe from 'stripe';
import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, AppError, ValidationError } from '../../types/errors';
import { paginationMeta, PaginationQuery } from '../../types/api';
import { env } from '../../config/env';
import { PlaceOrderInput } from './orders.dto';

const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2024-06-20' });

export class OrdersService {
  async placeOrder(customerId: string, data: PlaceOrderInput) {
    // Validate address
    const address = await prisma.address.findFirst({
      where: { id: data.addressId, userId: customerId },
    });
    if (!address) throw new NotFoundError('Address');

    // Fetch variants with product info
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: data.items.map(i => i.variantId) }, isActive: true },
      include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
    });

    if (variants.length !== data.items.length) throw new ValidationError('One or more variants not found');

    // Check stock and calculate totals
    const orderItems: Array<{
      variantId: string; productId: string; name: string; image: string;
      price: number; quantity: number; sellerId: string;
    }> = [];

    let subtotal = 0;
    for (const item of data.items) {
      const variant = variants.find(v => v.id === item.variantId);
      if (!variant) throw new ValidationError(`Variant ${item.variantId} not found`);
      if (variant.stock < item.quantity) {
        throw new AppError(`Insufficient stock for ${variant.name}`, 409, 'INSUFFICIENT_STOCK');
      }

      const price = Number(variant.price);
      subtotal += price * item.quantity;
      orderItems.push({
        variantId: variant.id,
        productId: variant.productId,
        name: `${variant.product.name} - ${variant.name}`,
        image: variant.product.images[0]?.url || '',
        price,
        quantity: item.quantity,
        sellerId: variant.product.sellerId,
      });
    }

    // Apply coupon
    let discount = 0;
    if (data.couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: data.couponCode,
          isActive: true,
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
            { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
          ],
        },
      });
      if (!coupon) throw new ValidationError('Invalid or expired coupon code');
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new ValidationError('Coupon usage limit reached');
      }
      if (coupon.minOrder && subtotal < Number(coupon.minOrder)) {
        throw new ValidationError(`Minimum order for this coupon is $${coupon.minOrder}`);
      }

      if (coupon.type === 'PERCENTAGE') {
        discount = (subtotal * Number(coupon.value)) / 100;
        if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
      } else {
        discount = Number(coupon.value);
      }
    }

    const shippingFee = subtotal > 50 ? 0 : 4.99;
    const tax = (subtotal - discount) * 0.08;
    const totalAmount = subtotal - discount + shippingFee + tax;

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerId,
          addressId: data.addressId,
          subtotal,
          discount,
          shippingFee,
          tax,
          totalAmount,
          couponCode: data.couponCode,
          notes: data.notes,
          items: {
            create: orderItems.map(item => ({
              variantId: item.variantId,
              productId: item.productId,
              name: item.name,
              image: item.image,
              price: item.price,
              quantity: item.quantity,
              sellerId: item.sellerId,
            })),
          },
        },
        include: { items: true },
      });

      // Decrement stock
      for (const item of data.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Update coupon usage
      if (data.couponCode) {
        await tx.coupon.update({
          where: { code: data.couponCode },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Clear cart
      const cart = await tx.cart.findUnique({ where: { userId: customerId } });
      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id, variantId: { in: data.items.map(i => i.variantId) } },
        });
      }

      return newOrder;
    });

    // Create Stripe Payment Intent
    let paymentIntent = null;
    if (env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY !== 'sk_test_placeholder') {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100),
        currency: 'usd',
        metadata: { orderId: order.id, customerId },
      });

      await prisma.payment.create({
        data: {
          orderId: order.id,
          stripeIntentId: paymentIntent.id,
          amount: totalAmount,
        },
      });
    }

    // Notification
    await prisma.notification.create({
      data: {
        userId: customerId,
        type: 'ORDER_PLACED',
        title: 'Order Placed',
        body: `Your order #${order.id.slice(-8).toUpperCase()} has been placed successfully.`,
        data: { orderId: order.id },
      },
    });

    return { order, clientSecret: paymentIntent?.client_secret };
  }

  async getCustomerOrders(customerId: string, query: PaginationQuery) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { take: 3 },
          payment: { select: { status: true, amount: true } },
        },
      }),
      prisma.order.count({ where: { customerId } }),
    ]);

    return { orders, pagination: paginationMeta(total, page, limit) };
  }

  async getOrderById(id: string, userId: string, role: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        payment: true,
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      },
    });

    if (!order) throw new NotFoundError('Order');
    if (role === 'CUSTOMER' && order.customerId !== userId) {
      throw new ForbiddenError('You do not have access to this order');
    }

    return order;
  }

  async cancelOrder(id: string, customerId: string) {
    const order = await prisma.order.findFirst({ where: { id, customerId } });
    if (!order) throw new NotFoundError('Order');
    if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
      throw new AppError('Order cannot be cancelled at this stage', 409, 'CANNOT_CANCEL');
    }

    // Restore stock
    const items = await prisma.orderItem.findMany({ where: { orderId: id } });
    await prisma.$transaction([
      prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } }),
      ...items.map(item =>
        prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        })
      ),
    ]);

    return prisma.order.findUnique({ where: { id } });
  }

  async shipOrder(id: string, sellerId: string, trackingNum: string) {
    const orderItems = await prisma.orderItem.findFirst({ where: { orderId: id, sellerId } });
    if (!orderItems) throw new ForbiddenError('You have no items in this order');

    return prisma.order.update({
      where: { id },
      data: { status: 'SHIPPED', trackingNum },
    });
  }

  async getSellerOrders(sellerId: string, query: PaginationQuery) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const orderIds = await prisma.orderItem.findMany({
      where: { sellerId },
      select: { orderId: true },
      distinct: ['orderId'],
    });

    const ids = orderIds.map(o => o.orderId);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { id: { in: ids } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { where: { sellerId } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      ids.length,
    ]);

    return { orders, pagination: paginationMeta(total, page, limit) };
  }

  async getAllOrders(query: PaginationQuery & { status?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          payment: { select: { status: true, amount: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, pagination: paginationMeta(total, page, limit) };
  }

  async updateOrderStatus(id: string, status: any, trackingNum?: string) {
    return prisma.order.update({
      where: { id },
      data: { status, ...(trackingNum ? { trackingNum } : {}) },
    });
  }
}

export const ordersService = new OrdersService();
