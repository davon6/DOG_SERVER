// controllers/MessageController.js
const Conversation = require('../models/Conversation');

class MessageController {
  static async getMessages(req, res) {
    const { conversationId } = req.params;
    const { offset = 0, limit = 20 } = req.query;

  //  console.log("soooo is offset functioning --> " + req.query.offset);

    try {
      const { messages, totalMessages } = await Conversation.getMessages(conversationId, parseInt(offset), parseInt(limit));
      
      const hasMore = parseInt(offset) + messages.length < totalMessages;

    //  console.log("messages.length " + messages.length + " in messageController: " + JSON.stringify(messages) + " hasMore: " + hasMore);

      res.json({ messages, hasMore });
    } catch (error) {
      console.error("Error in getMessages:", error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = MessageController;
