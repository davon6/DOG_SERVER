const { sql, poolPromise } = require('../config/db');
const { clients } = require('../wsServer');
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
  
  

/*

  // Method to add a message to a conversation
  static async addMessage(conversationId, userId, text) {
    try {
      await initPool();

        const result = await pool.request().query(`
        DECLARE @InsertedMessages TABLE (MessageID INT);

        INSERT INTO Messages (ConversationID, UserID, Text, Timestamp)
        OUTPUT INSERTED.MessageID INTO @InsertedMessages
        VALUES (${conversationId}, ${userId}, '${text}', GETDATE());
        
        SELECT MessageID FROM @InsertedMessages;`);
        
        const { MessageID, Timestamp } = result.recordset[0]; // Extracting MessageID from the result set
    return { MessageID, Timestamp };

    } catch (error) {
      console.error("Error in addMessage:", error);
      throw error;
    }
  }*/

  static async addMessage(conversationId, userId, text) {
    try {
        await initPool();

        // Insert the message into the Messages table and retrieve the MessageID
        const result = await pool.request().query(`
            DECLARE @InsertedMessages TABLE (MessageID INT, Timestamp DATETIME);

            INSERT INTO Messages (ConversationID, UserID, Text, Timestamp)
            OUTPUT INSERTED.MessageID, INSERTED.Timestamp INTO @InsertedMessages
            VALUES (${conversationId}, ${userId}, '${text}', GETDATE());
            
            SELECT MessageID, Timestamp FROM @InsertedMessages;
        `);

        const { MessageID, Timestamp } = result.recordset[0];// Extracting MessageID

console.log("lets move on ---------->>>>>>>"+JSON.stringify(result.recordset[0]));




/*FOR LATER MULTI PARTICIPANTS
        // Insert rows into the MessageStatus table for each recipient
        // For simplicity, we assume a 2-user conversation for now
        const participantInsertResult = await pool.request().query(`
            INSERT INTO MessageStatus (MessageID, UserID, IsRead, WSSent)
            SELECT ${messageId}, P.UserID, 0, 0
            FROM Participants P
            WHERE P.ConversationID = ${conversationId} AND P.UserID != ${userId};
        `);

        console.log(`Message ${messageId} added successfully with ${participantInsertResult.rowsAffected[0]} recipients.`);
*/

await pool.request().query(`
  INSERT INTO MessageStatus (MessageID, UserID, IsRead)
  VALUES (${MessageID}, (SELECT CASE 
                                  WHEN U1.id != ${userId} THEN U1.id 
                                  ELSE U2.id 
                              END
                         FROM Conversations C
                         JOIN Users U1 ON C.UserID1 = U1.id
                         JOIN Users U2 ON C.UserID2 = U2.id
                         WHERE C.ConversationID = ${conversationId}), 0);
`);


return { MessageID, Timestamp };

    } catch (error) {
        console.error("Error in addMessage:", error);
        throw error;
    }
}




static async notifyUsers(conversationId, messageId, senderUsername, text, Timestamp) {
console.log("notifyUsers(conversationId, messageId,--->> ",Timestamp);

  try {
      // Retrieve all participants for the conversation
      const participants = await pool.request().query(`
          SELECT U.username, U.id FROM Users U
          JOIN Conversations C ON (U.id = C.UserID1 OR U.id = C.UserID2)
          WHERE C.ConversationID = ${conversationId} AND U.username != '${senderUsername}'
      `);

      // For each participant, check if they are connected via WebSocket
      participants.recordset.forEach(participant => {


          //const client = clients[participant.username];  // Assuming `clients` maps usernames to WebSocket clients
          const client = clients.get(participant.username);
          
          console.log("---------------------------->participant.username"+ participant.username);
          
             console.log("---------------------------->clients ");
       clients.forEach((value, key) => {
            console.log(`Username: ${key}, Client: ${value}`);
        });

        console.log("---------------------------->clients ", client);

          if (client) {


            console.log("of course we detected the client --->", client);
              // Send the message to the WebSocket client
              client.send(JSON.stringify({
                notification : {
                  messageId,
                  conversationId,
                  senderUsername,
                  text,
                  timestamp: Timestamp,//new Date().toISOString(),
                  isRead: false,
                  type: "msg"
           } }));
          }
      });
  } catch (error) {
      console.error("Error notifying users:", error);
      throw error;
  }
};


static async getConversationsForUser(userId) {
  try {
    await initPool();

    const conversations = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT 
          c.ConversationID,
          c.UserID1,
          c.UserID2,
          u1.username AS username1,
          u2.username AS username2
        FROM Conversations c
        LEFT JOIN Users u1 ON c.UserID1 = u1.id
        LEFT JOIN Users u2 ON c.UserID2 = u2.id
        WHERE c.UserID1 = @UserID OR c.UserID2 = @UserID
        ORDER BY c.CreatedAt DESC
      `);

    // Transform conversations to include participants and initial state
    return conversations.recordset.map(conv => {
      // Determine the other user based on the logged-in user ID
      const otherUser = conv.UserID1 === userId ? conv.username2 : conv.username1;

      return {
        id: conv.ConversationID.toString(),
        participants: [conv.UserID1.toString(), conv.UserID2.toString()],
        messages: [],
        hasMore: true,
        otherUser: otherUser,  // Include the username of the other participant
      };
    });
  } catch (error) {
    console.error("Error in getConversationsForUser:", error);
    throw error;
  }
}
static async getMessages(conversationId, offset, limit, userId) {

console.log("in get Messages with unread this itme filter by user id --->>", userId);

  try {
    await initPool();

    const messages = await pool.request()
      .input('ConversationID', sql.Int, conversationId)
      .input('Offset', sql.Int, offset)
      .input('Limit', sql.Int, limit)
      .input('UserID', sql.Int, userId)
      .query(`
        WITH MessagesWithCount AS (
          SELECT 
            m.MessageID AS id, 
            m.ConversationID, 
            m.UserID, 
            m.Text, 
            m.Timestamp, 
            u.Username,
            COALESCE(ms.IsRead, 1) AS IsRead, -- Join with MessageStatus to include isRead status
            COUNT(*) OVER () AS totalMessages
          FROM Messages m
          JOIN Users u ON m.UserID = u.id
          LEFT JOIN MessageStatus ms 
            ON m.MessageID = ms.MessageID AND ms.UserID = @UserID -- Ensure correct isRead per user
          WHERE m.ConversationID = @ConversationID
          ORDER BY m.Timestamp DESC
          OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
        )
        SELECT * FROM MessagesWithCount;
      `);

    const totalMessages = messages.recordset[0]?.totalMessages || 0;
    const hasMore = offset + messages.recordset.length < totalMessages;

    const formattedMessages = messages.recordset.map(msg => ({
      
      id: msg.id.toString(),
      conversationId: msg.ConversationID.toString(),
      senderUsername: msg.Username,
      text: msg.Text,
      timestamp: msg.Timestamp.toISOString(),
      isRead: !!msg.IsRead, // Convert isRead to boolean
     }));

    // Log the formatted messages for debugging
    console.log("----------------------->>>> checking isRead", JSON.stringify(formattedMessages, null, 2));

    return {
      messages: formattedMessages,
      hasMore,
      totalMessages,
    };
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


        
}

module.exports = Conversation;
