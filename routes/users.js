import express from 'express';
import { loginUser, registerUser, getFavorites, addFavorite, removeFavorite, getUserProfile, updateUserProfile, createShop, deleteUserProfile } from '../controllers/users.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

router.get('/favorites', requireAuth, getFavorites);
router.post('/favorites/:adId', requireAuth, addFavorite);
router.delete('/favorites/:adId', requireAuth, removeFavorite);

router.get('/profile', requireAuth, getUserProfile);
router.put('/profile', requireAuth, updateUserProfile);
router.delete('/profile', requireAuth, deleteUserProfile);
router.post('/shop', requireAuth, createShop);

export default router;