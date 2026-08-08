import express from 'express';
import { createChat, getUserChats, getChatById, sendMessage } from '../controllers/chats.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAuth, createChat);
router.get('/', requireAuth, getUserChats);
router.get('/:chatId', requireAuth, getChatById);
router.post('/:chatId/messages', requireAuth, sendMessage);

export default router;
