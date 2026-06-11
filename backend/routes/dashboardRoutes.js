const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// GET /api/dashboard/stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // XP: sum of (correct answers * 10) from practice_sessions
    // But practice_sessions doesn't store correct count per session. We'll use a placeholder or 0.
    // For now, return 0 XP – you can enable later.
    const xp = 0;

    // Streak: count consecutive days with completed sessions
    const streakRes = await pool.query(`
      SELECT DISTINCT DATE(completed_at) as day
      FROM practice_sessions
      WHERE user_id = $1 AND completed_at IS NOT NULL
      ORDER BY day DESC
    `, [userId]);

    let streak = 0;
    if (streakRes.rows.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      for (let i = 0; i < streakRes.rows.length; i++) {
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - i);
        const expectedStr = expectedDate.toISOString().split('T')[0];
        if (streakRes.rows[i].day === expectedStr) streak++;
        else break;
      }
    }

    // Topics done: count distinct topics from questions in completed sessions
    const topicsRes = await pool.query(`
      SELECT COUNT(DISTINCT q.topic_id) as count
      FROM practice_sessions s
      JOIN LATERAL unnest(s.question_ids) qid ON TRUE
      JOIN questions q ON q.id = qid
      WHERE s.user_id = $1 AND s.completed_at IS NOT NULL
    `, [userId]);

    const topicsDone = topicsRes.rows[0]?.count || 0;

    res.json({ xp, streak, topicsDone });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/dashboard/weak-topics
router.get('/weak-topics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Since we don't have an answers table, we cannot compute weak topics.
    // Return empty array for now.
    res.json([]);
  } catch (err) {
    console.error('Weak topics error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/dashboard/leaderboard-rank
router.get('/leaderboard-rank', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Without XP table, return null (no rank)
    res.json({ rank: null });
  } catch (err) {
    console.error('Leaderboard rank error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 