const { pool } = require('../config/db'); 
// Ensure this connects to your PostgreSQL database // Use the PostgreSQL pool for connections

class Message {
  /**
   * Mark all messages in a conversation as read.
   * @param {number} conversationId - The ID of the conversation.
   * @returns {Object} - Success message.
   */
  static async markMessagesAsRead(conversationId) {
    try {
      const query = `
        UPDATE message_status
        SET is_read = true
        WHERE message_id IN (
          SELECT id
          FROM messages
          WHERE conversation_id = $1
        );
      `;
      await pool.query(query, [conversationId]);
      return { success: true };
    } catch (error) {
      console.error('Error in Message.markMessagesAsRead:', error);
      throw error;
    }
  }

  /**
   * Get all messages for a specific conversation, ordered by timestamp.
   * @param {number} conversationId - The ID of the conversation.
   * @returns {Array} - List of messages.
   */
  static async getMessagesByConversationId(conversationId) {
    try {
      const query = `
        SELECT * 
        FROM messages
        WHERE conversation_id = $1
        ORDER BY timestamp DESC;
      `;
      const { rows } = await pool.query(query, [conversationId]);
      return rows;
    } catch (error) {
      console.error('Error in Message.getMessagesByConversationId:', error);
      throw error;
    }
  }
}

module.exports = Message;
