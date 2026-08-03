import express from 'express';
import { getSellerOverview } from '../controllers/seller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/overview', requireAuth, getSellerOverview);

export default router;
