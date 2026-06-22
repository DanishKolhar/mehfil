const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function setup() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'Blender2.8';
  const database = process.env.DB_NAME || 'mehfil_db';

  console.log(`Connecting to MySQL server at ${host} as ${user}...`);

  let connection;
  try {
    // Connect without database first to ensure it exists
    connection = await mysql.createConnection({
      host,
      user,
      password
    });

    console.log(`Dropping database ${database} if exists to ensure clean setup...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\`;`);

    console.log(`Creating database ${database}...`);
    await connection.query(`CREATE DATABASE \`${database}\`;`);
    await connection.query(`USE \`${database}\`;`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`Reading schema definition from ${schemaPath}...`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Clean single-line comments and split by semicolon
    const cleanedSql = schemaSql
      .split('\n')
      .map(line => line.trim())
      .filter(line => !line.startsWith('--') && !line.startsWith('#'))
      .join('\n');

    const statements = cleanedSql
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Executing ${statements.length} SQL statements...`);
    for (const statement of statements) {
      // Basic check to see if it's a valid statement
      if (statement.toUpperCase().startsWith('CREATE') || statement.toUpperCase().startsWith('USE')) {
        await connection.query(statement);
      }
    }

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setup();
