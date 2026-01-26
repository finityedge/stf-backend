import { Router } from 'express';
import * as fileController from '../controllers/file.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All file routes require authentication
router.use(authenticate);

// Profile documents
router.get('/profile/:documentId', fileController.downloadProfileDocument);

// Application documents
router.get('/application/:documentId', fileController.downloadApplicationDocument);

export default router;
