const express = require('express');
const db = require('../config/db');
const { authenticateJWT, requireGroupMember, requireGroupAdmin } = require('../middleware/auth');

const router = express.Router();

// 1. Get All Group Expenses
router.get('/:groupId', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;

  try {
    const [expenses] = await db.query(
      `SELECT e.*, u.full_name AS payer_name, u.profile_picture_url AS payer_avatar
       FROM expenses e
       JOIN users u ON e.paid_by_id = u.id
       WHERE e.group_id = ?
       ORDER BY e.date DESC, e.created_at DESC`,
      [groupId]
    );

    // Fetch splits for all expenses
    const [splits] = await db.query(
      `SELECT es.*, u.full_name AS member_name
       FROM expense_splits es
       JOIN users u ON es.user_id = u.id
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.group_id = ?`,
      [groupId]
    );

    // Map splits to their expenses
    const expensesWithSplits = expenses.map(exp => {
      return {
        ...exp,
        splits: splits.filter(s => s.expense_id === exp.id)
      };
    });

    return res.json(expensesWithSplits);
  } catch (error) {
    console.error('Fetch expenses error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 2. Add Expense with Splits
router.post('/:groupId', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;
  const { title, totalAmount, paidById, date, splits } = req.body; // splits is optional array of { userId, shareAmount }

  if (!title || !totalAmount || !paidById || !date) {
    return res.status(400).json({ message: 'Title, Amount, Paid By, and Date are required.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Create expense
    const [expResult] = await connection.query(
      'INSERT INTO expenses (group_id, title, total_amount, paid_by_id, date) VALUES (?, ?, ?, ?, ?)',
      [groupId, title, totalAmount, paidById, date]
    );
    const expenseId = expResult.insertId;

    // 2. Fetch all members if splits are not provided (default: split equally among all members)
    let finalSplits = [];
    if (splits && Array.isArray(splits) && splits.length > 0) {
      finalSplits = splits;
    } else {
      const [members] = await connection.query(
        'SELECT user_id FROM group_members WHERE group_id = ?',
        [groupId]
      );
      const equalShare = totalAmount / members.length;
      finalSplits = members.map(m => ({
        userId: m.user_id,
        shareAmount: equalShare
      }));
    }

    // 3. Write splits
    const splitValues = finalSplits.map(s => [
      expenseId,
      s.userId,
      s.shareAmount,
      // If user paid for it and they split it with themselves, mark their own share as settled or not?
      // For simplicity, splits are unsettled until settles up.
      false
    ]);

    await connection.query(
      'INSERT INTO expense_splits (expense_id, user_id, share_amount, is_settled) VALUES ?',
      [splitValues]
    );

    await connection.commit();
    return res.status(201).json({ message: 'Expense created successfully.', expenseId });
  } catch (error) {
    await connection.rollback();
    console.error('Create expense error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  } finally {
    connection.release();
  }
});

// 3. Get Member Balances and Simplified Transactions (Debt Settlements)
router.get('/:groupId/balances', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;

  try {
    // A. Fetch all group members
    const [members] = await db.query(
      `SELECT u.id, u.full_name, u.profile_picture_url
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?`,
      [groupId]
    );

    const balances = {};
    members.forEach(m => {
      balances[m.id] = {
        id: m.id,
        fullName: m.full_name,
        profilePictureUrl: m.profile_picture_url,
        paid: 0.00,
        owed: 0.00,
        net: 0.00
      };
    });

    // B. Fetch all unsettled expenses & splits
    const [unsettledSplits] = await db.query(
      `SELECT es.user_id, es.share_amount, e.paid_by_id, e.total_amount, e.id AS expense_id
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.group_id = ? AND es.is_settled = FALSE`,
      [groupId]
    );

    // Compute net balance for each member
    // A user gains credit when they pay for an expense, and owes debit when they share an expense.
    unsettledSplits.forEach(split => {
      const debtorId = split.user_id;
      const creditorId = split.paid_by_id;
      const amount = parseFloat(split.share_amount);

      if (balances[debtorId]) {
        balances[debtorId].owed += amount;
        balances[debtorId].net -= amount;
      }
      if (balances[creditorId]) {
        // We only add to paid if the debtor isn't the creditor themselves
        if (debtorId !== creditorId) {
          balances[creditorId].paid += amount;
          balances[creditorId].net += amount;
        }
      }
    });

    // C. Run Simplify Debts algorithm
    const participants = Object.values(balances).map(b => ({
      id: b.id,
      fullName: b.fullName,
      profilePictureUrl: b.profilePictureUrl,
      net: parseFloat(b.net.toFixed(2))
    }));

    const debtors = participants.filter(p => p.net < -0.01).sort((a, b) => a.net - b.net); // most negative first
    const creditors = participants.filter(p => p.net > 0.01).sort((a, b) => b.net - a.net); // most positive first

    const transactions = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const debtAmount = Math.abs(debtor.net);
      const creditAmount = creditor.net;

      const settledAmount = Math.min(debtAmount, creditAmount);

      transactions.push({
        from: debtor.id,
        fromName: debtor.fullName,
        to: creditor.id,
        toName: creditor.fullName,
        amount: parseFloat(settledAmount.toFixed(2))
      });

      debtor.net += settledAmount;
      creditor.net -= settledAmount;

      if (Math.abs(debtor.net) < 0.01) dIdx++;
      if (Math.abs(creditor.net) < 0.01) cIdx++;
    }

    return res.json({
      memberBalances: Object.values(balances),
      suggestedSettlements: transactions
    });
  } catch (error) {
    console.error('Fetch balances error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 4. Settle Up (Marks splits as settled between a debtor and creditor)
router.post('/:groupId/settle-up', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;
  const { debtorId, creditorId, amount } = req.body;

  if (!debtorId || !creditorId || !amount) {
    return res.status(400).json({ message: 'Debtor, Creditor, and Amount are required.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Fetch unsettled splits where user_id = debtorId and expense paid_by_id = creditorId
    const [splits] = await connection.query(
      `SELECT es.id, es.share_amount 
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.group_id = ? AND es.user_id = ? AND e.paid_by_id = ? AND es.is_settled = FALSE
       ORDER BY e.date ASC`,
      [groupId, debtorId, creditorId]
    );

    let remainingSettleAmount = parseFloat(amount);
    
    // Mark splits as settled until the amount is satisfied
    for (const split of splits) {
      if (remainingSettleAmount <= 0) break;

      const splitShare = parseFloat(split.share_amount);

      if (remainingSettleAmount >= splitShare - 0.01) {
        // Settle this split completely
        await connection.query(
          'UPDATE expense_splits SET is_settled = TRUE WHERE id = ?',
          [split.id]
        );
        remainingSettleAmount -= splitShare;
      } else {
        // Partially settle by updating amount, or just settle it anyway.
        // For standard full settles, we mark it settled.
        await connection.query(
          'UPDATE expense_splits SET is_settled = TRUE WHERE id = ?',
          [split.id]
        );
        remainingSettleAmount = 0;
      }
    }

    await connection.commit();
    return res.json({ message: 'Settlement completed successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Settle up error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  } finally {
    connection.release();
  }
});

module.exports = router;
