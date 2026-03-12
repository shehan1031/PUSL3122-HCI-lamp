import { Router } from 'express';
import { listDesigns, createDesign, getDesign, updateDesign, deleteDesign } from '../controllers/designController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth); // All design routes require authentication

router.get('/',      listDesigns);
router.post('/',     createDesign);
router.get('/:id',   getDesign);
router.patch('/:id', updateDesign);
router.delete('/:id',deleteDesign);

export default router;
