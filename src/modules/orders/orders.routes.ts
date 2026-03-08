// src/modules/orders/orders.routes.ts
import { Router } from 'express';
import { ordersController } from './orders.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { PlaceOrderDto, UpdateOrderStatusDto, ShipOrderDto } from './orders.dto';

const router = Router();

// Customer
router.post('/', authenticate, authorize('CUSTOMER'), validateBody(PlaceOrderDto), ordersController.place.bind(ordersController));
router.get('/', authenticate, authorize('CUSTOMER'), ordersController.myOrders.bind(ordersController));
router.get('/:id', authenticate, ordersController.getOne.bind(ordersController));
router.put('/:id/cancel', authenticate, authorize('CUSTOMER'), ordersController.cancel.bind(ordersController));

// Seller
router.get('/seller/orders', authenticate, authorize('SELLER'), ordersController.sellerOrders.bind(ordersController));
router.put('/seller/:id/ship', authenticate, authorize('SELLER'), validateBody(ShipOrderDto), ordersController.ship.bind(ordersController));

// Admin
router.get('/admin/orders', authenticate, authorize('ADMIN'), ordersController.allOrders.bind(ordersController));
router.put('/admin/:id/status', authenticate, authorize('ADMIN'), validateBody(UpdateOrderStatusDto), ordersController.updateStatus.bind(ordersController));

export default router;
