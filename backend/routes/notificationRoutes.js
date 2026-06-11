const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const NotificationService = require('../services/notificationService');

// GET /api/notifications/unread-count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/notifications?limit=20&offset=0
router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const notifications = await NotificationService.getUserNotifications(req.user.id, limit, offset);
    res.json({ notifications, count: notifications.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id, req.user.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/notifications/mark-all-read
router.put('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/notifications/preferences
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const { browser, email, in_app } = req.body;
    await pool.query(
      `UPDATE users SET notification_preferences = $1 WHERE id = $2`,
      [JSON.stringify({ browser, email, in_app }), req.user.id]
    );
    res.json({ success: true, preferences: { browser, email, in_app } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/notifications/preferences
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT notification_preferences FROM users WHERE id = $1`,
      [req.user.id]
    );
    const prefs = result.rows[0]?.notification_preferences || { browser: true, email: false, in_app: true };
    res.json(prefs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;