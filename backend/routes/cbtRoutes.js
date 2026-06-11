const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { checkAndAwardAchievements } = require('../services/achievementService');

// ─── START CBT SESSION ────────────────────────────────────
router.post('/start-session', async (req, res) => {
  try {
    const {
      user_id, exam_id, exam_year_id, mode,
      total_questions, duration_minutes, is_timed,
      shuffle_questions, shuffle_options, show_explanations,
      subject_ids,      // array of subject IDs
      topic_ids,        // array of topic IDs (optional)
      subtopic_ids,      // array of subtopic IDs (optional)
      selected_sections
    } = req.body;

    // Store all filters in a JSON column
    const filters = {
      subjects: subject_ids || [],
      topics: topic_ids || [],
      subtopics: subtopic_ids || [],
      sections: selected_sections || ['objective']
    };

    const session = await pool.query(
      `INSERT INTO practice_sessions (
        user_id, exam_id, exam_year_id, mode,
        total_questions, duration_minutes, is_timed,
        shuffle_questions, shuffle_options, show_explanations,
        filters
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *;`,
      [
        user_id, exam_id, exam_year_id, mode,
        total_questions, duration_minutes, is_timed,
        shuffle_questions, shuffle_options, show_explanations,
        JSON.stringify(filters)
      ]
    );

    res.status(201).json({
      success: true,
      session: session.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Failed to start CBT session'
    });
  }
});

