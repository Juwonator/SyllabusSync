const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/classroom/subjects
router.get('/subjects', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, slug 
       FROM subjects 
       WHERE is_active = true 
       ORDER BY name`
    );
    res.json({ subjects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/classroom/subjects/:slug/topics
router.get('/subjects/:slug/topics', authMiddleware, async (req, res) => {
  try {
    const { slug } = req.params;
    const subject = await db.query(
      'SELECT id, name FROM subjects WHERE slug = $1',
      [slug]
    );
    if (subject.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    const subjectId = subject.rows[0].id;

    // Get topics with subtopic counts and user progress (if any)
    const topics = await db.query(
      `SELECT 
         t.id, t.name, t.slug,
         COUNT(st.id) as subtopic_count,
         COALESCE(SUM(CASE WHEN up.is_completed THEN 1 ELSE 0 END), 0) as completed_subtopics
       FROM topics t
       LEFT JOIN subtopics st ON st.topic_id = t.id
       LEFT JOIN user_progress up ON up.subtopic_id = st.id AND up.user_id = $2
       WHERE t.subject_id = $1 AND t.is_active = true
       GROUP BY t.id
       ORDER BY t.order_index`,
      [subjectId, req.user.id]
    );

    res.json({
      subjectName: subject.rows[0].name,
      subjectId,
      topics: topics.rows.map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        subtopicCount: parseInt(t.subtopic_count),
        completedSubtopicCount: parseInt(t.completed_subtopics),
        progressPercent: t.subtopic_count > 0 ? Math.round((t.completed_subtopics / t.subtopic_count) * 100) : 0
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/classroom/topics/:slug/subtopics
router.get('/topics/:slug/subtopics', authMiddleware, async (req, res) => {
  try {
    const { slug } = req.params;
    const topic = await db.query(
      `SELECT t.id, t.name, s.name as subject_name
       FROM topics t
       JOIN subjects s ON t.subject_id = s.id
       WHERE t.slug = $1`,
      [slug]
    );
    if (topic.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    const topicId = topic.rows[0].id;

    const subtopics = await db.query(
      `SELECT st.id, st.name, st.slug, st.notes, st.video_urls,
         COALESCE(up.is_completed, false) as completed
       FROM subtopics st
       LEFT JOIN user_progress up ON up.subtopic_id = st.id AND up.user_id = $2
       WHERE st.topic_id = $1 AND st.is_active = true
       ORDER BY st.order_index`,
      [topicId, req.user.id]
    );

    res.json({
      topic: topic.rows[0],
      subtopics: subtopics.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/classroom/user/progress – mark subtopic as completed
router.post('/user/progress', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { subtopic_id } = req.body;
    if (!subtopic_id) return res.status(400).json({ error: 'subtopic_id required' });

    await db.query(
      `INSERT INTO user_progress (user_id, subtopic_id, is_completed, times_attempted, times_correct, mastery_score, last_attempted)
       VALUES ($1, $2, true, 1, 1, 100, NOW())
       ON CONFLICT (user_id, subtopic_id) DO UPDATE
       SET is_completed = true, times_attempted = user_progress.times_attempted + 1,
           times_correct = user_progress.times_correct + 1,
           mastery_score = (user_progress.times_correct + 1)::float / (user_progress.times_attempted + 1) * 100,
           last_attempted = NOW()`,
      [userId, subtopic_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/classroom/user/progress-summary – for "Continue Studying"
router.get('/user/progress-summary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const summary = await db.query(
      `SELECT 
         s.id as subject_id,
         COUNT(DISTINCT t.id) as total_topics,
         COUNT(DISTINCT CASE WHEN up.is_completed THEN up.subtopic_id END) as completed_subtopics,
         (SELECT t2.name FROM topics t2 
          JOIN subtopics st2 ON st2.topic_id = t2.id 
          JOIN user_progress up2 ON up2.subtopic_id = st2.id AND up2.user_id = $1
          WHERE t2.subject_id = s.id
          ORDER BY up2.last_attempted DESC LIMIT 1) as last_topic
       FROM subjects s
       JOIN topics t ON t.subject_id = s.id
       LEFT JOIN subtopics st ON st.topic_id = t.id
       LEFT JOIN user_progress up ON up.subtopic_id = st.id AND up.user_id = $1
       WHERE s.is_active = true
       GROUP BY s.id
       HAVING COUNT(DISTINCT CASE WHEN up.is_completed THEN up.subtopic_id END) > 0`,
      [userId]
    );
    const result = {};
    summary.rows.forEach(row => {
      result[row.subject_id] = {
        completedTopics: parseInt(row.completed_subtopics),
        totalTopics: parseInt(row.total_topics),
        lastTopic: row.last_topic || '—'
      };
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/classroom/bookmarks/topic – bookmark/unbookmark a topic
router.post('/bookmarks/topic', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { topic_id, bookmarked } = req.body;
    if (!topic_id) return res.status(400).json({ error: 'topic_id required' });
    if (bookmarked) {
      await db.query(
        'INSERT INTO user_bookmarks (user_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, topic_id]
      );
    } else {
      await db.query(
        'DELETE FROM user_bookmarks WHERE user_id = $1 AND topic_id = $2',
        [userId, topic_id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/classroom/bookmarks/topic/:topicId
router.get('/bookmarks/topic/:topicId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { topicId } = req.params;
    const result = await db.query(
      'SELECT 1 FROM user_bookmarks WHERE user_id = $1 AND topic_id = $2',
      [userId, topicId]
    );
    res.json({ bookmarked: result.rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;