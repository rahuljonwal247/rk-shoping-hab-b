// src/modules/payments/payments.service.ts
import Stripe from 'stripe';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2024-06-20' });

export class PaymentsService {
  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      logger.error('Stripe webhook signature verification failed:', err);
      throw new Error('Invalid webhook signature');
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.dispute.created':
        await this.handleDispute(event.data.object as Stripe.Dispute);
        break;
      default:
        logger.info(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
    const orderId = intent.metadata.orderId;
    if (!orderId) return;

    await prisma.payment.update({
      where: { stripeIntentId: intent.id },
      data: { status: 'SUCCEEDED', stripePaymentId: intent.latest_charge as string },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
    });

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order) {
      await prisma.notification.create({
        data: {
          userId: order.customerId,
          type: 'PAYMENT_SUCCESS',
          title: 'Payment Confirmed',
          body: `Payment for order #${orderId.slice(-8).toUpperCase()} was successful.`,
          data: { orderId },
        },
      });
    }
  }

  private async handlePaymentFailed(intent: Stripe.PaymentIntent) {
    const orderId = intent.metadata.orderId;
    if (!orderId) return;

    await prisma.payment.update({
      where: { stripeIntentId: intent.id },
      data: { status: 'FAILED' },
    });

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order) {
      await prisma.notification.create({
        data: {
          userId: order.customerId,
          type: 'PAYMENT_FAILED',
          title: 'Payment Failed',
          body: `Payment for order #${orderId.slice(-8).toUpperCase()} failed. Please try again.`,
          data: { orderId },
        },
      });
    }
  }

  private async handleDispute(stripeDispute: Stripe.Dispute) {
    logger.warn(`Stripe dispute created: ${stripeDispute.id}`);
    // Additional handling can be added here
  }

  async createPaymentIntent(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId, customerId: userId } });
    if (!order) throw new Error('Order not found');

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(Number(order.totalAmount) * 100),
      currency: 'usd',
      metadata: { orderId, customerId: userId },
    });

    await prisma.payment.upsert({
      where: { orderId },
      create: { orderId, stripeIntentId: intent.id, amount: order.totalAmount },
      update: { stripeIntentId: intent.id },
    });

    return { clientSecret: intent.client_secret };
  }
}

export const paymentsService = new PaymentsService();
