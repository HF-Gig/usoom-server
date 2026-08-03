import express from 'express';
import { getLatestAds, createAd, getAdById, getMyAds } from '../controllers/ads.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images/ads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.get('/', getLatestAds);
router.get('/my', requireAuth, getMyAds);
router.get('/:id', getAdById);
router.post('/', requireAuth, upload.array('photos', 5), createAd);

export default router;
