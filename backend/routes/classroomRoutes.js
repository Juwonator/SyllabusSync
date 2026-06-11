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

// GET /api/classroom/subjects?exam=WAEC
router.get('/subjects', authenticateToken, async (req, res) => {
  try {
    const { exam = 'WAEC' } = req.query; // or get from user profile
    // Get all subjects that have questions for this exam
    const subjects = await pool.query(`
      SELECT DISTINCT s.id, s.name, s.icon
      FROM subjects s
      JOIN topics t ON t.subject_id = s.id
      JOIN questions q ON q.topic_id = t.id
      WHERE q.exam_body = $1
      ORDER BY s.name
    `, [exam]);

    res.json({ subjects: subjects.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/classroom/topics/:subjectId?exam=WAEC
router.get('/topics/:subjectId', authenticateToken, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { exam = 'WAEC' } = req.query;

    const topics = await pool.query(`
      SELECT DISTINCT t.id, t.name, t.description,
        (SELECT COUNT(*) FROM questions q WHERE q.topic_id = t.id AND q.exam_body = $1) as question_count
      FROM topics t
      JOIN questions q ON q.topic_id = t.id
      WHERE t.subject_id = $2 AND q.exam_body = $1
      ORDER BY t.name
    `, [exam, subjectId]);

    res.json({ topics: topics.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;