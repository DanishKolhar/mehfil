const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'mehfil_v2_ultra_secret_key_2026';

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header is missing.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token is missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains id, email, full_name
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
}

async function requireGroupMember(req, res, next) {
  const groupId = req.params.groupId || req.body.groupId || req.query.groupId;
  const userId = req.user.id;

  if (!groupId) {
    return res.status(400).json({ message: 'Group ID is required.' });
  }

  try {
    const [members] = await db.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (members.length === 0) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }

    req.groupRole = members[0].role; // Store user role in request context
    next();
  } catch (error) {
    console.error('Group member check error:', error);
    return res.status(500).json({ message: 'Internal server error during authorization.' });
  }
}

async function requireGroupAdmin(req, res, next) {
  const groupId = req.params.groupId || req.body.groupId || req.query.groupId;
  const userId = req.user.id;

  if (!groupId) {
    return res.status(400).json({ message: 'Group ID is required.' });
  }

  try {
    const [members] = await db.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (members.length === 0 || members[0].role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
    }

    next();
  } catch (error) {
    console.error('Group admin check error:', error);
    return res.status(500).json({ message: 'Internal server error during authorization.' });
  }
}

module.exports = {
  authenticateJWT,
  requireGroupMember,
  requireGroupAdmin
};
