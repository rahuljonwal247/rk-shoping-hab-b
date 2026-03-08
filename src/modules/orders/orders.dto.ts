// src/modules/orders/orders.dto.ts
import { z } from 'zod';

export const PlaceOrderDto = z.object({
  addressId: z.string().uuid(),
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
  })).min(1),
  couponCode: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const UpdateOrderStatusDto = z.object({
  status: z.enum(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  trackingNum: z.string().optional(),
});

export const ShipOrderDto = z.object({
  trackingNum: z.string().min(1),
});

export type PlaceOrderInput = z.infer<typeof PlaceOrderDto>;
