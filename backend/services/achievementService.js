const pool = require('../db');
const NotificationService = require('./notificationService');

async function checkAndAwardAchievements(userId) {
  try {
    // 1. Get user stats: total XP, current streak, total sessions, highest session score, rank, topics mastered
    // XP total
    const xpRes = await pool.query('SELECT COALESCE(SUM(xp_amount),0) as total_xp FROM xp_events WHERE user_id = $1', [userId]);
    const totalXP = xpRes.rows[0].total_xp;

    // Streak (simplified: count consecutive days with completed sessions)
    const streakRes = await pool.query(`
      WITH daily AS (
        SELECT DISTINCT DATE(completed_at) as day
        FROM practice_sessions
        WHERE user_id = $1 AND completed_at IS NOT NULL
        ORDER BY day DESC
      )
      SELECT day FROM daily
    `, [userId]);
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i < streakRes.rows.length; i++) {
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      const expectedStr = expected.toISOString().split('T')[0];
      if (streakRes.rows[i].day === expectedStr) streak++;
      else break;
    }

    // Inside the loop after earning a new achievement
if (earned) {
  // Insert if not already earned
  const insertResult = await pool.query(
    `INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`,
    [userId, ach.id]
  );
  
  // If newly earned (insertResult has row), create notification
  if (insertResult.rows.length > 0) {
    await NotificationService.create(
      userId,
      'achievement',
      `🎉 Achievement Unlocked: ${ach.name}`,
      ach.description,
      { achievement_id: ach.id, achievement_name: ach.name }
    );
  }
}

    // Total sessions count
    const sessionsRes = await pool.query('SELECT COUNT(*) as count FROM practice_sessions WHERE user_id = $1 AND completed_at IS NOT NULL', [userId]);
    const sessionsCount = parseInt(sessionsRes.rows[0].count);

    // Perfect score: has any session with score = 100
    const perfectRes = await pool.query('SELECT EXISTS(SELECT 1 FROM practice_sessions WHERE user_id = $1 AND score = 100) as has_perfect', [userId]);
    const hasPerfect = perfectRes.rows[0].has_perfect;

    // Top 10% rank: need to compute rank based on XP among all users
    let isTop10 = false;
    const rankRes = await pool.query(`
      SELECT COUNT(*) as total_users FROM users
    `);
    const totalUsers = parseInt(rankRes.rows[0].total_users);
    if (totalUsers > 0) {
      const userRankRes = await pool.query(`
        SELECT rank FROM (
          SELECT id, RANK() OVER (ORDER BY COALESCE((SELECT SUM(xp_amount) FROM xp_events WHERE user_id = users.id), 0) DESC) as rank
          FROM users
        ) ranked WHERE id = $1
      `, [userId]);
      const userRank = parseInt(userRankRes.rows[0]?.rank || totalUsers);
      if (userRank <= Math.ceil(totalUsers * 0.1)) isTop10 = true;
    }

    // Topics mastered: distinct topics where user has answered questions correctly
    const topicsMasteredRes = await pool.query(`
      SELECT COUNT(DISTINCT q.topic_id) as mastered
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.user_id = $1 AND a.is_correct = true
    `, [userId]);
    const topicsMastered = parseInt(topicsMasteredRes.rows[0].mastered);

    // 2. Fetch all achievements
    const achievementsRes = await pool.query('SELECT * FROM achievements');
    const achievements = achievementsRes.rows;

    // 3. For each achievement, check conditions
    for (const ach of achievements) {
      let earned = false;
      switch (ach.trigger_type) {
        case 'total_xp':
          earned = totalXP >= ach.trigger_value;
          break;
        case 'streak':
          earned = streak >= ach.trigger_value;
          break;
        case 'sessions_count':
          earned = sessionsCount >= ach.trigger_value;
          break;
        case 'perfect_score':
          earned = hasPerfect;
          break;
        case 'top10_percent':
          earned = isTop10;
          break;
        case 'topics_mastered':
          earned = topicsMastered >= ach.trigger_value;
          break;
        default:
          continue;
      }
      if (earned) {
        // Insert if not already earned
        await pool.query(
          `INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, ach.id]
        );
      }
    }
  } catch (err) {
    console.error('Error checking achievements:', err);
  }
}

module.exports = { checkAndAwardAchievements };