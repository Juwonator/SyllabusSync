const express = require('express');
const router = express.Router();
const db = require('../db'); // change to 'pool' if your connection is named pool

// ─────────────────────────────────────────────────────────────
//  Helper: check if a column exists in a given table
// ─────────────────────────────────────────────────────────────
async function columnExists(table, column) {
  const res = await db.query(
    `SELECT column_name 
     FROM information_schema.columns 
     WHERE table_schema = current_schema()
       AND table_name = $1
       AND column_name = $2`,
    [table, column]
  );
  return res.rows.length > 0;
}

// Cache for the questions.subject_id check (avoids repeated metadata queries)
let cachedHasSubjectId = null;

async function hasQuestionsSubjectId() {
  if (cachedHasSubjectId !== null) return cachedHasSubjectId;
  try {
    const exists = await columnExists('questions', 'subject_id');
    cachedHasSubjectId = exists;
    return exists;
  } catch (e) {
    // if metadata check fails, default to false (fallback path)
    cachedHasSubjectId = false;
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
//  GET all subjects (optionally filtered by exam)
//  Usage: GET /api/subjects?exam=WAEC/SSCE
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { exam } = req.query;
    let result;

    if (exam) {
      // Map frontend exam strings to database exam_body values (case-insensitive)
      const examBodyMap = {
        'waec/ssce': 'WAEC',
        'waec': 'WAEC',
        'neco': 'NECO',
        'jamb/utme': 'JAMB',
        'jamb': 'JAMB',
        'gce': 'GCE',
        'jupeb': 'JUPEB'
      };
      const examKey = String(exam).toLowerCase();
      const examBody = examBodyMap[examKey];
      if (!examBody) {
        return res.status(400).json({ error: 'Invalid exam type' });
      }

      // Check if questions table has a subject_id column (cached)
      const hasSubjectId = await hasQuestionsSubjectId();

      let query;
      let params = [examBody];

      if (hasSubjectId) {
        // Fast path: direct subject_id join
        query = `
          SELECT DISTINCT s.id, s.name, s.slug, s.is_active
          FROM subjects s
          JOIN questions q ON q.subject_id = s.id
          WHERE q.exam_body = $1 AND s.is_active = true
          ORDER BY s.name
        `;
      } else {
        // Fallback: join via topics → subtopics → questions
        query = `
          SELECT DISTINCT s.id, s.name, s.slug, s.is_active
          FROM subjects s
          JOIN topics t ON t.subject_id = s.id
          JOIN subtopics st ON st.topic_id = t.id
          JOIN questions q ON q.subtopic_id = st.id
          WHERE q.exam_body = $1 AND s.is_active = true
          ORDER BY s.name
        `;
      }

      result = await db.query(query, params);
    } else {
      // No exam filter – return all active subjects
      result = await db.query(
        'SELECT * FROM subjects WHERE is_active = true ORDER BY name'
      );
    }

    res.json({ subjects: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET topics for a specific subject by slug
//  GET /api/subjects/:slug/topics
// ─────────────────────────────────────────────────────────────
router.get('/:slug/topics', async (req, res) => {
  try {
    const { slug } = req.params;

    const subject = await db.query(
      'SELECT * FROM subjects WHERE slug = $1',
      [slug]
    );

    if (subject.rows.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const topics = await db.query(
      `SELECT * FROM topics 
       WHERE subject_id = $1 AND is_active = true 
       ORDER BY order_index`,
      [subject.rows[0].id]
    );

    res.json({
      subject: subject.rows[0],
      topics: topics.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET subtopics for a specific topic by slug
//  GET /api/subjects/:subjectSlug/topics/:topicSlug/subtopics
// ─────────────────────────────────────────────────────────────
router.get('/:subjectSlug/topics/:topicSlug/subtopics', async (req, res) => {
  try {
    const { subjectSlug, topicSlug } = req.params;

    const topic = await db.query(
      `SELECT t.*, s.name as subject_name, s.slug as subject_slug 
       FROM topics t
       JOIN subjects s ON t.subject_id = s.id
       WHERE t.slug = $1 AND s.slug = $2`,
      [topicSlug, subjectSlug]
    );

    if (topic.rows.length === 0) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const subtopics = await db.query(
      `SELECT st.*, 
        ei.frequency_percentage,
        ei.priority_rank,
        ei.insight_text
       FROM subtopics st
       LEFT JOIN exam_intelligence ei ON ei.subtopic_id = st.id
       WHERE st.topic_id = $1 AND st.is_active = true
       ORDER BY st.order_index`,
      [topic.rows[0].id]
    );

    res.json({
      topic: topic.rows[0],
      subtopics: subtopics.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET full topic detail — subtopics, videos, exam intelligence
//  GET /api/subjects/:subjectSlug/topics/:topicSlug
// ─────────────────────────────────────────────────────────────
router.get('/:subjectSlug/topics/:topicSlug', async (req, res) => {
  try {
    const { subjectSlug, topicSlug } = req.params;

    const topic = await db.query(
      `SELECT t.*, s.name as subject_name, s.slug as subject_slug 
       FROM topics t
       JOIN subjects s ON t.subject_id = s.id
       WHERE t.slug = $1 AND s.slug = $2`,
      [topicSlug, subjectSlug]
    );

    if (topic.rows.length === 0) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    const topicId = topic.rows[0].id;

    const subtopics = await db.query(
      `SELECT st.*, 
        ei.frequency_percentage,
        ei.priority_rank,
        ei.insight_text,
        ei.times_repeated,
        ei.last_appeared_year
       FROM subtopics st
       LEFT JOIN exam_intelligence ei ON ei.subtopic_id = st.id
       WHERE st.topic_id = $1 AND st.is_active = true
       ORDER BY st.order_index`,
      [topicId]
    );

    const videos = await db.query(
      `SELECT * FROM video_recommendations 
       WHERE topic_id = $1
       ORDER BY created_at`,
      [topicId]
    );

    res.json({
      topic: topic.rows[0],
      subtopics: subtopics.rows,
      videos: videos.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;