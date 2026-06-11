const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// POST /api/topics/by-subjects
// Expects { subject_ids: [1,2,3] }
// Returns { topics: [{ id, name, subject_id }] }
router.post('/by-subjects', authenticateToken, async (req, res) => {
  try {
    const { subject_ids } = req.body;
    if (!subject_ids || subject_ids.length === 0) {
      return res.json({ topics: [] });
    }

    // Get all topics that belong to any of the given subject_ids
    const result = await pool.query(
      `SELECT id, name, subject_id 
       FROM topics 
       WHERE subject_id = ANY($1::int[])
       ORDER BY name`,
      [subject_ids]
    );
    res.json({ topics: result.rows });
  } catch (err) {
    console.error('Error fetching topics by subjects:', err);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// POST /api/subtopics/by-topics
// Expects { topic_ids: [1,2,3] }
// Returns { subtopics: [{ id, name, topic_id, topic_name }] }
router.post('/by-topics', authenticateToken, async (req, res) => {
  try {
    const { topic_ids } = req.body;
    if (!topic_ids || topic_ids.length === 0) {
      return res.json({ subtopics: [] });
    }

    // Get subtopics with topic name
    const result = await pool.query(
      `SELECT st.id, st.name, st.topic_id, t.name as topic_name
       FROM subtopics st
       JOIN topics t ON st.topic_id = t.id
       WHERE st.topic_id = ANY($1::int[])
       ORDER BY t.name, st.name`,
      [topic_ids]
    );
    res.json({ subtopics: result.rows });
  } catch (err) {
    console.error('Error fetching subtopics by topics:', err);
    res.status(500).json({ error: 'Failed to fetch subtopics' });
  }
});
router.post('/by-subjects', authenticateToken, async (req, res) => {
  console.log('Received subject_ids:', req.body.subject_ids);
  // ... rest of code
});

module.exports = router;