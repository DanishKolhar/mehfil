const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const db = require('../config/db');
const { authenticateJWT } = require('../middleware/auth');
const { uploadImage } = require('../services/cloudinaryService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const JWT_SECRET = process.env.JWT_SECRET || 'mehfil_v2_ultra_secret_key_2026';

// 1. Sign Up Route
router.post('/signup', async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;

  if (!fullName || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  try {
    // Check duplicate email
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [fullName, email, passwordHash]
    );

    // Generate JWT
    const token = jwt.sign(
      { id: result.insertId, email, fullName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: result.insertId,
        fullName,
        email,
        profilePictureUrl: null
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Internal server error during signup.' });
  }
});

// 2. Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const [users] = await db.query(
      'SELECT id, full_name, email, password_hash, profile_picture_url FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, fullName: user.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        profilePictureUrl: user.profile_picture_url
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error during login.' });
  }
});

// 3. Get Current User Info
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, full_name, email, profile_picture_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user: users[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 4. Update Profile
router.put('/profile', authenticateJWT, upload.single('profilePicture'), async (req, res) => {
  const { fullName, email, password } = req.body;
  const userId = req.user.id;

  try {
    let updateFields = [];
    let queryParams = [];

    if (fullName) {
      updateFields.push('full_name = ?');
      queryParams.push(fullName);
    }

    if (email) {
      // Check duplicate email
      const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Email is already taken.' });
      }
      updateFields.push('email = ?');
      queryParams.push(email);
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      updateFields.push('password_hash = ?');
      queryParams.push(passwordHash);
    }

    if (req.file) {
      const url = await uploadImage(req.file);
      updateFields.push('profile_picture_url = ?');
      queryParams.push(url);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update.' });
    }

    queryParams.push(userId);
    await db.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      queryParams
    );

    // Fetch updated user
    const [users] = await db.query(
      'SELECT id, full_name, email, profile_picture_url FROM users WHERE id = ?',
      [userId]
    );

    const updatedUser = users[0];
    const token = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, fullName: updatedUser.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Profile updated successfully.',
      token,
      user: {
        id: updatedUser.id,
        fullName: updatedUser.full_name,
        email: updatedUser.email,
        profilePictureUrl: updatedUser.profile_picture_url
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 5. Get User Stats and Memberships
router.get('/stats', authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Group memberships
    const [groups] = await db.query(
      `SELECT g.id, g.name, g.type, gm.role, gm.joined_at,
       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
       FROM \`groups\` g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?`,
      [userId]
    );

    // 2. Contributions stats
    const [contributions] = await db.query(
      `SELECT 
       COALESCE(SUM(amount_paid), 0) AS total_paid,
       COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) AS payments_completed,
       COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) AS payments_pending
       FROM contribution_payments
       WHERE user_id = ?`,
      [userId]
    );

    // 3. Attendance stats
    const [attendance] = await db.query(
      `SELECT 
       COUNT(CASE WHEN status = 'present' THEN 1 END) AS present_count,
       COUNT(CASE WHEN status = 'absent' THEN 1 END) AS absent_count,
       COUNT(CASE WHEN status = 'late' THEN 1 END) AS late_count,
       COUNT(*) AS total_events
       FROM event_attendance
       WHERE user_id = ?`,
      [userId]
    );

    // 4. Kitty Wins
    const [wins] = await db.query(
      `SELECT COUNT(*) AS total_wins, COALESCE(SUM(amount_won), 0) AS total_won
       FROM winner_history
       WHERE user_id = ?`,
      [userId]
    );

    return res.json({
      groups,
      stats: {
        totalPaidContributions: contributions[0]?.total_paid || 0,
        paymentsCompleted: contributions[0]?.payments_completed || 0,
        paymentsPending: contributions[0]?.payments_pending || 0,
        attendance: {
          present: attendance[0]?.present_count || 0,
          absent: attendance[0]?.absent_count || 0,
          late: attendance[0]?.late_count || 0,
          total: attendance[0]?.total_events || 0,
          percentage: attendance[0]?.total_events > 0 
            ? Math.round(((attendance[0]?.present_count + attendance[0]?.late_count) / attendance[0]?.total_events) * 100)
            : 100
        },
        kittyWinsCount: wins[0]?.total_wins || 0,
        kittyAmountWon: wins[0]?.total_won || 0
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
