import { Router } from 'express';
import * as configController from '../controllers/config.controller';

const router = Router();

// Public config routes (no authentication required)
router.get('/current', configController.getCurrentConfig);

export default router;
