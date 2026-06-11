const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Overall stats from practice_sessions
    const statsRes = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(total_questions) as total_questions,
        AVG(score) as avg_score
      FROM practice_sessions
      WHERE user_id = $1 AND completed_at IS NOT NULL
    `, [userId]);

    const totalSessions = parseInt(statsRes.rows[0].total_sessions) || 0;
    const totalQuestions = parseInt(statsRes.rows[0].total_questions) || 0;
    const avgScore = Math.round(statsRes.rows[0].avg_score || 0);

    // 2. Subject breakdown – this still needs answers, so skip for now
    const subjects = [];

    // 3. Weak topics – skip
    const weakTopics = [];

    // 4. Trend (last 7 sessions)
    const trendRes = await pool.query(`
      SELECT 
        DATE(completed_at) as date,
        score
      FROM practice_sessions
      WHERE user_id = $1 AND completed_at IS NOT NULL
      ORDER BY completed_at DESC
      LIMIT 7
    `, [userId]);
    const trend = trendRes.rows.reverse();

    res.json({
      overall: {
        total_sessions: totalSessions,
        total_questions: totalQuestions,
        correct_answers: 0, // not available without answers
        accuracy: avgScore
      },
      subjects: subjects,
      weak_topics: weakTopics,
      trend: trend
    });
  } catch (err) {
    console.error('Performance overview error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

module.exports = router;