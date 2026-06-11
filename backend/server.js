const express = require('express');
const cors = require('cors');
const cbtRoutes = require('./routes/cbtRoutes');
const examRoutes = require('./routes/examRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const classroomRoutes = require('./routes/classroomRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const bookmarkRoutes = require('./routes/bookmarkRoutes');
const topicRoutes = require('./routes/topicRoutes');
require('dotenv').config();

// Ensure critical environment variables exist before starting up
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ CRITICAL ERROR: Missing required environment variables:');
  missingEnvVars.forEach((envVar) => {
    console.error(`   - ${envVar}`);
  });
  console.error('Please check your .env file. Shutting down server... 🛑');
  process.exit(1);
}

// Connect to database
const db = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/cbt', cbtRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/classroom', classroomRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/exams', examRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'SyllabusSync server is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SyllabusSync server running on port ${PORT}`);
});