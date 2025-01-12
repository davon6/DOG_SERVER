const express = require('express');
const messageController = require('../controllers/messageController');

const router = express.Router();

// Route to mark messages as read
router.post('/markAsRead', messageController.markMessagesAsRead);

// Route to get messages for a specific conversation
//router.get('/:conversationId', messagesController.getMessages);

module.exports = router;
 