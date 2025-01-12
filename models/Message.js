const { sql, poolPromise } = require('../config/db');

let pool;

// Initialize the pool
const initPool = async () => {
  try {
    if (!pool) {
      pool = await poolPromise;
      console.log("Database pool initialized");
    }
  } catch (error) {
    console.error("Error initializing database pool:", error);
    throw error;
  }
};

class Message {
  static async markMessagesAsRead(conversationId) {
    try {
      await initPool();

      await pool.request()
        .input('ConversationID', sql.Int, conversationId)
        .query(`
          UPDATE MessageStatus
          SET IsRead = 1
          WHERE MessageID IN (
            SELECT MessageID
            FROM Messages
            WHERE ConversationID = @ConversationID
          );
        `);

      return { success: true };
    } catch (error) {
      console.error('Error in Message.markMessagesAsRead:', error);
      throw error;
    }
  }

  static async getMessagesByConversationId(conversationId) {
    try {
      await initPool();

      const result = await pool.request()
        .input('ConversationID', sql.Int, conversationId)
        .query(`
          SELECT * 
          FROM Messages
          WHERE ConversationID = @ConversationID
          ORDER BY Timestamp DESC;
        `);

      return result.recordset;
    } catch (error) {
      console.error('Error in Message.getMessagesByConversationId:', error);
      throw error;
    }
  }
}

module.exports = Message;
