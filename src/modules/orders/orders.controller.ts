// src/modules/orders/orders.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ordersService } from './orders.service';
import { successResponse } from '../../types/api';

export class OrdersController {
  async place(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ordersService.placeOrder(req.user!.id, req.body);
      res.status(201).json(successResponse(result, 'Order placed successfully'));
    } catch (err) { next(err); }
  }

  async myOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ordersService.getCustomerOrders(req.user!.id, req.query as any);
      res.json(successResponse(result.orders, undefined, result.pagination));
    } catch (err) { next(err); }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await ordersService.getOrderById(req.params.id, req.user!.id, req.user!.role);
      res.json(successResponse(order));
    } catch (err) { next(err); }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await ordersService.cancelOrder(req.params.id, req.user!.id);
      res.json(successResponse(order, 'Order cancelled'));
    } catch (err) { next(err); }
  }

  async sellerOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ordersService.getSellerOrders(req.user!.id, req.query as any);
      res.json(successResponse(result.orders, undefined, result.pagination));
    } catch (err) { next(err); }
  }

  async ship(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await ordersService.shipOrder(req.params.id, req.user!.id, req.body.trackingNum);
      res.json(successResponse(order, 'Order marked as shipped'));
    } catch (err) { next(err); }
  }

  async allOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ordersService.getAllOrders(req.query as any);
      res.json(successResponse(result.orders, undefined, result.pagination));
    } catch (err) { next(err); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await ordersService.updateOrderStatus(req.params.id, req.body.status, req.body.trackingNum);
      res.json(successResponse(order, 'Order status updated'));
    } catch (err) { next(err); }
  }
}

export const ordersController = new OrdersController();
