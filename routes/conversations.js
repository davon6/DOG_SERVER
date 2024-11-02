// routes/conversations.js
const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const  ConversationController = require('../controllers/conversationsController');
const verifyToken = require('../middleware/verifyToken');

//router.post('/start-conversation', ConversationController.startConversation);

router.post('/start-conversation', verifyToken, (req, res, next) => {

    console.log("start-conversation: " + req.body.senderUsername, req.body.receiverUsername)

    ConversationController.startConversation(req, res, next);
});


router.post('/send-message', ConversationController.sendMessage);


router.get('/', ConversationController.getAllConversations); // New endpoint to fetch all conversations

// Message routes
router.get('/:conversationId/messages', MessageController.getMessages);
module.exports = router;
