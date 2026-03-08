// src/modules/admin/admin.routes.ts
import { Router } from 'express';
import { adminController } from './admin.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard/stats', adminController.dashboardStats.bind(adminController));
router.get('/users', adminController.getUsers.bind(adminController));
router.put('/users/:id/status', adminController.updateUserStatus.bind(adminController));
router.get('/categories', adminController.getCategories.bind(adminController));
router.post('/categories', adminController.createCategory.bind(adminController));
router.put('/categories/:id', adminController.updateCategory.bind(adminController));
router.delete('/categories/:id', adminController.deleteCategory.bind(adminController));
router.get('/disputes', adminController.getDisputes.bind(adminController));
router.put('/disputes/:id', adminController.resolveDispute.bind(adminController));
router.get('/reports/revenue', adminController.revenueReport.bind(adminController));

export default router;