// ─── FETCH QUESTIONS FOR SESSION ──────────────────────────
router.get('/questions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const sessionResult = await pool.query(
      `SELECT s.*, e.name as exam_name 
       FROM practice_sessions s
       JOIN exams e ON s.exam_id = e.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const session = sessionResult.rows[0];
    const filters = session.filters || { subjects: [], topics: [], subtopics: [] };
    const selectedSubjects = filters.subjects || [];
    const selectedTopics = filters.topics || [];
    const selectedSubtopics = filters.subtopics || [];

    const examBodyMap = {
      'WAEC/SSCE': 'WAEC',
      'JAMB/UTME': 'JAMB',
      'GCE':       'GCE',
      'NECO':      'NECO',
      'JUPEB':     'JUPEB'
    };
    const examBody = examBodyMap[session.exam_name] || session.exam_name;

    // Start building the query
    let queryText = `
      SELECT 
        q.id, 
        q.question_text, 
        q.option_a, 
        q.option_b, 
        q.option_c, 
        q.option_d, 
        q.correct_answer, 
        q.explanation
        t.name as topic   -- <-- add this line
      FROM questions q
      WHERE q.exam_body = $1
    `;
    let queryParams = [examBody];
    let paramIndex = 2;

    // Filter by sections
  if (selectedSections.includes('objective') && !selectedSections.includes('theory')) {
  queryText += ` AND (q.is_theory = false OR q.is_theory IS NULL)`;
  } else if (!selectedSections.includes('objective') && selectedSections.includes('theory')) {
  queryText += ` AND q.is_theory = true`;
  queryText += ` ORDER BY q.is_theory ASC, RANDOM()`;
  }

    // Filter by subjects (if any)
    if (selectedSubjects.length > 0) {
      queryText += ` AND q.subject_id = ANY($${paramIndex}::int[])`;
      queryParams.push(selectedSubjects);
      paramIndex++;
    }

    // Filter by topics (if any)
    if (selectedTopics.length > 0) {
      queryText += ` AND q.topic_id = ANY($${paramIndex}::int[])`;
      queryParams.push(selectedTopics);
      paramIndex++;
    }

    // Filter by subtopics (if any)
    if (selectedSubtopics.length > 0) {
      queryText += ` AND q.subtopic_id = ANY($${paramIndex}::int[])`;
      queryParams.push(selectedSubtopics);
      paramIndex++;
    }

    // Year filter (single value, from exam_year_id)
    if (session.exam_year_id) {
      const yearResult = await pool.query(
        'SELECT year FROM exam_years WHERE id = $1',
        [session.exam_year_id]
      );
      if (yearResult.rows.length > 0) {
        queryText += ` AND q.year = $${paramIndex}`;
        queryParams.push(yearResult.rows[0].year);
        paramIndex++;
      }
    }

    // Limit and random order
    queryText += ` ORDER BY RANDOM() LIMIT $${paramIndex}`;
    queryParams.push(session.total_questions);

    const questionsResult = await pool.query(queryText, queryParams);

    res.json({
      success: true,
      session,
      questions: questionsResult.rows
    });
  } catch (err) {
    console.error('Get questions error:', err.message);
    console.error('Full error:', err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── SUBMIT ANSWER (auto‑save during exam) ────────────────
router.post('/submit-answer', authenticateToken, async (req, res) => {
  try {
    const { session_id, question_id, selected_answer } = req.body;
    const userId = req.user.id;

    const qRes = await pool.query(
      'SELECT is_theory, correct_answer, max_score FROM questions WHERE id = $1',
      [question_id]
    );
    if (qRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    const question = qRes.rows[0];

    let is_correct = null;
    let theory_answer_text = null;

    if (question.is_theory) {
      theory_answer_text = selected_answer;
    } else {
      is_correct = (selected_answer === question.correct_answer);
    }

    await pool.query(
      `INSERT INTO answers (user_id, session_id, question_id, selected_answer, is_correct, theory_answer_text)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (session_id, question_id) DO UPDATE SET
         selected_answer = EXCLUDED.selected_answer,
         is_correct = EXCLUDED.is_correct,
         theory_answer_text = EXCLUDED.theory_answer_text`,
      [userId, session_id, question_id, selected_answer, is_correct, theory_answer_text]
    );

    res.json({
      success: true,
      is_correct: is_correct,
      correct_answer: question.correct_answer,
      is_theory: question.is_theory
    });
  } catch (err) {
    console.error('Submit answer error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit answer' });
  }
});

// ─── SUBMIT SESSION (FINISH CBT – instant marking) ────────
router.post('/submit-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const sessionResult = await pool.query(
      `SELECT s.*, e.name as exam_name 
       FROM practice_sessions s
       JOIN exams e ON s.exam_id = e.id
       WHERE s.id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    const answersResult = await pool.query(`
      SELECT a.*, q.is_theory, q.max_score, q.correct_answer, q.model_answer, q.keywords
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.session_id = $1
    `, [sessionId]);

    let objectiveCorrect = 0;
    let objectiveTotal = 0;
    let theoryTotalScore = 0;
    let theoryTotalMax = 0;
    let theoryFeedback = [];

    for (const ans of answersResult.rows) {
      if (ans.is_theory) {
        let score = 0;
        const studentAnswer = (ans.theory_answer_text || '').toLowerCase();
        const keywords = ans.keywords || [];
        if (keywords.length > 0) {
          const matches = keywords.filter(kw => studentAnswer.includes(kw.toLowerCase()));
          if (matches.length > 0) {
            score = ans.max_score;
          }
        }
        theoryTotalScore += score;
        theoryTotalMax += ans.max_score;
        theoryFeedback.push({
          question_id: ans.question_id,
          student_answer: ans.theory_answer_text,
          model_answer: ans.model_answer,
          awarded_score: score,
          max_score: ans.max_score
        });
      } else {
        objectiveTotal++;
        if (ans.is_correct) objectiveCorrect++;
      }
    }

    const scoringRuleRes = await pool.query(
      `SELECT correct_points, wrong_penalty, unattempted_points FROM scoring_rules 
       WHERE exam_body = (SELECT name FROM exams WHERE id = (SELECT exam_id FROM practice_sessions WHERE id = $1))`,
      [sessionId]
    );
    const rule = scoringRuleRes.rows[0] || { correct_points: 1, wrong_penalty: 0, unattempted_points: 0 };

    const objectiveScoreRaw = (objectiveCorrect * rule.correct_points) + ((objectiveTotal - objectiveCorrect) * rule.wrong_penalty);
    const maxObjectiveScore = objectiveTotal * rule.correct_points;
    const objectivePercent = (maxObjectiveScore > 0) ? (objectiveScoreRaw / maxObjectiveScore) * 100 : 0;
    const theoryPercent = (theoryTotalMax > 0) ? (theoryTotalScore / theoryTotalMax) * 100 : 0;
    const totalPercent = (objectivePercent * 0.5) + (theoryPercent * 0.5);

    const examName = session.exam_name;
    const gradeRes = await pool.query(
      `SELECT grade, remark FROM grading_rules 
       WHERE exam_body = $1 AND $2 BETWEEN min_score AND max_score`,
      [examName, totalPercent]
    );
    const grade = gradeRes.rows[0]?.grade || 'F9';
    const remark = gradeRes.rows[0]?.remark || 'Fail';

    await pool.query(
      `UPDATE practice_sessions 
       SET objective_score = $1, theory_score = $2, total_score = $3, grade = $4, remark = $5, completed_at = NOW()
       WHERE id = $6`,
      [objectivePercent, theoryPercent, totalPercent, grade, remark, sessionId]
    );
    await pool.query(
      `UPDATE practice_sessions SET theory_feedback = $1 WHERE id = $2`,
      [JSON.stringify(theoryFeedback), sessionId]
    );

    const xpEarned = objectiveCorrect * 10;
    await pool.query(
      `INSERT INTO xp_events (user_id, event_type, xp_amount)
       VALUES ($1, 'session_complete', $2)`,
      [session.user_id, xpEarned]
    );
    await checkAndAwardAchievements(session.user_id);

    res.json({
      success: true,
      results: {
        objective_score_percentage: Math.round(objectivePercent),
        theory_score_percentage: Math.round(theoryPercent),
        total_score_percentage: Math.round(totalPercent),
        grade: grade,
        remark: remark,
        theory_feedback: theoryFeedback
      }
    });
  } catch (error) {
    console.error('Submit session error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit session' });
  }
});

// ─── GET USER SESSIONS (RESULT HISTORY) ──────────────────
router.get('/user-sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT 
        s.id, s.mode, s.total_questions,
        s.objective_score, s.theory_score, s.total_score,
        s.grade, s.remark, s.completed_at,
        e.name as exam_name
      FROM practice_sessions s
      JOIN exams e ON s.exam_id = e.id
      WHERE s.user_id = $1 AND s.completed_at IS NOT NULL
      ORDER BY s.completed_at DESC`,
      [userId]
    );
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error('Error fetching user sessions:', err);
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
});

module.exports = router;