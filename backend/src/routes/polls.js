const express = require('express');
const db = require('../config/db');
const { authenticateJWT, requireGroupMember, requireGroupAdmin } = require('../middleware/auth');

const router = express.Router();

// 1. Get Group Polls
router.get('/:groupId', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;

  try {
    const [polls] = await db.query(
      `SELECT p.*,
       (SELECT COUNT(DISTINCT user_id) FROM poll_votes WHERE poll_id = p.id) AS total_votes,
       IF(p.expires_at > NOW(), TRUE, FALSE) AS is_active,
       (SELECT option_id FROM poll_votes WHERE poll_id = p.id AND user_id = ?) AS user_voted_option_id
       FROM polls p
       WHERE p.group_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.id, groupId]
    );

    return res.json(polls);
  } catch (error) {
    console.error('Fetch polls error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 2. Create Poll (Any group member can create a poll to engage, or we can restrict it if needed. Let's allow all members to create polls, but only admins can delete)
router.post('/:groupId', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;
  const { title, description, type, expiresAt, options } = req.body;

  if (!title || !expiresAt || !options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ message: 'Title, expiry time, and at least 2 options are required.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Create poll
    const [pollResult] = await connection.query(
      'INSERT INTO polls (group_id, title, description, type, expires_at) VALUES (?, ?, ?, ?, ?)',
      [groupId, title, description || null, type || 'other', expiresAt]
    );
    const pollId = pollResult.insertId;

    // 2. Create poll options
    const optionValues = options.map(opt => [pollId, opt.trim()]);
    await connection.query(
      'INSERT INTO poll_options (poll_id, option_text) VALUES ?',
      [optionValues]
    );

    await connection.commit();
    return res.status(201).json({ message: 'Poll created successfully.', pollId });
  } catch (error) {
    await connection.rollback();
    console.error('Create poll error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  } finally {
    connection.release();
  }
});

// 3. Get Single Poll with Options & Live Vote Percentages
router.get('/:groupId/details/:pollId', authenticateJWT, requireGroupMember, async (req, res) => {
  const pollId = req.params.pollId;
  const userId = req.user.id;

  try {
    const [[poll]] = await db.query(
      `SELECT p.*, IF(p.expires_at > NOW(), TRUE, FALSE) AS is_active 
       FROM polls p WHERE p.id = ?`,
      [pollId]
    );

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found.' });
    }

    // Fetch options with vote count
    const [options] = await db.query(
      `SELECT po.*, COUNT(pv.id) AS votes_count
       FROM poll_options po
       LEFT JOIN poll_votes pv ON po.id = pv.option_id
       WHERE po.poll_id = ?
       GROUP BY po.id`,
      [pollId]
    );

    // Fetch user's vote
    const [[userVote]] = await db.query(
      'SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?',
      [pollId, userId]
    );

    const totalVotes = options.reduce((sum, opt) => sum + parseInt(opt.votes_count || 0), 0);

    // Append percentage to each option
    const optionsWithPercentages = options.map(opt => ({
      ...opt,
      votes_count: parseInt(opt.votes_count),
      percentage: totalVotes > 0 ? Math.round((parseInt(opt.votes_count) / totalVotes) * 100) : 0
    }));

    return res.json({
      poll,
      options: optionsWithPercentages,
      totalVotes,
      userVotedOptionId: userVote ? userVote.option_id : null
    });
  } catch (error) {
    console.error('Fetch poll details error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 4. Cast or Update Vote
router.post('/:groupId/vote/:pollId', authenticateJWT, requireGroupMember, async (req, res) => {
  const pollId = req.params.pollId;
  const userId = req.user.id;
  const { optionId } = req.body;

  if (!optionId) {
    return res.status(400).json({ message: 'Option ID is required.' });
  }

  try {
    // 1. Verify poll is active
    const [[poll]] = await db.query('SELECT expires_at FROM polls WHERE id = ?', [pollId]);
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found.' });
    }

    if (new Date(poll.expires_at) < new Date()) {
      return res.status(400).json({ message: 'This poll has already expired.' });
    }

    // 2. Validate option belongs to poll
    const [[option]] = await db.query(
      'SELECT id FROM poll_options WHERE id = ? AND poll_id = ?',
      [optionId, pollId]
    );
    if (!option) {
      return res.status(400).json({ message: 'Invalid option selected for this poll.' });
    }

    // 3. Insert or update vote (unique key constraints enforce one vote per user per poll)
    await db.query(
      `INSERT INTO poll_votes (poll_id, option_id, user_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE option_id = ?`,
      [pollId, optionId, userId, optionId]
    );

    return res.json({ message: 'Vote recorded successfully.' });
  } catch (error) {
    console.error('Cast vote error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 5. Delete Poll (Admin or Poll Creator. Let's restrict delete to Admin for simplicity)
router.delete('/:groupId/:pollId', authenticateJWT, requireGroupAdmin, async (req, res) => {
  const pollId = req.params.pollId;

  try {
    const [result] = await db.query('DELETE FROM polls WHERE id = ?', [pollId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Poll not found.' });
    }

    return res.json({ message: 'Poll deleted successfully.' });
  } catch (error) {
    console.error('Delete poll error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
