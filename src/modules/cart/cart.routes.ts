// src/modules/cart/cart.routes.ts
import { Router } from 'express';
import { cartController } from './cart.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate, authorize('CUSTOMER'));

router.get('/', cartController.get.bind(cartController));
router.post('/items', cartController.addItem.bind(cartController));
router.put('/items/:itemId', cartController.updateItem.bind(cartController));
router.delete('/items/:itemId', cartController.removeItem.bind(cartController));
router.delete('/', cartController.clear.bind(cartController));

export default router;
