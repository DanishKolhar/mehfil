const express = require('express');
const db = require('../config/db');
const { authenticateJWT, requireGroupMember, requireGroupAdmin } = require('../middleware/auth');

const router = express.Router();

// 1. Get Group Events
router.get('/:groupId', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;

  try {
    const [events] = await db.query(
      `SELECT e.*, u.full_name AS host_name
       FROM events e
       JOIN users u ON e.host_id = u.id
       WHERE e.group_id = ?
       ORDER BY e.date DESC, e.time DESC`,
      [groupId]
    );

    return res.json(events);
  } catch (error) {
    console.error('Fetch events error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 2. Create Event (Admin only)
router.post('/:groupId', authenticateJWT, requireGroupAdmin, async (req, res) => {
  const groupId = req.params.groupId;
  const { title, description, date, time, venue, theme, budget, hostId, notes } = req.body;

  if (!title || !date || !time || !venue || !hostId) {
    return res.status(400).json({ message: 'Title, Date, Time, Venue, and Host are required.' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO events (group_id, title, description, date, time, venue, theme, budget, host_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
      [groupId, title, description || null, date, time, venue, theme || null, budget || 0.00, hostId]
    );

    // Automatically create RSVPs placeholder for all group members
    const [members] = await db.query('SELECT user_id FROM group_members WHERE group_id = ?', [groupId]);
    if (members.length > 0) {
      const rsvpValues = members.map(m => [result.insertId, m.user_id, 'maybe']);
      await db.query(
        'INSERT IGNORE INTO event_rsvps (event_id, user_id, status) VALUES ?',
        [rsvpValues]
      );
    }

    return res.status(201).json({
      message: 'Event created successfully.',
      eventId: result.insertId
    });
  } catch (error) {
    console.error('Create event error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 3. Edit Event (Admin only)
router.put('/:groupId/:eventId', authenticateJWT, requireGroupAdmin, async (req, res) => {
  const eventId = req.params.eventId;
  const { title, description, date, time, venue, theme, budget, hostId, status } = req.body;

  if (!title || !date || !time || !venue || !hostId) {
    return res.status(400).json({ message: 'Title, Date, Time, Venue, and Host are required.' });
  }

  try {
    const [result] = await db.query(
      `UPDATE events 
       SET title = ?, description = ?, date = ?, time = ?, venue = ?, theme = ?, budget = ?, host_id = ?, status = ?
       WHERE id = ?`,
      [title, description || null, date, time, venue, theme || null, budget || 0.00, hostId, status || 'scheduled', eventId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    return res.json({ message: 'Event updated successfully.' });
  } catch (error) {
    console.error('Edit event error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 4. Cancel/Complete Event Status Shortcut (Admin only)
router.patch('/:groupId/:eventId/status', authenticateJWT, requireGroupAdmin, async (req, res) => {
  const eventId = req.params.eventId;
  const { status } = req.body; // 'scheduled', 'cancelled', 'completed'

  if (!['scheduled', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  try {
    const [result] = await db.query(
      'UPDATE events SET status = ? WHERE id = ?',
      [status, eventId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    return res.json({ message: `Event status updated to ${status}.` });
  } catch (error) {
    console.error('Update event status error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 5. Delete Event (Admin only)
router.delete('/:groupId/:eventId', authenticateJWT, requireGroupAdmin, async (req, res) => {
  const eventId = req.params.eventId;

  try {
    const [result] = await db.query('DELETE FROM events WHERE id = ?', [eventId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    return res.json({ message: 'Event deleted successfully.' });
  } catch (error) {
    console.error('Delete event error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 6. Get RSVP Status for Logged-In User
router.get('/:groupId/:eventId/rsvp', authenticateJWT, requireGroupMember, async (req, res) => {
  const eventId = req.params.eventId;
  const userId = req.user.id;

  try {
    const [rsvps] = await db.query(
      'SELECT status FROM event_rsvps WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );

    const status = rsvps.length > 0 ? rsvps[0].status : 'maybe';
    return res.json({ status });
  } catch (error) {
    console.error('Get RSVP error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 7. Post RSVP (Any member)
router.post('/:groupId/:eventId/rsvp', authenticateJWT, requireGroupMember, async (req, res) => {
  const eventId = req.params.eventId;
  const userId = req.user.id;
  const { status } = req.body; // 'attending', 'maybe', 'not_attending'

  if (!['attending', 'maybe', 'not_attending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid RSVP status.' });
  }

  try {
    await db.query(
      `INSERT INTO event_rsvps (event_id, user_id, status)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE status = ?`,
      [eventId, userId, status, status]
    );

    return res.json({ message: 'RSVP submitted successfully.', status });
  } catch (error) {
    console.error('Post RSVP error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 8. Get All RSVPs and RSVP Statistics for Event
router.get('/:groupId/:eventId/rsvps', authenticateJWT, requireGroupMember, async (req, res) => {
  const eventId = req.params.eventId;

  try {
    // 1. RSVP list
    const [rsvps] = await db.query(
      `SELECT er.status, er.updated_at, u.id AS user_id, u.full_name, u.email, u.profile_picture_url
       FROM event_rsvps er
       JOIN users u ON er.user_id = u.id
       WHERE er.event_id = ?`,
      [eventId]
    );

    // 2. Aggregate stats
    const stats = {
      attending: rsvps.filter(r => r.status === 'attending').length,
      maybe: rsvps.filter(r => r.status === 'maybe').length,
      notAttending: rsvps.filter(r => r.status === 'not_attending').length
    };

    return res.json({ rsvps, stats });
  } catch (error) {
    console.error('Fetch event RSVPs error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 9. Get Event Attendance List
router.get('/:groupId/:eventId/attendance', authenticateJWT, requireGroupMember, async (req, res) => {
  const eventId = req.params.eventId;
  const groupId = req.params.groupId;

  try {
    // Fetch group members and their attendance status if recorded
    const [attendance] = await db.query(
      `SELECT gm.user_id, u.full_name, u.email, u.profile_picture_url,
       COALESCE(ea.status, 'present') AS status,
       IF(ea.id IS NULL, FALSE, TRUE) AS is_recorded
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       LEFT JOIN event_attendance ea ON gm.user_id = ea.user_id AND ea.event_id = ?
       WHERE gm.group_id = ?`,
      [eventId, groupId]
    );

    return res.json(attendance);
  } catch (error) {
    console.error('Fetch attendance error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 10. Record/Update Attendance (Admin only)
router.post('/:groupId/:eventId/attendance', authenticateJWT, requireGroupAdmin, async (req, res) => {
  const eventId = req.params.eventId;
  const { records } = req.body; // Array of { userId, status: 'present' | 'absent' | 'late' }

  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ message: 'Records list is required.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    for (const record of records) {
      if (!['present', 'absent', 'late'].includes(record.status)) {
        continue; // skip invalid statuses
      }
      await connection.query(
        `INSERT INTO event_attendance (event_id, user_id, status)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE status = ?`,
        [eventId, record.userId, record.status, record.status]
      );
    }

    await connection.commit();
    return res.json({ message: 'Attendance recorded successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Save attendance error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  } finally {
    connection.release();
  }
});

module.exports = router;
