// src/modules/products/products.dto.ts
import { z } from 'zod';

export const CreateProductDto = z.object({
  name: z.string().min(2).max(200),
  categoryId: z.string().uuid(),
  description: z.string().min(10),
  basePrice: z.number().positive(),
  comparePrice: z.number().positive().optional(),
  sku: z.string().optional(),
  weight: z.number().positive().optional(),
  tags: z.array(z.string()).default([]),
  metaTitle: z.string().max(100).optional(),
  metaDesc: z.string().max(200).optional(),
});

export const UpdateProductDto = CreateProductDto.partial();

export const CreateVariantDto = z.object({
  name: z.string().min(1),
  sku: z.string(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  attributes: z.record(z.string()),
});

export const ProductQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'popular', 'rating']).default('newest'),
  sellerId: z.string().uuid().optional(),
  featured: z.coerce.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductDto>;
export type UpdateProductInput = z.infer<typeof UpdateProductDto>;
export type ProductQuery = z.infer<typeof ProductQueryDto>;
