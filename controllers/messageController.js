// controllers/MessageController.js
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/userModel');

class MessageController {
  static async getMessages(req, res) {
    const { conversationId } = req.params;
    const { offset = 0, limit = 20, username } = req.query;

    console.log("soooo is offset functioning --> " + username);

    
    try {

      const {id}  = await User.findUserByUsername(username);

      console.log("soooo is offset functioning --> " + JSON.stringify(id));


      const { messages, totalMessages } = await Conversation.getMessages(conversationId, parseInt(offset), parseInt(limit), id);
      
      const hasMore = parseInt(offset) + messages.length < totalMessages;

      console.log("messages.length " + messages.length + " in messageController: " + JSON.stringify(messages) + " hasMore: " + hasMore);

      res.json({ messages, hasMore });
    } catch (error) {
      console.error("Error in getMessages:", error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }



  static async markMessagesAsRead(req, res) {
      const { conversationId } = req.body;
  
      if (!conversationId) {
        return res.status(400).send({ success: false, error: 'conversationId is required.' });
      }
  
      try {
        const result = await Message.markMessagesAsRead(conversationId);
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send({ success: false, error: 'Failed to update messages as read.' });
      }
    };
  
   
  
}

module.exports = MessageController;
