const { sql, poolPromise } = require('../config/db');

let pool;

// Initialize the pool once, with retries if necessary
const initPool = async () => {
  try {
    if (!pool) {
      pool = await poolPromise;
      console.log("Database pool initialized");
    }
  } catch (error) {
    console.error("Error initializing database pool:", error);
    throw error; // Throw error to ensure we don’t proceed without a connection
  }
};

class Conversation {
  /*
  // Method to find an existing conversation or create a new one
  static async findOrCreateConversation(senderId, receiverId) {
    try {



      await initPool();

      const conversationHash = senderId < receiverId
        ? `${senderId}-${receiverId}`
        : `${receiverId}-${senderId}`;

        console.log("so we get here or no , no break?",senderId, receiverId);
        console.log("so we get here or no , no break?", conversationHash);

      // Check if the conversation already exists
      const existingConversation = await pool.request().query(`
        SELECT ConversationID FROM Conversations
        WHERE ConversationHash = '${conversationHash}'`);


        console.log("trying to understand "+JSON.stringify(existingConversation));

      if (existingConversation.recordset.length > 0) {
        return existingConversation.recordset[0];
      } else {
        // Create a new conversation and insert into the database
        const newConversation = await pool.request().query(`
          INSERT INTO Conversations (UserID1, UserID2, ConversationHash)
          VALUES (${senderId}, ${receiverId}, '${conversationHash}');
          SELECT SCOPE_IDENTITY() AS ConversationID;`);

        return { ConversationID: newConversation.recordset[0].ConversationID };
      }
    } catch (error) {
      console.error("Error in findOrCreateConversation:", error);
      throw error;
    }
  }
*/

static async findOrCreateConversation(senderId, receiverId) {
    try {
      await initPool();

      const conversationHash = senderId < receiverId
        ? `${senderId}-${receiverId}`
        : `${receiverId}-${senderId}`;

      console.log("Attempting to find or create conversation:", senderId, receiverId);
      console.log("Computed conversation hash:", conversationHash);

      // Check if the conversation already exists
      const existingConversation = await pool.request().query(`
        SELECT ConversationID FROM Conversations
        WHERE ConversationHash = '${conversationHash}'`);

      if (existingConversation.recordset.length > 0) {
        // Conversation exists, return it
        console.log("Conversation already exists.");
        return existingConversation.recordset[0];
      } else {
        // Insert a new conversation
        console.log("Creating new conversation...");


        const newConversation = await pool.request().query(`
          INSERT INTO Conversations (UserID1, UserID2)
          VALUES (${senderId}, ${receiverId});
          SELECT SCOPE_IDENTITY() AS ConversationID;`);

        console.log("New conversation created:", newConversation.recordset[0]);
        return { ConversationID: newConversation.recordset[0].ConversationID };
      }
    } catch (error) {
      console.error("Error in findOrCreateConversation:", error);
      throw error;
    }
  }
  
  



  // Method to add a message to a conversation
  static async addMessage(conversationId, userId, text) {
    try {
      await initPool();
      
      await pool.request().query(`
        INSERT INTO Messages (ConversationID, UserID, Text, Timestamp)
        VALUES (${conversationId}, ${userId}, '${text}', GETDATE())`);
    } catch (error) {
      console.error("Error in addMessage:", error);
      throw error;
    }
  }
/*}*/


static async getConversationsForUser(userId) {
    try {
      await initPool();

      const conversations = await pool.request()
        .input('UserID', sql.Int, userId)
        .query(`
          SELECT ConversationID, UserID1, UserID2, CreatedAt
          FROM Conversations
          WHERE UserID1 = @UserID OR UserID2 = @UserID
          ORDER BY CreatedAt DESC
        `);

      // Transform conversations to include participants and initial state
      return conversations.recordset.map(conv => ({
        id: conv.ConversationID.toString(),
        participants: [conv.UserID1.toString(), conv.UserID2.toString()],
        messages: [],
        hasMore: true,
      }));
    } catch (error) {
      console.error("Error in getConversationsForUser:", error);
      throw error;
    }
  }

  static async getMessages(conversationId, offset, limit) {
    try {
      await initPool();

      const messages = await pool.request()
        .input('ConversationID', sql.Int, conversationId)
        .input('Offset', sql.Int, offset)
        .input('Limit', sql.Int, limit)
        .query(`
          SELECT MessageID AS id, ConversationID, UserID, Text, Timestamp
          FROM Messages
          WHERE ConversationID = @ConversationID
          ORDER BY Timestamp DESC
          OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
        `);

      // Transform messages if needed, e.g., mapping UserID to username
      return messages.recordset.map(msg => ({
        id: msg.id.toString(),
        conversationId: msg.ConversationID.toString(),
        senderUsername: '', // Fetch username based on UserID if necessary
        text: msg.Text,
        timestamp: msg.Timestamp.toISOString(),
      }));
    } catch (error) {
      console.error("Error in getMessages:", error);
      throw error;
    }
  }

  static async findUserByUsername(username) {
    try {
      await initPool();

      const result = await pool.request()
        .input('Username', sql.NVarChar, username)
        .query(`
          SELECT id, Username FROM Users
          WHERE Username = @Username
        `);

      return result.recordset[0];
    } catch (error) {
      console.error("Error in findUserByUsername:", error);
      throw error;
    }
  }


  // models/Conversation.js

/*
static async getMessages(conversationId, offset, limit) {
    try {
      await initPool();
  
      const messages = await pool.request()
        .input('ConversationID', sql.Int, conversationId)
        .input('Offset', sql.Int, offset)
        .input('Limit', sql.Int, limit)
        .query(`
          SELECT m.MessageID AS id, m.ConversationID, m.UserID, m.Text, m.Timestamp, u.Username
          FROM Messages m
          JOIN Users u ON m.UserID = u.id
          WHERE m.ConversationID = @ConversationID
          ORDER BY m.Timestamp DESC
          OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
        `);
  
      return messages.recordset.map(msg => ({
        id: msg.id.toString(),
        conversationId: msg.ConversationID.toString(),
        senderUsername: msg.Username,
        text: msg.Text,
        timestamp: msg.Timestamp.toISOString(),
      }));
    } catch (error) {
      console.error("Error in getMessages:", error);
      throw error;
    }
  }*/

    static async getMessages(conversationId, offset, limit) {
        try {
          await initPool();
      
          const messages = await pool.request()
            .input('ConversationID', sql.Int, conversationId)
            .input('Offset', sql.Int, offset)
            .input('Limit', sql.Int, limit)
            .query(`
              SELECT m.MessageID AS id, m.ConversationID, m.UserID, m.Text, m.Timestamp, u.Username
              FROM Messages m
              JOIN Users u ON m.UserID = u.id
              WHERE m.ConversationID = @ConversationID
              ORDER BY m.Timestamp DESC
              OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
            `);
      
          return messages.recordset.map(msg => ({
            id: msg.id.toString(),
            conversationId: msg.ConversationID.toString(),
            senderUsername: msg.Username,
            text: msg.Text,
            timestamp: msg.Timestamp.toISOString(),
          }));
        } catch (error) {
          console.error("Error in getMessages:", error);
          throw error;
        }
      }
  
}

module.exports = Conversation;
