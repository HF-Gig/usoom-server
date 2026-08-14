import express from 'express';
import { createChat, getUserChats, getChatById, sendMessage, deleteChat } from '../controllers/chats.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAuth, createChat);
router.get('/', requireAuth, getUserChats);
router.get('/:chatId', requireAuth, getChatById);
router.post('/:chatId/messages', requireAuth, sendMessage);
router.delete('/:chatId', requireAuth, deleteChat);

export default router;

