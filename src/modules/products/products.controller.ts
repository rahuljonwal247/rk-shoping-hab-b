// src/modules/products/products.controller.ts
import { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service';
import { successResponse } from '../../types/api';

export class ProductsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productsService.listProducts(req.query as any);
      res.json(successResponse(result.products, undefined, result.pagination));
    } catch (err) { next(err); }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.getProductBySlug(req.params.slug);
      res.json(successResponse(product));
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.createProduct(req.user!.id, req.body);
      res.status(201).json(successResponse(product, 'Product created. Pending admin approval.'));
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productsService.updateProduct(req.params.id, req.user!.id, req.body, req.user!.role);
      res.json(successResponse(product, 'Product updated'));
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await productsService.deleteProduct(req.params.id, req.user!.id, req.user!.role);
      res.json(successResponse(null, 'Product deleted'));
    } catch (err) { next(err); }
  }

  async addImages(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      const images = await productsService.addImages(req.params.id, req.user!.id, files);
      res.status(201).json(successResponse(images, 'Images uploaded'));
    } catch (err) { next(err); }
  }

  async deleteImage(req: Request, res: Response, next: NextFunction) {
    try {
      await productsService.deleteImage(req.params.id, req.params.imgId, req.user!.id);
      res.json(successResponse(null, 'Image removed'));
    } catch (err) { next(err); }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { approved } = req.body;
      const product = await productsService.approveProduct(req.params.id, approved);
      res.json(successResponse(product, `Product ${approved ? 'approved' : 'rejected'}`));
    } catch (err) { next(err); }
  }

  async myProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productsService.getSellerProducts(req.user!.id, req.query as any);
      res.json(successResponse(result.products, undefined, result.pagination));
    } catch (err) { next(err); }
  }
}

export const productsController = new ProductsController();
