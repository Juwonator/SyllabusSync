const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// ─── REGISTER ───────────────────────────────────────
router.post('/register', async (req, res) => {
  const { full_name, email, password, exam_target, current_class } = req.body;

  try {
    // Check if email already exists
    const existingUser = await db.query(
      'SELECT * FROM users WHERE email = $1', 
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Encrypt the password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Save new user to database
    const newUser = await db.query(
      `INSERT INTO users (full_name, email, password_hash, exam_target, current_class) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, exam_target`,
      [full_name, email, password_hash, exam_target, current_class]
    );

    // Create login token
    const token = jwt.sign(
      { id: newUser.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── LOGIN ───────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await db.query(
      'SELECT * FROM users WHERE email = $1', 
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Create login token
    const token = jwt.sign(
      { id: user.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.rows[0].id,
        full_name: user.rows[0].full_name,
        email: user.rows[0].email,
        exam_target: user.rows[0].exam_target,
        xp_points: user.rows[0].xp_points,
        streak_days: user.rows[0].streak_days
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Middleware to verify token (if not already defined)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

    // GET /api/auth/profile – get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT id, full_name, email, phone, class_level, exam_target FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/profile – update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone, class_level, exam_target } = req.body;
    const result = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           class_level = COALESCE($3, class_level),
           exam_target = COALESCE($4, exam_target)
       WHERE id = $5
       RETURNING id, full_name, email, phone, class_level, exam_target`,
      [full_name, phone, class_level, exam_target, userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;