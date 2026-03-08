// src/modules/products/products.routes.ts
import { Router } from 'express';
import { productsController } from './products.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody, validateQuery } from '../../middleware/validate.middleware';
import { uploadProductImages } from '../../middleware/upload.middleware';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './products.dto';

const router = Router();

// Public
router.get('/', validateQuery(ProductQueryDto), productsController.list.bind(productsController));
router.get('/:slug', productsController.getBySlug.bind(productsController));

// Seller
router.post('/', authenticate, authorize('SELLER'), validateBody(CreateProductDto), productsController.create.bind(productsController));
router.put('/:id', authenticate, authorize('SELLER', 'ADMIN'), validateBody(UpdateProductDto), productsController.update.bind(productsController));
router.delete('/:id', authenticate, authorize('SELLER', 'ADMIN'), productsController.delete.bind(productsController));
router.post('/:id/images', authenticate, authorize('SELLER'), uploadProductImages, productsController.addImages.bind(productsController));
router.delete('/:id/images/:imgId', authenticate, authorize('SELLER'), productsController.deleteImage.bind(productsController));
router.get('/seller/my-products', authenticate, authorize('SELLER'), validateQuery(ProductQueryDto), productsController.myProducts.bind(productsController));

// Admin
router.put('/:id/approve', authenticate, authorize('ADMIN'), productsController.approve.bind(productsController));

export default router;
