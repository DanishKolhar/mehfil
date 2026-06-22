const express = require('express');
const db = require('../config/db');
const { authenticateJWT, requireGroupAdmin, requireGroupMember } = require('../middleware/auth');

const router = express.Router();

// 1. Get Logged-in User's Groups
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const [groups] = await db.query(
      `SELECT g.*, gm.role, gm.joined_at,
       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
       FROM \`groups\` g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );
    return res.json(groups);
  } catch (error) {
    console.error('Fetch groups error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 2. Create Group
router.post('/', authenticateJWT, async (req, res) => {
  const { name, description, type } = req.body;
  const userId = req.user.id;

  if (!name || !type) {
    return res.status(400).json({ message: 'Name and Type are required.' });
  }

  if (type !== 'standard' && type !== 'kitty') {
    return res.status(400).json({ message: 'Invalid group type.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Insert group
    const [groupResult] = await connection.query(
      'INSERT INTO `groups` (name, description, type, created_by_id) VALUES (?, ?, ?, ?)',
      [name, description || null, type, userId]
    );
    const groupId = groupResult.insertId;

    // Add creator as admin
    await connection.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, userId, 'admin']
    );

    await connection.commit();
    return res.status(201).json({
      message: 'Group created successfully.',
      groupId,
      group: { id: groupId, name, description, type, role: 'admin' }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create group error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  } finally {
    connection.release();
  }
});

// 3. Get Pending Invitations for Current User's Email
router.get('/invites/pending', authenticateJWT, async (req, res) => {
  try {
    const [invites] = await db.query(
      `SELECT gi.*, g.name AS group_name, g.type AS group_type, u.full_name AS invited_by_name
       FROM group_invitations gi
       JOIN \`groups\` g ON gi.group_id = g.id
       JOIN users u ON gi.invited_by_id = u.id
       WHERE gi.email = ? AND gi.status = 'pending'`,
      [req.user.email]
    );
    return res.json(invites);
  } catch (error) {
    console.error('Fetch pending invites error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 4. Respond to Invitation (Accept / Decline)
router.post('/invites/:inviteId/respond', authenticateJWT, async (req, res) => {
  const { action } = req.body; // 'accept' or 'decline'
  const inviteId = req.params.inviteId;
  const userEmail = req.user.email;
  const userId = req.user.id;

  if (action !== 'accept' && action !== 'decline') {
    return res.status(400).json({ message: "Invalid action. Must be 'accept' or 'decline'." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Check invitation
    const [invites] = await connection.query(
      'SELECT * FROM group_invitations WHERE id = ? AND email = ? AND status = "pending"',
      [inviteId, userEmail]
    );

    if (invites.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Invitation not found or already processed.' });
    }

    const invite = invites[0];
    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    // Update invite status
    await connection.query(
      'UPDATE group_invitations SET status = ? WHERE id = ?',
      [newStatus, inviteId]
    );

    if (action === 'accept') {
      // Add to group members (ignore if already in group)
      await connection.query(
        `INSERT INTO group_members (group_id, user_id, role) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE role = role`,
        [invite.group_id, userId, invite.role]
      );
    }

    await connection.commit();
    return res.json({ message: `Invitation ${action}ed successfully.`, groupId: invite.group_id });
  } catch (error) {
    await connection.rollback();
    console.error('Respond invitation error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  } finally {
    connection.release();
  }
});

// 5. Get Single Group Details (requires membership)
router.get('/:groupId', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;

  try {
    // 1. Group info
    const [groups] = await db.query(
      `SELECT g.*, u.full_name AS creator_name 
       FROM \`groups\` g 
       JOIN users u ON g.created_by_id = u.id 
       WHERE g.id = ?`,
      [groupId]
    );

    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    // 2. Members list
    const [members] = await db.query(
      `SELECT gm.id, gm.role, gm.joined_at, u.id AS user_id, u.full_name, u.email, u.profile_picture_url 
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?`,
      [groupId]
    );

    // 3. Sent invitations list
    const [invites] = await db.query(
      `SELECT gi.id, gi.email, gi.role, gi.status, gi.created_at, u.full_name AS invited_by_name
       FROM group_invitations gi
       JOIN users u ON gi.invited_by_id = u.id
       WHERE gi.group_id = ?`,
      [groupId]
    );

    return res.json({
      group: groups[0],
      myRole: req.groupRole,
      members,
      invitations: invites
    });
  } catch (error) {
    console.error('Get group details error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 6. Invite Member to Group (requires admin)
router.post('/:groupId/invite', authenticateJWT, requireGroupAdmin, async (req, res) => {
  const groupId = req.params.groupId;
  const { email, role } = req.body;
  const invitedById = req.user.id;

  if (!email) {
    return res.status(400).json({ message: 'Email address is required.' });
  }

  const memberRole = role === 'admin' ? 'admin' : 'member';

  try {
    // Check if user is already a member
    const [existingMember] = await db.query(
      `SELECT gm.id FROM group_members gm 
       JOIN users u ON gm.user_id = u.id 
       WHERE gm.group_id = ? AND u.email = ?`,
      [groupId, email]
    );

    if (existingMember.length > 0) {
      return res.status(400).json({ message: 'User is already a member of this group.' });
    }

    // Insert or update invitation
    await db.query(
      `INSERT INTO group_invitations (group_id, email, role, status, invited_by_id)
       VALUES (?, ?, ?, 'pending', ?)
       ON DUPLICATE KEY UPDATE role = ?, status = 'pending', invited_by_id = ?`,
      [groupId, email, memberRole, invitedById, memberRole, invitedById]
    );

    return res.json({ message: `Invitation successfully sent to ${email}.` });
  } catch (error) {
    console.error('Invite error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 7. Change Member Role (requires admin)
router.post('/:groupId/members/:userId/role', authenticateJWT, requireGroupAdmin, async (req, res) => {
  const groupId = req.params.groupId;
  const memberUserId = req.params.userId;
  const { role } = req.body;

  if (role !== 'admin' && role !== 'member') {
    return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'member'." });
  }

  try {
    // Check if targeting self
    if (parseInt(memberUserId) === req.user.id) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }

    const [result] = await db.query(
      'UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?',
      [role, groupId, memberUserId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Member not found.' });
    }

    return res.json({ message: 'Member role updated successfully.' });
  } catch (error) {
    console.error('Update role error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 8. Remove Member (requires admin)
router.delete('/:groupId/members/:userId', authenticateJWT, requireGroupAdmin, async (req, res) => {
  const groupId = req.params.groupId;
  const memberUserId = req.params.userId;

  try {
    if (parseInt(memberUserId) === req.user.id) {
      return res.status(400).json({ message: 'You cannot remove yourself from the group.' });
    }

    const [result] = await db.query(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, memberUserId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Member not found.' });
    }

    return res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    console.error('Remove member error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 9. Delete Group (requires admin / creator)
router.delete('/:groupId', authenticateJWT, requireGroupAdmin, async (req, res) => {
  const groupId = req.params.groupId;

  try {
    await db.query('DELETE FROM `groups` WHERE id = ?', [groupId]);
    return res.json({ message: 'Group deleted successfully.' });
  } catch (error) {
    console.error('Delete group error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 10. Group Dashboard/Analytics Summary Feed
router.get('/:groupId/dashboard', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;

  try {
    // 1. Group info & member count
    const [[group]] = await db.query(
      `SELECT g.*, COUNT(gm.id) AS member_count
       FROM \`groups\` g
       LEFT JOIN group_members gm ON g.id = gm.group_id
       WHERE g.id = ?
       GROUP BY g.id`,
      [groupId]
    );

    // 2. Financial totals
    const [[contributions]] = await db.query(
      `SELECT 
       COALESCE(SUM(c.amount), 0) AS total_budgeted,
       (SELECT COALESCE(SUM(amount_paid), 0) 
        FROM contribution_payments cp
        JOIN contributions c2 ON cp.contribution_id = c2.id
        WHERE c2.group_id = ? AND cp.payment_status = 'paid') AS total_collected
       FROM contributions c
       WHERE c.group_id = ?`,
      [groupId, groupId]
    );

    const [[expenses]] = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total_spent FROM expenses WHERE group_id = ?`,
      [groupId]
    );

    // 3. Upcoming Event
    const [events] = await db.query(
      `SELECT e.*, u.full_name AS host_name
       FROM events e
       JOIN users u ON e.host_id = u.id
       WHERE e.group_id = ? AND e.date >= CURDATE() AND e.status = 'scheduled'
       ORDER BY e.date ASC, e.time ASC
       LIMIT 1`,
      [groupId]
    );

    // 4. Active Polls
    const [polls] = await db.query(
      `SELECT p.id, p.title, p.expires_at, COUNT(pv.id) AS total_votes
       FROM polls p
       LEFT JOIN poll_votes pv ON p.id = pv.poll_id
       WHERE p.group_id = ? AND p.expires_at > NOW()
       GROUP BY p.id
       ORDER BY p.expires_at ASC
       LIMIT 2`,
      [groupId]
    );

    // 5. Recent Winners (for Kitty)
    let recentWinners = [];
    if (group.type === 'kitty') {
      [recentWinners] = await db.query(
        `SELECT wh.amount_won, wh.won_date, u.full_name, kr.cycle_number
         FROM winner_history wh
         JOIN users u ON wh.user_id = u.id
         JOIN kitty_rotations kr ON wh.kitty_rotation_id = kr.id
         WHERE wh.group_id = ?
         ORDER BY wh.won_date DESC
         LIMIT 3`,
        [groupId]
      );
    }

    return res.json({
      group,
      finances: {
        totalCollected: contributions?.total_collected || 0,
        totalSpent: expenses?.total_spent || 0,
        outstanding: Math.max(0, (contributions?.total_budgeted || 0) - (contributions?.total_collected || 0))
      },
      upcomingEvent: events[0] || null,
      activePolls: polls,
      recentWinners: recentWinners
    });
  } catch (error) {
    console.error('Group dashboard analytics error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
