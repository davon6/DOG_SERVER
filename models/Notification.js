const  { pool }= require('../config/db'); // Ensure this connects to your PostgreSQL database

class Notification {
  // Method to create a new notification
  static async createNotification(userId, type, relatedUserId, extraData) {
    const query = `
      INSERT INTO notifications (user_id, type, related_user_id, extra_data, is_read, created_at)
      VALUES ($1, $2, $3, $4, false, NOW());
    `;

    try {
      await pool.query(query, [userId, type, relatedUserId, extraData]);
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

    console.log("-------------------->>>>>>>> getUserNotifications --> postgreSQL")

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
      UPDATE notifications
      SET is_read = true
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
        UPDATE notifications
        SET type = 'friend_accepted', is_read = false
        WHERE id = $1;
      `;
    } else if (response === 'decline') {
      query = `
        UPDATE notifications
        SET type = 'friend_declined', is_read = false
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
      DELETE FROM notifications
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
      SELECT id, user_id, type, extra_data, is_read, created_at
      FROM notifications
      WHERE user_id = $1 AND is_read = false;
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
