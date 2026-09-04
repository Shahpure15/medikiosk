const fs = require('fs');
const path = require('path');
const { pool, query } = require('./index');

async function migrate() {
  console.log('[Migration] Running PostgreSQL database schema setup...');
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await query(schemaSql);
    console.log('[Migration] Schema created successfully with all tables and pg_trgm index!');
  } catch (err) {
    console.error('[Migration Error]', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate();
}

module.exports = migrate;
