import { Router } from 'express';
import multer from 'multer';
import { analyzePetImage } from '../controllers/iaController';

const router = Router();

// Usamos armazenamento em memória para a IA não lotar o Cloudinary com fotos temporárias
const uploadMemory = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB max
});

// Route: POST /api/ia/analyze-pet
// Description: Receives an image and returns JSON with suggested species, breed, size, description
router.post('/analyze-pet', uploadMemory.single('foto'), analyzePetImage);

export default router;