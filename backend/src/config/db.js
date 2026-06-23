const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mehfil_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection & run migrations
(async () => {
  try {
    const dbName = process.env.DB_NAME || 'mehfil_db';
    const connection = await pool.getConnection();
    console.log('Database pool connection established successfully.');

    console.log('Running dynamic migrations check...');

    // 1. Migrate events table
    const [eventCols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'events'`,
      [dbName]
    );
    const eventColNames = eventCols.map(c => c.COLUMN_NAME.toLowerCase());

    if (!eventColNames.includes('event_type')) {
      console.log('Adding event_type to events table...');
      await connection.query("ALTER TABLE events ADD COLUMN event_type VARCHAR(50) NOT NULL DEFAULT 'Custom Event'");
    }
    if (!eventColNames.includes('rsvp_deadline')) {
      console.log('Adding rsvp_deadline to events table...');
      await connection.query("ALTER TABLE events ADD COLUMN rsvp_deadline DATETIME DEFAULT NULL");
    }
    if (!eventColNames.includes('booking_link')) {
      console.log('Adding booking_link to events table...');
      await connection.query("ALTER TABLE events ADD COLUMN booking_link VARCHAR(2048) DEFAULT NULL");
    }
    if (!eventColNames.includes('additional_fields')) {
      console.log('Adding additional_fields to events table...');
      await connection.query("ALTER TABLE events ADD COLUMN additional_fields TEXT DEFAULT NULL");
    }

    // 2. Migrate event_rsvps table
    const [rsvpCols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'event_rsvps'`,
      [dbName]
    );
    const rsvpColNames = rsvpCols.map(c => c.COLUMN_NAME.toLowerCase());
    if (!rsvpColNames.includes('responded')) {
      console.log('Adding responded to event_rsvps table...');
      await connection.query("ALTER TABLE event_rsvps ADD COLUMN responded BOOLEAN NOT NULL DEFAULT FALSE");
    }

    // 3. Migrate polls table type column
    const [[pollTypeCol]] = await connection.query(
      `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'polls' AND COLUMN_NAME = 'type'`,
      [dbName]
    );
    if (pollTypeCol && pollTypeCol.DATA_TYPE.toLowerCase() === 'enum') {
      console.log('Modifying type column in polls from ENUM to VARCHAR(50)...');
      await connection.query("ALTER TABLE polls MODIFY COLUMN type VARCHAR(50) NOT NULL DEFAULT 'other'");
    }

    console.log('Database migrations completed successfully.');
    connection.release();
  } catch (err) {
    console.error('Database connection or migration failed. Please ensure MySQL is running.');
    console.error(err.message);
  }
})();

module.exports = pool;
