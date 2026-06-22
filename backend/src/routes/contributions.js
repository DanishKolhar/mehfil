const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../config/db');
const { authenticateJWT, requireGroupMember, requireGroupAdmin } = require('../middleware/auth');

const router = express.Router();

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpayInstance = null;
if (razorpayKeyId && razorpayKeySecret) {
  try {
    razorpayInstance = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret
    });
    console.log('Razorpay Service Configured.');
  } catch (error) {
    console.error('Failed to initialize Razorpay SDK:', error);
  }
} else {
  console.log('Razorpay keys missing. Running payments in Mock Sandbox Mode.');
}

// 1. Get Group Contributions (Track paid/pending)
router.get('/:groupId', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;

  try {
    // Fetch all contributions
    const [contributions] = await db.query(
      `SELECT c.*,
       (SELECT COUNT(*) FROM group_members WHERE group_id = c.group_id) AS total_members,
       (SELECT COUNT(*) FROM contribution_payments WHERE contribution_id = c.id AND payment_status = 'paid') AS paid_count
       FROM contributions c
       WHERE c.group_id = ?
       ORDER BY c.due_date DESC`,
      [groupId]
    );

    return res.json(contributions);
  } catch (error) {
    console.error('Fetch contributions error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 2. Create Contribution Cycle (Admin only)
router.post('/:groupId', authenticateJWT, requireGroupAdmin, async (req, res) => {
  const groupId = req.params.groupId;
  const { title, amount, dueDate } = req.body;

  if (!title || !amount || !dueDate) {
    return res.status(400).json({ message: 'Title, Amount, and Due Date are required.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Create contribution
    const [result] = await connection.query(
      'INSERT INTO contributions (group_id, title, amount, due_date) VALUES (?, ?, ?, ?)',
      [groupId, title, amount, dueDate]
    );
    const contributionId = result.insertId;

    // Create pending payment records for all active group members
    const [members] = await connection.query(
      'SELECT user_id FROM group_members WHERE group_id = ?',
      [groupId]
    );

    if (members.length > 0) {
      const paymentValues = members.map(m => [contributionId, m.user_id, 'pending', 'razorpay', 0.00]);
      await connection.query(
        'INSERT IGNORE INTO contribution_payments (contribution_id, user_id, payment_status, payment_method, amount_paid) VALUES ?',
        [paymentValues]
      );
    }

    await connection.commit();
    return res.status(201).json({
      message: 'Contribution cycle created successfully.',
      contributionId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create contribution error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  } finally {
    connection.release();
  }
});

// 3. Get Single Contribution with Member Payment Breakdowns
router.get('/:groupId/details/:contributionId', authenticateJWT, requireGroupMember, async (req, res) => {
  const contributionId = req.params.contributionId;

  try {
    const [[contribution]] = await db.query(
      'SELECT * FROM contributions WHERE id = ?',
      [contributionId]
    );

    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found.' });
    }

    const [payments] = await db.query(
      `SELECT cp.id AS payment_id, cp.amount_paid, cp.payment_status, cp.payment_method, cp.paid_at,
       u.id AS user_id, u.full_name, u.email, u.profile_picture_url
       FROM contribution_payments cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.contribution_id = ?`,
      [contributionId]
    );

    return res.json({
      contribution,
      payments
    });
  } catch (error) {
    console.error('Fetch contribution details error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 4. Create Razorpay Order (Any member who has pending status)
router.post('/:groupId/pay/:contributionId', authenticateJWT, requireGroupMember, async (req, res) => {
  const contributionId = req.params.contributionId;
  const userId = req.user.id;

  try {
    // 1. Get contribution details
    const [[contribution]] = await db.query(
      'SELECT * FROM contributions WHERE id = ?',
      [contributionId]
    );

    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found.' });
    }

    // 2. Check if already paid
    const [[payment]] = await db.query(
      'SELECT * FROM contribution_payments WHERE contribution_id = ? AND user_id = ?',
      [contributionId, userId]
    );

    if (payment && payment.payment_status === 'paid') {
      return res.status(400).json({ message: 'You have already paid this contribution.' });
    }

    const amountInPaise = Math.round(contribution.amount * 100);

    // Create Order
    if (razorpayInstance) {
      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_c_${contributionId}_u_${userId}_${Date.now()}`
      };

      const order = await razorpayInstance.orders.create(options);

      // Save order_id in db
      await db.query(
        `INSERT INTO contribution_payments (contribution_id, user_id, amount_paid, payment_status, razorpay_order_id)
         VALUES (?, ?, ?, 'pending', ?)
         ON DUPLICATE KEY UPDATE razorpay_order_id = ?`,
        [contributionId, userId, contribution.amount, order.id, order.id]
      );

      return res.json({
        mock: false,
        keyId: razorpayKeyId,
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        contributionName: contribution.title
      });
    } else {
      // Mock order generation for local tests
      const mockOrderId = `order_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      await db.query(
        `INSERT INTO contribution_payments (contribution_id, user_id, amount_paid, payment_status, razorpay_order_id)
         VALUES (?, ?, ?, 'pending', ?)
         ON DUPLICATE KEY UPDATE razorpay_order_id = ?`,
        [contributionId, userId, contribution.amount, mockOrderId, mockOrderId]
      );

      return res.json({
        mock: true,
        keyId: 'mock_key_id',
        orderId: mockOrderId,
        amount: amountInPaise,
        currency: 'INR',
        contributionName: contribution.title
      });
    }
  } catch (error) {
    console.error('Create payment order error:', error);
    return res.status(500).json({ message: 'Internal server error processing payment order.' });
  }
});

// 5. Verify Razorpay Payment or Mock Payment
router.post('/:groupId/verify/:contributionId', authenticateJWT, requireGroupMember, async (req, res) => {
  const contributionId = req.params.contributionId;
  const userId = req.user.id;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mock_success } = req.body;

  try {
    // 1. Get payment record
    const [[payment]] = await db.query(
      'SELECT * FROM contribution_payments WHERE contribution_id = ? AND user_id = ?',
      [contributionId, userId]
    );

    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }

    if (payment.payment_status === 'paid') {
      return res.json({ message: 'Payment verified successfully (already processed).', status: 'paid' });
    }

    if (razorpayInstance) {
      // Real Verification
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: 'Missing payment signature verification parameters.' });
      }

      const generatedSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature === razorpay_signature) {
        // Success
        await db.query(
          `UPDATE contribution_payments 
           SET payment_status = 'paid', razorpay_payment_id = ?, razorpay_signature = ?, paid_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [razorpay_payment_id, razorpay_signature, payment.id]
        );
        return res.json({ message: 'Payment verified successfully.', status: 'paid' });
      } else {
        // Failed
        await db.query(
          "UPDATE contribution_payments SET payment_status = 'failed' WHERE id = ?",
          [payment.id]
        );
        return res.status(400).json({ message: 'Invalid payment signature.' });
      }
    } else {
      // Mock Sandbox Verification
      if (mock_success === false) {
        await db.query(
          "UPDATE contribution_payments SET payment_status = 'failed' WHERE id = ?",
          [payment.id]
        );
        return res.status(400).json({ message: 'Mock payment failed.' });
      }

      const dummyPaymentId = razorpay_payment_id || `pay_mock_${Date.now()}`;
      await db.query(
        `UPDATE contribution_payments 
         SET payment_status = 'paid', razorpay_payment_id = ?, paid_at = CURRENT_TIMESTAMP, payment_method = 'manual'
         WHERE id = ?`,
        [dummyPaymentId, payment.id]
      );
      return res.json({ message: 'Mock payment successfully approved.', status: 'paid' });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ message: 'Internal server error verifying payment.' });
  }
});

// 6. Record Manual Offline Payment (Admin only override)
router.post('/:groupId/manual-pay/:contributionId', authenticateJWT, requireGroupAdmin, async (req, res) => {
  const contributionId = req.params.contributionId;
  const { memberId } = req.body;

  if (!memberId) {
    return res.status(400).json({ message: 'Member ID is required.' });
  }

  try {
    const [[contribution]] = await db.query(
      'SELECT amount FROM contributions WHERE id = ?',
      [contributionId]
    );

    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found.' });
    }

    await db.query(
      `INSERT INTO contribution_payments (contribution_id, user_id, amount_paid, payment_status, payment_method, paid_at)
       VALUES (?, ?, ?, 'paid', 'manual', CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE payment_status = 'paid', payment_method = 'manual', amount_paid = ?, paid_at = CURRENT_TIMESTAMP`,
      [contributionId, memberId, contribution.amount, contribution.amount]
    );

    return res.json({ message: 'Manual payment logged successfully.' });
  } catch (error) {
    console.error('Manual payment error:', error);
    return res.status(500).json({ message: 'Internal server error logging offline payment.' });
  }
});

module.exports = router;
