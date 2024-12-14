const { sql, poolPromise } = require('../config/db');

let pool;

// Initialize the pool once, with retries if necessary
const initPool = async () => {
  try {
    if (!pool) {
      pool = await poolPromise;  // poolPromise is your SQL pool initialization from the db config
      console.log("Database pool initialized");
    }
    return pool;
  } catch (error) {
    console.error("Error initializing database pool:", error);
    throw error; // Throw error to ensure we don’t proceed without a connection
  }
};

class Notification {
  // This method creates a notification in the database
  static async createNotification(userId, type, relatedUserId, extraData) {
    const pool = await initPool(); // Ensure the pool is initialized
    const query = `
      INSERT INTO Notifications (userId, type, relatedUserId, extraData, isRead, createdAt)
      VALUES (@userId, @type, @relatedUserId, @extraData, 0, GETDATE());
    `;

    const request = pool.request();
    request.input('userId', sql.Int, userId);
    request.input('type', sql.VarChar, type);
    request.input('relatedUserId', sql.Int, relatedUserId);
    request.input('extraData', sql.NVarChar, extraData);

    try {
      await request.query(query);
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  // This method retrieves notifications for a specific user
  static async getUserNotifications(userId) {
    const pool = await initPool(); // Ensure the pool is initialized
    const query = `
      SELECT 
        n.id, 
        n.type, 
        u.username AS relatedUsername,  -- Fetch username from the Users table
        n.extraData, 
        n.isRead, 
        n.createdAt
      FROM Notifications n
      LEFT JOIN Users u ON n.relatedUserId = u.id -- Join Notifications with Users
      WHERE n.userId = @userId
      ORDER BY n.createdAt DESC;
    `;

    console.log("Chatting the DB for notifications...");

    const request = pool.request();
    request.input('userId', sql.Int, userId);

    try {
      const result = await request.query(query);
      return result.recordset; // Return the notifications
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      throw error;
    }
}


  // This method marks a notification as read
  static async markAsRead(notificationId) {
    const pool = await initPool(); // Ensure the pool is initialized
    const query = `
      UPDATE Notifications
      SET isRead = 1
      WHERE id = @notificationId;
    `;

    const request = pool.request();
    request.input('notificationId', sql.Int, notificationId);

    try {
      await request.query(query);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

    static  async updateNotificationResponse (notificationId, response)  {
    try {
      const pool = await initPool();
      let query;
  
      // Depending on the response, update the notification type and text
      if (response === 'accept') {
        query = `
          UPDATE Notifications
          SET type = 'friend_accepted', isRead = 1
          WHERE id = @notificationId;
        `;
      } else if (response === 'decline') {
        query = `
          UPDATE Notifications
          SET type = 'friend_declined',  isRead = 1
          WHERE id = @notificationId;
        `;
      }
  
      // Execute the query
      await pool.request()
        .input('notificationId', sql.Int, notificationId)
        .query(query);
  
      return { message: 'Notification updated successfully' };
    } catch (error) {
      console.error("Error updating notification:", error);
      throw error;
    }
  };
  

  // This method deletes a specific notification
  static async deleteNotification(notificationId) {
    const pool = await initPool(); // Ensure the pool is initialized
    const query = `
      DELETE FROM Notifications
      WHERE id = @notificationId;
    `;

    const request = pool.request();
    request.input('notificationId', sql.Int, notificationId);

    try {
      await request.query(query);
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }
}

module.exports = Notification;
