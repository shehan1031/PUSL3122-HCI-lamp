import { Router } from 'express';
import { login, register, logout, me } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login',    login);
router.post('/register', register);
router.post('/logout',   logout);
router.get('/me',        requireAuth, me);

export default router;
