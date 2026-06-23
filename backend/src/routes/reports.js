const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../config/db');
const { authenticateJWT, requireGroupMember } = require('../middleware/auth');

const router = express.Router();

// Helper to draw clean table rows in PDFKit
function drawTableRow(doc, y, columns, isHeader = false) {
  const height = 20;
  doc.fontSize(isHeader ? 10 : 9);
  doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica');
  
  if (isHeader) {
    // Gray header background
    doc.fillColor('#F3F4F6');
    doc.rect(50, y - 4, 512, height).fill();
  }
  
  doc.fillColor('#1F2937'); // Charcoal text

  let currentX = 55;
  columns.forEach(col => {
    // Align right if it's a number
    const alignment = col.align || 'left';
    doc.text(col.text.toString(), currentX, y, {
      width: col.width,
      align: alignment
    });
    currentX += col.width + 10;
  });

  // Border line below row
  doc.strokeColor('#E5E7EB');
  doc.lineWidth(0.5);
  doc.moveTo(50, y + height - 4).lineTo(562, y + height - 4).stroke();
  
  return y + height;
}

// 1. Get Group Analytics Data (JSON)
router.get('/:groupId/analytics', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;

  try {
    // A. Contributions Collection Trend
    const [contributions] = await db.query(
      `SELECT c.title, c.due_date, c.amount,
       COALESCE(SUM(CASE WHEN cp.payment_status = 'paid' THEN cp.amount_paid END), 0) AS total_collected,
       COUNT(CASE WHEN cp.payment_status = 'paid' THEN 1 END) AS paid_members_count,
       (SELECT COUNT(*) FROM group_members WHERE group_id = c.group_id) AS total_members
       FROM contributions c
       LEFT JOIN contribution_payments cp ON c.id = cp.contribution_id
       WHERE c.group_id = ?
       GROUP BY c.id
       ORDER BY c.due_date ASC`,
      [groupId]
    );

    // B. Expense Splits Summaries
    const [expenses] = await db.query(
      `SELECT title, total_amount, date FROM expenses 
       WHERE group_id = ? 
       ORDER BY date ASC`,
      [groupId]
    );

    // C. Attendance Trends
    const [attendance] = await db.query(
      `SELECT e.title, e.date,
       COUNT(CASE WHEN ea.status = 'present' THEN 1 END) AS present_count,
       COUNT(CASE WHEN ea.status = 'late' THEN 1 END) AS late_count,
       COUNT(CASE WHEN ea.status = 'absent' THEN 1 END) AS absent_count,
       COUNT(ea.id) AS total_recorded
       FROM events e
       LEFT JOIN event_attendance ea ON e.id = ea.event_id
       WHERE e.group_id = ?
       GROUP BY e.id
       ORDER BY e.date ASC`,
      [groupId]
    );

    // D. Winners counts
    const [winners] = await db.query(
      `SELECT u.full_name AS winner_name, COUNT(wh.id) AS win_count, SUM(wh.amount_won) AS total_won
       FROM winner_history wh
       JOIN users u ON wh.user_id = u.id
       WHERE wh.group_id = ?
       GROUP BY wh.user_id`,
      [groupId]
    );

    // E. Event Analytics
    const [[{ totalEvents }]] = await db.query(
      'SELECT COUNT(*) AS totalEvents FROM events WHERE group_id = ?',
      [groupId]
    );

    const [typeDistribution] = await db.query(
      'SELECT event_type, COUNT(*) AS count FROM events WHERE group_id = ? GROUP BY event_type',
      [groupId]
    );

    const [[{ averageAttendance }]] = await db.query(
      `SELECT COALESCE(AVG(present_or_late_count), 0) AS averageAttendance
       FROM (
         SELECT e.id, COUNT(ea.user_id) AS present_or_late_count
         FROM events e
         JOIN event_attendance ea ON e.id = ea.event_id
         WHERE e.group_id = ? AND ea.status IN ('present', 'late')
         GROUP BY e.id
       ) event_att_counts`,
      [groupId]
    );

    const [[rsvpRate]] = await db.query(
      `SELECT 
         COUNT(CASE WHEN er.responded = 1 THEN 1 END) AS responded_count,
         COUNT(*) AS total_count
       FROM event_rsvps er
       JOIN events e ON er.event_id = e.id
       WHERE e.group_id = ?`,
      [groupId]
    );
    const rsvpParticipationRate = rsvpRate && rsvpRate.total_count > 0
      ? Math.round((rsvpRate.responded_count / rsvpRate.total_count) * 100)
      : 0;

    return res.json({
      contributions,
      expenses,
      attendance,
      winners,
      eventAnalytics: {
        totalEvents,
        typeDistribution,
        averageAttendance: parseFloat(averageAttendance || 0),
        rsvpParticipationRate
      }
    });
  } catch (error) {
    console.error('Fetch analytics error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// 2. Export PDF Report
router.get('/:groupId/export', authenticateJWT, requireGroupMember, async (req, res) => {
  const groupId = req.params.groupId;
  const reportType = req.query.type || 'monthly'; // 'contributions', 'attendance', 'expenses', 'winners', 'monthly'

  try {
    // Fetch group details
    const [[group]] = await db.query('SELECT name, type FROM `groups` WHERE id = ?', [groupId]);
    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    // Initialize PDF Document
    const doc = new PDFDocument({ margin: 50 });

    // Stream PDF to HTTP response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Mehfil_Report_${reportType}_${Date.now()}.pdf"`);
    doc.pipe(res);

    // BRANDING HEADER
    doc.fillColor('#111827') // Deep Charcoal
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('M E H F I L', 50, 50);
       
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#6B7280')
       .text('Premium Community Gatherings & Event Platform', 50, 75);

    // Silver divider line
    doc.strokeColor('#E5E7EB')
       .lineWidth(1.5)
       .moveTo(50, 95)
       .lineTo(562, 95)
       .stroke();

    // REPORT METADATA
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#1F2937')
       .text(`Workspace: ${group.name}`, 50, 115)
       .fontSize(10)
       .font('Helvetica')
       .fillColor('#4B5563')
       .text(`Report Type: ${reportType.toUpperCase()}`, 50, 130)
       .text(`Date Generated: ${new Date().toLocaleDateString()}`, 380, 115, { align: 'right' })
       .text(`Group Mode: ${group.type.toUpperCase()}`, 380, 130, { align: 'right' });

    doc.strokeColor('#E5E7EB')
       .lineWidth(0.5)
       .moveTo(50, 155)
       .lineTo(562, 155)
       .stroke();

    let yPosition = 175;

    // GENERATE REPORT CONTENT BY TYPE
    if (reportType === 'contributions') {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('Contribution Management Summary', 50, yPosition);
      yPosition += 25;

      const [data] = await db.query(
        `SELECT c.title, c.due_date, c.amount,
         COALESCE(SUM(CASE WHEN cp.payment_status = 'paid' THEN cp.amount_paid END), 0) AS total_collected
         FROM contributions c
         LEFT JOIN contribution_payments cp ON c.id = cp.contribution_id
         WHERE c.group_id = ?
         GROUP BY c.id
         ORDER BY c.due_date DESC`,
        [groupId]
      );

      // Define Columns
      const columns = [
        { text: 'Cycle Title', width: 170 },
        { text: 'Due Date', width: 110 },
        { text: 'Target Per Member', width: 110, align: 'right' },
        { text: 'Total Collected', width: 100, align: 'right' }
      ];

      // Draw Header
      yPosition = drawTableRow(doc, yPosition, columns, true);
      yPosition += 5;

      let grandTotalCollected = 0;
      data.forEach(row => {
        grandTotalCollected += parseFloat(row.total_collected);
        yPosition = drawTableRow(doc, yPosition, [
          { text: row.title, width: 170 },
          { text: new Date(row.due_date).toLocaleDateString(), width: 110 },
          { text: `INR ${parseFloat(row.amount).toFixed(2)}`, width: 110, align: 'right' },
          { text: `INR ${parseFloat(row.total_collected).toFixed(2)}`, width: 100, align: 'right' }
        ]);
        yPosition += 5;

        // Page break safety check
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      });

      // Total Summaries
      yPosition += 20;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827');
      doc.text(`Grand Total Collected: INR ${grandTotalCollected.toFixed(2)}`, 50, yPosition, { align: 'right', width: 512 });

    } else if (reportType === 'attendance') {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('Event Attendance Summary', 50, yPosition);
      yPosition += 25;

      const [data] = await db.query(
        `SELECT e.title, e.date, e.venue,
         COUNT(CASE WHEN ea.status = 'present' THEN 1 END) AS present_count,
         COUNT(CASE WHEN ea.status = 'late' THEN 1 END) AS late_count,
         COUNT(CASE WHEN ea.status = 'absent' THEN 1 END) AS absent_count
         FROM events e
         LEFT JOIN event_attendance ea ON e.id = ea.event_id
         WHERE e.group_id = ?
         GROUP BY e.id
         ORDER BY e.date DESC`,
        [groupId]
      );

      const columns = [
        { text: 'Event Title', width: 140 },
        { text: 'Date', width: 80 },
        { text: 'Venue', width: 120 },
        { text: 'Present', width: 50, align: 'right' },
        { text: 'Late', width: 50, align: 'right' },
        { text: 'Absent', width: 50, align: 'right' }
      ];

      yPosition = drawTableRow(doc, yPosition, columns, true);
      yPosition += 5;

      data.forEach(row => {
        yPosition = drawTableRow(doc, yPosition, [
          { text: row.title, width: 140 },
          { text: new Date(row.date).toLocaleDateString(), width: 80 },
          { text: row.venue, width: 120 },
          { text: row.present_count.toString(), width: 50, align: 'right' },
          { text: row.late_count.toString(), width: 50, align: 'right' },
          { text: row.absent_count.toString(), width: 50, align: 'right' }
        ]);
        yPosition += 5;

        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      });

    } else if (reportType === 'expenses') {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('Shared Expenses Breakdown', 50, yPosition);
      yPosition += 25;

      const [data] = await db.query(
        `SELECT e.*, u.full_name AS payer_name
         FROM expenses e
         JOIN users u ON e.paid_by_id = u.id
         WHERE e.group_id = ?
         ORDER BY e.date DESC`,
        [groupId]
      );

      const columns = [
        { text: 'Expense Name', width: 160 },
        { text: 'Payer', width: 120 },
        { text: 'Date', width: 100 },
        { text: 'Total Cost', width: 120, align: 'right' }
      ];

      yPosition = drawTableRow(doc, yPosition, columns, true);
      yPosition += 5;

      let grandTotalExpenses = 0;
      data.forEach(row => {
        grandTotalExpenses += parseFloat(row.total_amount);
        yPosition = drawTableRow(doc, yPosition, [
          { text: row.title, width: 160 },
          { text: row.payer_name, width: 120 },
          { text: new Date(row.date).toLocaleDateString(), width: 100 },
          { text: `INR ${parseFloat(row.total_amount).toFixed(2)}`, width: 120, align: 'right' }
        ]);
        yPosition += 5;

        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      });

      yPosition += 20;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827');
      doc.text(`Total Group Expense: INR ${grandTotalExpenses.toFixed(2)}`, 50, yPosition, { align: 'right', width: 512 });

    } else if (reportType === 'winners' && group.type === 'kitty') {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('Kitty Party Winner & Rotation Logs', 50, yPosition);
      yPosition += 25;

      const [data] = await db.query(
        `SELECT wh.*, u.full_name AS winner_name, uh.full_name AS host_name, kr.cycle_number, kr.draw_type
         FROM winner_history wh
         JOIN users u ON wh.user_id = u.id
         JOIN kitty_rotations kr ON wh.kitty_rotation_id = kr.id
         JOIN users uh ON kr.host_id = uh.id
         WHERE wh.group_id = ?
         ORDER BY kr.cycle_number DESC`,
        [groupId]
      );

      const columns = [
        { text: 'Cycle', width: 45 },
        { text: 'Winner Member', width: 120 },
        { text: 'Host Member', width: 120 },
        { text: 'Prize Draw', width: 100, align: 'right' },
        { text: 'Date Drawn', width: 110, align: 'right' }
      ];

      yPosition = drawTableRow(doc, yPosition, columns, true);
      yPosition += 5;

      data.forEach(row => {
        yPosition = drawTableRow(doc, yPosition, [
          { text: `#${row.cycle_number}`, width: 45 },
          { text: row.winner_name, width: 120 },
          { text: row.host_name, width: 120 },
          { text: `INR ${parseFloat(row.amount_won).toFixed(2)}`, width: 100, align: 'right' },
          { text: new Date(row.won_date).toLocaleDateString(), width: 110, align: 'right' }
        ]);
        yPosition += 5;

        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      });

    } else {
      // MONTHLY / GENERAL REPORT OVERVIEW
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('Group Workspace Summary Overview', 50, yPosition);
      yPosition += 25;

      const [[memberCount]] = await db.query('SELECT COUNT(*) AS count FROM group_members WHERE group_id = ?', [groupId]);
      const [[eventCount]] = await db.query('SELECT COUNT(*) AS count FROM events WHERE group_id = ?', [groupId]);
      const [[totalExpenses]] = await db.query('SELECT COALESCE(SUM(total_amount), 0) AS total FROM expenses WHERE group_id = ?', [groupId]);
      const [[totalCollections]] = await db.query(
        `SELECT COALESCE(SUM(amount_paid), 0) AS total 
         FROM contribution_payments cp
         JOIN contributions c ON cp.contribution_id = c.id
         WHERE c.group_id = ? AND cp.payment_status = 'paid'`,
        [groupId]
      );

      doc.fontSize(10).font('Helvetica');
      doc.text(`Total Active Members: ${memberCount?.count || 0}`, 60, yPosition);
      yPosition += 18;
      doc.text(`Total Events Conducted: ${eventCount?.count || 0}`, 60, yPosition);
      yPosition += 18;
      doc.text(`Total Contributions Collected: INR ${parseFloat(totalCollections?.total || 0).toFixed(2)}`, 60, yPosition);
      yPosition += 18;
      doc.text(`Total Shared Expenses Logged: INR ${parseFloat(totalExpenses?.total || 0).toFixed(2)}`, 60, yPosition);
      
      if (group.type === 'kitty') {
        const [[cyclesDrawn]] = await db.query('SELECT COUNT(*) AS count FROM kitty_rotations WHERE group_id = ?', [groupId]);
        yPosition += 18;
        doc.text(`Kitty Party Rotations Cycles: ${cyclesDrawn?.count || 0}`, 60, yPosition);
      }

      yPosition += 40;
      doc.fontSize(11).font('Helvetica-Bold').text('Recent Activity Feed Summary', 50, yPosition);
      yPosition += 15;

      doc.fontSize(9).font('Helvetica').fillColor('#4B5563');
      doc.text('This PDF represents a current snap-shot output of your community group. Dues split balances must be settled manually in the platform using settle up actions.', 50, yPosition, { width: 500 });
    }

    // FOOTER PAGE NUMBER
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
         .fillColor('#9CA3AF')
         .text(`Page ${i + 1} of ${range.count}`, 50, 750, { align: 'center', width: 512 });
    }

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Internal server error exporting PDF.' });
    }
  }
});

module.exports = router;
