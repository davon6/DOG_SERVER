// controllers/ConversationController.js
const sql = require('mssql');
const Conversation = require('../models/Conversation');
const User = require('../models/userModel'); // Assume you have a User model to fetch user IDs

class ConversationController {
    static async startConversation(req, res) {

        const { senderUsername, receiverUsername } = req.body;

        try {
            // Fetch User IDs for sender and receiver
            const users = await User.findUsersForConversation( senderUsername, receiverUsername);

            const [sender, receiver] = users[0].Username === senderUsername ? [users[0], users[1]] : [users[1], users[0]];


console.log("hereeee"+ JSON.stringify(sender), JSON.stringify(receiver));

            // Get or create the conversation
            const conversation = await Conversation.findOrCreateConversation(sender.id, receiver.id);

            res.json({ conversationId: conversation.ConversationID });
        } catch (error) {
            console.error("Error in startConversation:", error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async sendMessage(req, res) {
        const { conversationId, senderUsername, text } = req.body;

        try {
            // Retrieve sender's UserID
  /*          const userResult = await sql.query`
                SELECT id FROM Users WHERE Username = ${senderUsername}`;
*/


            const user  = await User.findUserByUsername(senderUsername);


            console.log("moving forward "+JSON.stringify(user));

          //  const user = userResult.recordset[0];
            if (!user) return res.status(400).json({ error: 'Sender not found' });

            // Add the message to the conversation
            await Conversation.addMessage(conversationId, user.id, text);

            res.json({ success: true });
        } catch (error) {
            console.error("Error in sendMessage:", error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
/*

    const getUsers = async (req, res) => {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query('SELECT * FROM USER_DOG');
            res.json(result.recordset);
        } catch (err) {
            res.status(500).send({ message: err.message });
        }
    };

    */


    static async getAllConversations(req, res) {
console.log("oh yeaah");
     console.log("in controller getAllConversations"+ JSON.stringify(req.query));

     const user  = await User.findUserByUsername(req.query.username);

      //  const { userId } = req.query; // Assuming userId is passed as a query parameter
    
      //const { userId } = user;

        try {
          //await Conversation.initPool();
    
         // const conversations = await Conversation.getConversationsForUser(userId);
    //hard coded for testing

    //const conversations = await Conversation.getConversationsForUser(32);
    const conversations = await Conversation.getConversationsForUser(user.id);
          res.json(conversations);
        } catch (error) {
          console.error("Error in getAllConversations:", error);
          res.status(500).json({ error: 'Internal server error' });
        }



      }
}

module.exports = ConversationController;
