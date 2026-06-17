const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get subject details + all topics with user progress
router.get('/:slug', auth, async (req, res) => {
  const { slug } = req.params;
  const userId = req.user.id;

  try {
    // 1. Get subject info
    const subjectRes = await db.query(
      `SELECT id, name, slug, description, icon_emoji 
       FROM subjects 
       WHERE slug = $1 AND is_active = true`,
      [slug]
    );
    if (subjectRes.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    const subject = subjectRes.rows[0];

    // 2. Get all topics for this subject, with user progress
    const topicsRes = await db.query(
      `SELECT 
         t.id, t.name, t.slug, t.description, t.display_order,
         COUNT(DISTINCT sub.id) AS total_subtopics,
         COALESCE(up.completed, false) AS completed,
         up.last_studied_at
       FROM topics t
       LEFT JOIN subtopics sub ON sub.topic_id = t.id
       LEFT JOIN user_progress up ON up.user_id = $1 AND up.topic_id = t.id
       WHERE t.subject_id = $2
       GROUP BY t.id, t.name, t.slug, t.description, t.display_order, up.completed, up.last_studied_at
       ORDER BY t.display_order NULLS LAST, t.name`,
      [userId, subject.id]
    );

    // 3. Calculate progress summary
    const topics = topicsRes.rows.map(t => ({
      ...t,
      total_subtopics: parseInt(t.total_subtopics),
      completed: t.completed || false,
      status: t.completed ? 'completed' : (t.last_studied_at ? 'in_progress' : 'not_started')
    }));

    const totalTopics = topics.length;
    const completedTopics = topics.filter(t => t.completed).length;
    const inProgressTopics = topics.filter(t => t.status === 'in_progress').length;
    const progressPercent = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);

    // 4. Optional: Get list of exam bodies that have questions for this subject
    const examsRes = await db.query(
      `SELECT DISTINCT e.id, e.name, e.code
       FROM exams e
       JOIN questions q ON q.exam_body = e.name
       WHERE q.subject_id = $1
       ORDER BY e.name`,
      [subject.id]
    );

    res.json({
      subject,
      topics,
      summary: {
        totalTopics,
        completedTopics,
        inProgressTopics,
        progressPercent
      },
      availableExams: examsRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch subject data' });
  }
});

// Update topic progress (mark as completed / update last studied)
router.post('/topic-progress', auth, async (req, res) => {
  const { topicId, completed } = req.body;
  const userId = req.user.id;

  if (!topicId) {
    return res.status(400).json({ error: 'topicId required' });
  }

  try {
    await db.query(
      `INSERT INTO user_progress (user_id, topic_id, completed, last_studied_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, topic_id, subtopic_id) 
       DO UPDATE SET 
         completed = EXCLUDED.completed,
         last_studied_at = NOW()
       WHERE user_progress.user_id = $1 AND user_progress.topic_id = $2`,
      [userId, topicId, completed]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

module.exports = router;