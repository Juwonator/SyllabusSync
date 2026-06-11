const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/achievements/my-achievements
router.get('/my-achievements', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT a.*, ua.earned_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
      ORDER BY a.id
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;