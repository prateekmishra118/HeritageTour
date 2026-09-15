const oracledb = require('oracledb');
require('dotenv').config();

// Always return query results as plain JS objects instead of arrays
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false;

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT_STRING,
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 1
};

let pool;

/**
 * Initializes the Oracle connection pool.
 * Must be called once when the server starts.
 */
async function initPool() {
  if (pool) {
    return pool;
  }
  pool = await oracledb.createPool(dbConfig);
  return pool;
}

/**
 * Returns a connection checked out from the pool.
 * Caller is responsible for closing the connection in a finally block.
 */
async function getConnection() {
  if (!pool) {
    await initPool();
  }
  return oracledb.getConnection();
}

/**
 * Tests the database connection by running a trivial query.
 * Used at server startup to confirm Oracle is reachable.
 */
async function testConnection() {
  let connection;
  try {
    await initPool();
    connection = await getConnection();
    const result = await connection.execute('SELECT 1 AS OK FROM DUAL');
    return result.rows && result.rows.length > 0;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing test connection:', err.message);
      }
    }
  }
}

/**
 * Gracefully closes the connection pool.
 */
async function closePool() {
  if (pool) {
    await pool.close(10);
    pool = null;
  }
}

module.exports = {
  initPool,
  getConnection,
  testConnection,
  closePool
};
