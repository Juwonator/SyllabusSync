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

// GET /api/leaderboard?filter=all|week|month&subject=optional
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { filter = 'all', subject } = req.query;
    let dateCondition = '';
    if (filter === 'week') dateCondition = "AND x.created_at > NOW() - INTERVAL '7 days'";
    if (filter === 'month') dateCondition = "AND x.created_at > NOW() - INTERVAL '30 days'";

    let subjectJoin = '';
    let subjectWhere = '';
    if (subject && subject !== 'all') {
      subjectJoin = `JOIN practice_sessions ps ON x.session_id = ps.id
                     JOIN questions q ON q.id = ANY(ps.question_ids)
                     JOIN topics t ON q.topic_id = t.id
                     JOIN subjects s ON t.subject_id = s.id`;
      subjectWhere = `AND s.name = $1`;
    }

    const query = `
      SELECT 
        u.id,
        u.full_name,
        COALESCE(SUM(x.xp_amount), 0) as total_xp,
        RANK() OVER (ORDER BY COALESCE(SUM(x.xp_amount), 0) DESC) as rank
      FROM users u
      LEFT JOIN xp_events x ON u.id = x.user_id ${dateCondition ? `AND ${dateCondition}` : ''}
      ${subjectJoin}
      WHERE 1=1 ${subjectWhere}
      GROUP BY u.id, u.full_name
      ORDER BY total_xp DESC
      LIMIT 50
    `;

    const params = subject && subject !== 'all' ? [subject] : [];
    const result = await pool.query(query, params);

    // Also get current user's rank separately (for "you" row)
    const userRankQuery = `
      SELECT RANK() OVER (ORDER BY COALESCE(SUM(x.xp_amount), 0) DESC) as rank
      FROM users u
      LEFT JOIN xp_events x ON u.id = x.user_id ${dateCondition ? `AND ${dateCondition}` : ''}
      WHERE u.id = $1
      GROUP BY u.id
    `;
    const userRankRes = await pool.query(userRankQuery, [req.user.id]);
    const currentUserRank = userRankRes.rows[0]?.rank || null;

    res.json({
      leaders: result.rows,
      currentUserRank
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;