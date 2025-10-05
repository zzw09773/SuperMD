import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = 'uploads/images';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

// Image upload requires authentication
router.use(authMiddleware);

/**
 * POST /api/upload-image - Upload an image
 */
router.post('/upload-image', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image uploaded' });
      return;
    }

    // Return URL to access the image
    const url = `/uploads/images/${req.file.filename}`;

    res.json({
      message: 'Image uploaded successfully',
      url,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (error) {
    console.error('[Upload] Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

export default router;
