const pool = require('../db');

class NotificationService {
  /**
   * Create a notification for a user
   */
  static async create(userId, type, title, message, data = null) {
    try {
      const result = await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, type, title, message, data ? JSON.stringify(data) : null]
      );
      
      // Also trigger browser push notification if user has it enabled
      await this.sendBrowserNotification(userId, title, message);
      
      return result.rows[0];
    } catch (err) {
      console.error('Failed to create notification:', err);
      return null;
    }
  }

  /**
   * Send browser push notification (if supported and enabled)
   */
  static async sendBrowserNotification(userId, title, message) {
    try {
      // Get user's notification preferences
      const prefsRes = await pool.query(
        `SELECT notification_preferences FROM users WHERE id = $1`,
        [userId]
      );
      const prefs = prefsRes.rows[0]?.notification_preferences || {};
      
      if (!prefs.browser) return;
      
      // Note: For real push notifications, you'd need:
      // 1. VAPID keys (web-push package)
      // 2. Service worker registration
      // 3. Push subscription storage
      
      // For now, we'll store that a browser notification should be shown
      // The frontend will poll for unread count and show browser notifications
      console.log(`📬 Browser notification queued for user ${userId}: ${title}`);
    } catch (err) {
      console.error('Browser notification error:', err);
    }
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get notifications for a user (paginated)
   */
  static async getUserNotifications(userId, limit = 20, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, userId) {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [notificationId, userId]
    );
    return result.rows[0];
  }

  /**
   * Mark all as read
   */
  static async markAllAsRead(userId) {
    await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
  }

  /**
   * Delete old notifications (older than 30 days)
   */
  static async cleanupOldNotifications() {
    const result = await pool.query(
      `DELETE FROM notifications 
       WHERE created_at < NOW() - INTERVAL '30 days' 
       RETURNING id`
    );
    return result.rowCount;
  }
}

module.exports = NotificationService;