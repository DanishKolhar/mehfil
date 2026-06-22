const express = require('express');
const multer = require('multer');
const db = require('../config/db');
const { authenticateJWT, requireGroupMember } = require('../middleware/auth');
const { uploadImage } = require('../services/cloudinaryService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. Fetch Group Gallery Photos
router.get('/:groupId', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;
  const album = req.query.album || '';

  try {
    let query = `
      SELECT pg.*, u.full_name AS uploader_name, e.title AS event_title
      FROM photo_gallery pg
      JOIN users u ON pg.uploaded_by_id = u.id
      LEFT JOIN events e ON pg.event_id = e.id
      WHERE pg.group_id = ?
    `;
    let queryParams = [groupId];

    if (album) {
      query += ' AND pg.album_name = ?';
      queryParams.push(album);
    }

    query += ' ORDER BY pg.created_at DESC';
    const [photos] = await db.query(query, queryParams);

    // Get list of unique albums
    const [albums] = await db.query(
      'SELECT DISTINCT album_name FROM photo_gallery WHERE group_id = ?',
      [groupId]
    );

    return res.json({
      photos,
      albums: albums.map(a => a.album_name)
    });
  } catch (error) {
    console.error('Fetch gallery photos error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 2. Upload Photo (Any group member)
router.post('/:groupId', authenticateJWT, requireGroupMember, upload.single('image'), async (req, res) => {
  const groupId = req.params.groupId;
  const { eventId, albumName } = req.body;
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ message: 'Image file is required.' });
  }

  try {
    // Upload image URL (Cloudinary or local fallback)
    const url = await uploadImage(req.file);

    const targetEventId = eventId ? parseInt(eventId) : null;
    const targetAlbum = albumName ? albumName.trim() : 'General';

    // Insert record
    const [result] = await db.query(
      `INSERT INTO photo_gallery (group_id, event_id, album_name, url, uploaded_by_id)
       VALUES (?, ?, ?, ?, ?)`,
      [groupId, targetEventId, targetAlbum, url, userId]
    );

    return res.status(201).json({
      message: 'Photo uploaded successfully.',
      photo: {
        id: result.insertId,
        groupId,
        eventId: targetEventId,
        albumName: targetAlbum,
        url,
        uploadedById: userId,
        uploader_name: req.user.fullName
      }
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    return res.status(500).json({ message: 'Internal server error uploading image.' });
  }
});

// 3. Delete Photo (Only uploader or group admin)
router.delete('/:groupId/:photoId', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;
  const photoId = req.params.photoId;
  const userId = req.user.id;
  const userRole = req.groupRole; // injected by requireGroupMember

  try {
    // Fetch photo to check ownership
    const [[photo]] = await db.query(
      'SELECT uploaded_by_id FROM photo_gallery WHERE id = ?',
      [photoId]
    );

    if (!photo) {
      return res.status(404).json({ message: 'Photo not found.' });
    }

    if (photo.uploaded_by_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied. You can only delete your own photos.' });
    }

    // Delete from DB (We do not delete from Cloudinary for simplicity of the demonstration, but it could be added)
    await db.query('DELETE FROM photo_gallery WHERE id = ?', [photoId]);

    return res.json({ message: 'Photo deleted successfully.' });
  } catch (error) {
    console.error('Delete photo error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
