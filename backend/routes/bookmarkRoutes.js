const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/bookmarks – get all bookmarks for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT b.id, b.question_id, b.notes, b.created_at,
        q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
        q.correct_answer, q.exam_body, q.year,
        s.name as subject_name
       FROM bookmarks b
       JOIN questions q ON b.question_id = q.id
       LEFT JOIN subjects s ON q.subject_id = s.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );
    res.json({ bookmarks: result.rows });
  } catch (err) {
    console.error('Get bookmarks error:', err);
    res.status(500).json({ message: 'Failed to fetch bookmarks' });
  }
});

// POST /api/bookmarks – add a bookmark
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { question_id, session_id, notes } = req.body;

    if (!question_id) {
      return res.status(400).json({ message: 'question_id is required' });
    }

    const result = await pool.query(
      `INSERT INTO bookmarks (user_id, question_id, session_id, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, question_id) 
       DO UPDATE SET notes = EXCLUDED.notes, created_at = NOW()
       RETURNING *`,
      [userId, question_id, session_id || null, notes || null]
    );

    res.json({ success: true, bookmark: result.rows[0] });
  } catch (err) {
    console.error('Create bookmark error:', err);
    res.status(500).json({ message: 'Failed to add bookmark' });
  }
});

// DELETE /api/bookmarks/:id – remove a bookmark
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM bookmarks WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bookmark not found' });
    }

    res.json({ success: true, message: 'Bookmark removed' });
  } catch (err) {
    console.error('Delete bookmark error:', err);
    res.status(500).json({ message: 'Failed to remove bookmark' });
  }
});

// POST /api/bookmarks/check – check if a question is bookmarked
router.post('/check', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { question_id } = req.body;

    const result = await pool.query(
      `SELECT id FROM bookmarks WHERE user_id = $1 AND question_id = $2`,
      [userId, question_id]
    );

    res.json({ isBookmarked: result.rows.length > 0, bookmarkId: result.rows[0]?.id });
  } catch (err) {
    console.error('Check bookmark error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;