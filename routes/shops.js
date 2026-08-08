import express from 'express';
import { getAllShops } from '../controllers/shops.js';

const router = express.Router();

router.get('/', getAllShops);

export default router;
