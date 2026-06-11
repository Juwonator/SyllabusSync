const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// GET /api/exams/years?exam_id=1
router.get('/years', authenticateToken, async (req, res) => {
  try {
    const { exam_id } = req.query;
    if (!exam_id) {
      return res.status(400).json({ error: 'exam_id required' });
    }
    const result = await db.query(
      'SELECT id, year FROM exam_years WHERE exam_id = $1 ORDER BY year DESC',
      [exam_id]
    );
    res.json({ years: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;