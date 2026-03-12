import { Router } from 'express';
import { getStats, getUsers, updateUser, deleteUser, getAllDesigns } from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAdmin); // All admin routes require admin role

router.get('/stats',        getStats);
router.get('/users',        getUsers);
router.patch('/users/:id',  updateUser);
router.delete('/users/:id', deleteUser);
router.get('/designs',      getAllDesigns);

export default router;
