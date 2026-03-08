// src/modules/cart/cart.controller.ts
import { Request, Response, NextFunction } from 'express';
import { cartService } from './cart.service';
import { successResponse } from '../../types/api';

export class CartController {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = await cartService.getCart(req.user!.id);
      res.json(successResponse(cart));
    } catch (err) { next(err); }
  }

  async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { variantId, quantity = 1 } = req.body;
      const item = await cartService.addItem(req.user!.id, variantId, quantity);
      res.status(201).json(successResponse(item, 'Item added to cart'));
    } catch (err) { next(err); }
  }

  async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await cartService.updateItem(req.user!.id, req.params.itemId, req.body.quantity);
      res.json(successResponse(item, 'Cart updated'));
    } catch (err) { next(err); }
  }

  async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      await cartService.removeItem(req.user!.id, req.params.itemId);
      res.json(successResponse(null, 'Item removed'));
    } catch (err) { next(err); }
  }

  async clear(req: Request, res: Response, next: NextFunction) {
    try {
      await cartService.clearCart(req.user!.id);
      res.json(successResponse(null, 'Cart cleared'));
    } catch (err) { next(err); }
  }
}

export const cartController = new CartController();

// src/modules/cart/cart.routes.ts (appended below as separate export)
