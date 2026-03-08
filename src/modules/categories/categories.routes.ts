// src/modules/categories/categories.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { successResponse } from '../../types/api';

const router = Router();

// Public: get full category tree
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        children: {
          where: { isActive: true },
          include: { _count: { select: { products: true } } },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { products: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(successResponse(categories));
  } catch (err) { next(err); }
});

// Public: get single category with products count
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { products: true } },
      },
    });
    if (!category) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found', statusCode: 404 } });
    res.json(successResponse(category));
  } catch (err) { next(err); }
});

export default router;
