// src/modules/users/users.routes.ts
import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadSingle } from '../../middleware/upload.middleware';

const router = Router();
router.use(authenticate);

router.get('/me', usersController.getProfile.bind(usersController));
router.put('/me', usersController.updateProfile.bind(usersController));
router.post('/me/avatar', uploadSingle, usersController.updateAvatar.bind(usersController));
router.put('/me/password', usersController.changePassword.bind(usersController));

router.get('/me/addresses', usersController.getAddresses.bind(usersController));
router.post('/me/addresses', usersController.addAddress.bind(usersController));
router.put('/me/addresses/:id', usersController.updateAddress.bind(usersController));
router.delete('/me/addresses/:id', usersController.deleteAddress.bind(usersController));

router.get('/me/wishlist', usersController.getWishlist.bind(usersController));
router.post('/me/wishlist', usersController.toggleWishlist.bind(usersController));

router.get('/me/notifications', usersController.getNotifications.bind(usersController));
router.put('/me/notifications/read', usersController.markNotificationsRead.bind(usersController));

export default router;
