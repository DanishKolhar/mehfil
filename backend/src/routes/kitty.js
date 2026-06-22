const express = require('express');
const db = require('../config/db');
const { authenticateJWT, requireGroupMember, requireGroupAdmin } = require('../middleware/auth');

const router = express.Router();

// 1. Get Kitty Party Current Status and Eligible Candidates
router.get('/:groupId/status', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;

  try {
    // A. Find last cycle details
    const [rotations] = await db.query(
      `SELECT kr.*, 
       uh.full_name AS host_name, uh.profile_picture_url AS host_avatar,
       uw.full_name AS winner_name, uw.profile_picture_url AS winner_avatar
       FROM kitty_rotations kr
       JOIN users uh ON kr.host_id = uh.id
       LEFT JOIN users uw ON kr.winner_id = uw.id
       WHERE kr.group_id = ?
       ORDER BY kr.cycle_number DESC`,
      [groupId]
    );

    const currentCycle = rotations.length > 0 ? rotations[0] : null;

    // B. Get all members with payment & attendance status for drawing context
    // We fetch details about their latest contribution payment and last event attendance
    const [members] = await db.query(
      `SELECT gm.user_id, u.full_name, u.email, u.profile_picture_url,
       -- Contribution check
       COALESCE(
         (SELECT cp.payment_status 
          FROM contribution_payments cp
          JOIN contributions c ON cp.contribution_id = c.id
          WHERE cp.user_id = u.id AND c.group_id = ?
          ORDER BY c.due_date DESC LIMIT 1
         ), 'pending'
       ) AS latest_payment_status,
       -- Last event attendance check
       COALESCE(
         (SELECT ea.status 
          FROM event_attendance ea
          JOIN events e ON ea.event_id = e.id
          WHERE ea.user_id = u.id AND e.group_id = ?
          ORDER BY e.date DESC, e.time DESC LIMIT 1
         ), 'present'
       ) AS latest_attendance_status,
       -- Check if already won in the current sequence of cycles
       IF(u.id IN (
         SELECT winner_id FROM kitty_rotations 
         WHERE group_id = ? AND winner_id IS NOT NULL
       ), TRUE, FALSE) AS has_won_previously
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?`,
      [groupId, groupId, groupId, groupId]
    );

    // C. Get rotation/winner history
    const [winnersHistory] = await db.query(
      `SELECT wh.*, u.full_name AS winner_name, u.profile_picture_url AS winner_avatar,
       uh.full_name AS host_name, kr.cycle_number
       FROM winner_history wh
       JOIN users u ON wh.user_id = u.id
       JOIN kitty_rotations kr ON wh.kitty_rotation_id = kr.id
       JOIN users uh ON kr.host_id = uh.id
       WHERE wh.group_id = ?
       ORDER BY kr.cycle_number DESC`,
      [groupId]
    );

    return res.json({
      currentCycleNumber: currentCycle ? currentCycle.cycle_number : 0,
      activeCycle: currentCycle,
      members,
      history: winnersHistory
    });
  } catch (error) {
    console.error('Fetch kitty status error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 2. Perform Kitty Draw (Admin only)
router.post('/:groupId/draw', authenticateJWT, requireGroupAdmin, async (req, res) => {
  const groupId = req.params.groupId;
  const {
    drawType,        // 'spin_wheel', 'chit_draw', 'manual'
    excludeUnpaid,   // boolean
    excludeAbsent,   // boolean
    manualExcluded,  // array of user_ids
    overrideWinnerId, // user_id if manual
    hostId,          // user_id of host for this cycle
    remarks
  } = req.body;

  if (!drawType || !hostId) {
    return res.status(400).json({ message: 'Draw type and Host selection are required.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get next cycle number
    const [rotations] = await connection.query(
      'SELECT MAX(cycle_number) AS max_cycle FROM kitty_rotations WHERE group_id = ?',
      [groupId]
    );
    const nextCycle = (rotations[0]?.max_cycle || 0) + 1;

    // 2. Find eligible users
    // Fetch all active members in group
    const [members] = await connection.query(
      `SELECT gm.user_id, u.full_name
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?`,
      [groupId]
    );

    if (members.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'No members in this group.' });
    }

    // Determine who has won in past cycles
    const [pastWinners] = await connection.query(
      'SELECT DISTINCT winner_id FROM kitty_rotations WHERE group_id = ? AND winner_id IS NOT NULL',
      [groupId]
    );
    const pastWinnerIds = pastWinners.map(pw => pw.winner_id);

    // Filter out previous winners unless EVERYONE in the group has won
    let pool = members;
    const allMembersHaveWon = members.every(m => pastWinnerIds.includes(m.user_id));
    if (!allMembersHaveWon) {
      pool = pool.filter(m => !pastWinnerIds.includes(m.user_id));
    }

    // Filter by manual excluded user IDs
    if (manualExcluded && Array.isArray(manualExcluded)) {
      pool = pool.filter(m => !manualExcluded.includes(m.user_id));
    }

    // Filter by unpaid rule
    if (excludeUnpaid) {
      // Find the latest contribution cycle for the group
      const [latestContrib] = await connection.query(
        'SELECT id FROM contributions WHERE group_id = ? ORDER BY due_date DESC LIMIT 1',
        [groupId]
      );

      if (latestContrib.length > 0) {
        const contribId = latestContrib[0].id;
        const [paidUsers] = await connection.query(
          "SELECT user_id FROM contribution_payments WHERE contribution_id = ? AND payment_status = 'paid'",
          [contribId]
        );
        const paidUserIds = paidUsers.map(pu => pu.user_id);
        pool = pool.filter(m => paidUserIds.includes(m.user_id));
      }
    }

    // Filter by absent rule
    if (excludeAbsent) {
      // Find latest completed event in the group
      const [latestEvent] = await connection.query(
        "SELECT id FROM events WHERE group_id = ? AND status = 'completed' ORDER BY date DESC, time DESC LIMIT 1",
        [groupId]
      );

      if (latestEvent.length > 0) {
        const eventId = latestEvent[0].id;
        const [presentUsers] = await connection.query(
          "SELECT user_id FROM event_attendance WHERE event_id = ? AND status IN ('present', 'late')",
          [eventId]
        );
        const presentUserIds = presentUsers.map(pu => pu.user_id);
        pool = pool.filter(m => presentUserIds.includes(m.user_id));
      }
    }

    // Check pool
    if (pool.length === 0 && drawType !== 'manual') {
      await connection.rollback();
      return res.status(400).json({
        message: 'No eligible candidates left to draw. Try disabling exclusions or resetting rules.'
      });
    }

    let selectedWinnerId = null;

    if (drawType === 'manual') {
      if (!overrideWinnerId) {
        await connection.rollback();
        return res.status(400).json({ message: 'Winner ID must be selected for manual draws.' });
      }
      selectedWinnerId = parseInt(overrideWinnerId);
    } else {
      // Draw randomly from the eligible pool
      const randomIndex = Math.floor(Math.random() * pool.length);
      selectedWinnerId = pool[randomIndex].user_id;
    }

    // 3. Save rotation details
    const [rotResult] = await connection.query(
      `INSERT INTO kitty_rotations (group_id, cycle_number, host_id, winner_id, draw_date, draw_type, remarks)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
      [groupId, nextCycle, hostId, selectedWinnerId, drawType, remarks || null]
    );
    const rotationId = rotResult.insertId;

    // 4. Calculate winner pool amount (sum of contributions paid or expected for this cycle)
    // Find the latest contribution for the amount
    const [latestContrib] = await connection.query(
      'SELECT amount FROM contributions WHERE group_id = ? ORDER BY due_date DESC LIMIT 1',
      [groupId]
    );
    const prizeAmount = latestContrib.length > 0 
      ? latestContrib[0].amount * members.length 
      : 0.00;

    // 5. Save winner history record
    await connection.query(
      `INSERT INTO winner_history (group_id, kitty_rotation_id, user_id, amount_won, won_date, remarks)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
      [groupId, rotationId, selectedWinnerId, prizeAmount, remarks || null]
    );

    await connection.commit();

    // Fetch winner user profile to return
    const [[winnerUser]] = await db.query(
      'SELECT id, full_name, email, profile_picture_url FROM users WHERE id = ?',
      [selectedWinnerId]
    );

    return res.status(201).json({
      message: 'Kitty draw completed successfully!',
      cycleNumber: nextCycle,
      winner: winnerUser,
      prizeAmount,
      eligiblePool: pool
    });
  } catch (error) {
    await connection.rollback();
    console.error('Kitty draw error:', error);
    return res.status(500).json({ message: 'Internal server error executing kitty draw.' });
  } finally {
    connection.release();
  }
});

// 3. Fetch Winners History with search, pagination, filter
router.get('/:groupId/winners', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT wh.*, u.full_name AS winner_name, u.profile_picture_url AS winner_avatar,
      uh.full_name AS host_name, kr.cycle_number
      FROM winner_history wh
      JOIN users u ON wh.user_id = u.id
      JOIN kitty_rotations kr ON wh.kitty_rotation_id = kr.id
      JOIN users uh ON kr.host_id = uh.id
      WHERE wh.group_id = ?
    `;
    let queryParams = [groupId];

    if (search) {
      query += ' AND (u.full_name LIKE ? OR uh.full_name LIKE ? OR wh.remarks LIKE ?)';
      const searchWildcard = `%${search}%`;
      queryParams.push(searchWildcard, searchWildcard, searchWildcard);
    }

    query += ' ORDER BY kr.cycle_number DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const [winners] = await db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) AS total_count
      FROM winner_history wh
      JOIN users u ON wh.user_id = u.id
      WHERE wh.group_id = ?
    `;
    let countParams = [groupId];

    if (search) {
      countQuery += ' AND (u.full_name LIKE ? OR wh.remarks LIKE ?)';
      const searchWildcard = `%${search}%`;
      countParams.push(searchWildcard, searchWildcard);
    }

    const [[countResult]] = await db.query(countQuery, countParams);
    const totalCount = countResult?.total_count || 0;

    return res.json({
      winners,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount
      }
    });
  } catch (error) {
    console.error('Fetch winners history error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
