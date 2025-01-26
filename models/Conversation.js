const { pool } = require('../config/db'); // Use your PostgreSQL db.js configuration
const { clients } = require('../wsServer');

class Conversation {
  static async findOrCreateConversation(senderId, receiverId) {
    try {
      const conversationHash = senderId < receiverId
        ? `${senderId}-${receiverId}`
        : `${receiverId}-${senderId}`;

      console.log("Attempting to find or create conversation:", senderId, receiverId);
      console.log("Computed conversation hash:", conversationHash);

      // Check if the conversation already exists
      const existingConversationQuery = `
        SELECT "ConversationID" FROM "Conversations"
        WHERE "ConversationHash" = $1
      `;
      const existingConversation = await pool.query(existingConversationQuery, [conversationHash]);

      if (existingConversation.rows.length > 0) {
        // Conversation exists, return it
        console.log("Conversation already exists.");
        return existingConversation.rows[0];
      } else {
        // Insert a new conversation
        console.log("Creating new conversation...");
        const newConversationQuery = `
          INSERT INTO "Conversations" ("UserID1", "UserID2", "ConversationHash", "CreatedAt")
          VALUES ($1, $2, $3, NOW())
          RETURNING "ConversationID";
        `;
        const newConversation = await pool.query(newConversationQuery, [senderId, receiverId, conversationHash]);
        console.log("New conversation created:", newConversation.rows[0]);
        return newConversation.rows[0];
      }
    } catch (error) {
      console.error("Error in findOrCreateConversation:", error);
      throw error;
    }
  }

  static async addMessage(conversationId, userId, text) {
    try {
      // Insert the message into the Messages table and retrieve the MessageID
      const insertMessageQuery = `
        INSERT INTO "Messages" ("ConversationID", "UserID", "Text", "Timestamp")
        VALUES ($1, $2, $3, NOW())
        RETURNING "MessageID", "Timestamp";
      `;
      const messageResult = await pool.query(insertMessageQuery, [conversationId, userId, text]);
      const { MessageID, Timestamp } = messageResult.rows[0];

      console.log("New message added:", messageResult.rows[0]);

      // Insert into MessageStatus
      const insertMessageStatusQuery = `
        INSERT INTO "MessageStatus" ("MessageID", "UserID", "IsRead")
        VALUES ($1, 
          (SELECT CASE
            WHEN "UserID1" != $2 THEN "UserID1"
            ELSE "UserID2"
          END
          FROM "Conversations"
          WHERE "ConversationID" = $3),
          false);
      `;
      await pool.query(insertMessageStatusQuery, [MessageID, userId, conversationId]);

      return { MessageID, Timestamp };
    } catch (error) {
      console.error("Error in addMessage:", error);
      throw error;
    }
  }

  static async notifyUsers(conversationId, messageId, senderUsername, text, Timestamp) {
    console.log("notifyUsers called with Timestamp:", Timestamp);

    try {
      const participantsQuery = `
        SELECT u."USERNAME", u.id
        FROM users u
        JOIN "Conversations" c
          ON (u.id = c."UserID1" OR u.id = c."UserID2")
        WHERE c."ConversationID" = $1 AND u."USERNAME" != $2;
      `;
      const participants = await pool.query(participantsQuery, [conversationId, senderUsername]);

      participants.rows.forEach(participant => {
        const client = clients.get(participant.username);

        if (client) {
          console.log("Sending notification to:", participant.username);
          client.ws.send(JSON.stringify({
            notification: {
              messageId,
              conversationId,
              senderUsername,
              text,
              timestamp: Timestamp,
              isRead: false,
              type: "msg",
            },
          }));
        }
      });
    } catch (error) {
      console.error("Error in notifyUsers:", error);
      throw error;
    }
  }

  static async getConversationsForUser(userId) {
    try {
      const query = `
        SELECT 
          c."ConversationID",
          c."UserID1",
          c."UserID2",
          u1."USERNAME" AS "username1",
          u2."USERNAME" AS "username2"
        FROM "Conversations" c
        LEFT JOIN users u1 ON c."UserID1" = u1.id
        LEFT JOIN users u2 ON c."UserID2" = u2.id
        WHERE c."UserID1" = $1 OR c."UserID2" = $1
        ORDER BY c."CreatedAt" DESC;
      `;
      const conversations = await pool.query(query, [userId]);

      return conversations.rows.map(conv => {
        const otherUser = conv.UserID1 === userId ? conv.username2 : conv.username1;
        return {
          id: conv.ConversationID.toString(),
          participants: [conv.UserID1.toString(), conv.UserID2.toString()],
          messages: [],
          hasMore: true,
          otherUser,
        };
      });
    } catch (error) {
      console.error("Error in getConversationsForUser:", error);
      throw error;
    }
  }

  static async getMessages(conversationId, offset, limit, userId) {
    try {
      const query = `
        SELECT 
          m."MessageID" AS id, 
          m."ConversationID", 
          m."UserID", 
          m."Text", 
          m."Timestamp", 
          u."USERNAME" AS "senderUsername",
          COALESCE(ms."IsRead", true) AS "isRead"
        FROM "Messages" m
        JOIN users u ON m."UserID" = u.id
        LEFT JOIN "MessageStatus" ms 
          ON m."MessageID" = ms."MessageID" AND ms."UserID" = $3
        WHERE m."ConversationID" = $1
        ORDER BY m."Timestamp" DESC
        OFFSET $2 LIMIT $4;
      `;
      const messages = await pool.query(query, [conversationId, offset, userId, limit]);

      return {
        messages: messages.rows.map(msg => ({
          id: msg.id.toString(),
          conversationId: msg.ConversationID.toString(),
          senderUsername: msg.senderUsername,
          text: msg.Text,
          timestamp: msg.Timestamp.toISOString(),
          isRead: !!msg.isRead,
        })),
        hasMore: messages.rows.length === limit,
      };
    } catch (error) {
      console.error("Error in getMessages:", error);
      throw error;
    }
  }


}

module.exports = Conversation;
