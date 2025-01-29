const  { pool }= require('../config/db'); // Ensure this connects to your PostgreSQL database
const { clients } = require('../wsServer');

class Notification {
  // Method to create a new notification
  static async createNotification(userId, type, relateduserId, username, friendUsername
  ) {
    const query = `
      INSERT INTO "public"."Notifications" ("userId", type, "relatedUserId",  "isRead", "createdAt")
      VALUES ($1, $2, $3, false, NOW())
       RETURNING id;
    `;

    console.log("creating notification", userId, type, relateduserId, username, friendUsername);

    try {
      const result = await pool.query(query, [userId, type, relateduserId]);
      const client = clients.get(friendUsername);
      if (client) {
        client.ws.send(JSON.stringify({ notification: { type: 'friend_request', username: friendUsername, createdAt: new Date().toISOString(),"isRead": false , id:result.rows[0].id, related_username:username} }));
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }


  }

  // Method to retrieve notifications for a specific user
  static async getUserNotifications(userId) {
    const query = `
      SELECT 
        n.id, 
        n.type, 
        u."USERNAME" AS related_username,
        n."extraData", 
        n."isRead", 
        n."createdAt"
      FROM  "public"."Notifications" n
      LEFT JOIN users u ON n."relatedUserId" = u.id
      WHERE n."userId" = $1
      ORDER BY n."createdAt" DESC;
    `;

    
    try {
      const { rows } = await pool.query(query, [userId]);
      return rows;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  // Method to mark a notification as read
  static async markAsRead(notificationId) {
    const query = `
      UPDATE  "public"."Notifications"
      SET "isRead" = true
      WHERE id = $1;
    `;

    try {
      await pool.query(query, [notificationId]);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Method to update the type of a notification based on response
  static async updateNotificationResponse(notificationId, response) {
    let query;

    if (response === 'accept') {
      query = `
        UPDATE  "public"."Notifications"
        SET type = 'friend_accepted', "isRead" = false
        WHERE id = $1;
      `;
    } else if (response === 'decline') {
      query = `
        UPDATE "public"."Notifications"
        SET type = 'friend_declined', "isRead" = false
        WHERE id = $1;
      `;
    } else {
      throw new Error('Invalid response type');
    }

    try {
      await pool.query(query, [notificationId]);
      return { message: 'Notification updated successfully' };
    } catch (error) {
      console.error('Error updating notification:', error);
      throw error;
    }
  }

  // Method to delete a notification
  static async deleteNotification(notificationId) {
    const query = `
      DELETE FROM "public"."Notifications"
      WHERE id = $1;
    `;

    try {
      await pool.query(query, [notificationId]);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Method to fetch unread notifications for a user
  static async getUnreadNotifications(userId) {
    const query = `
      SELECT id, userId, type, extraData, isRead, createdAt
      FROM "public"."Notifications"
      WHERE userId = $1 AND isRead = false;
    `;

    try {
      const { rows } = await pool.query(query, [userId]);
      return rows;
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }
  }
}

module.exports = Notification;
