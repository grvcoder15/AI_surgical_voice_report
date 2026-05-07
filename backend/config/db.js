const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error(`Unexpected error on idle client: ${err}`);
});

const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.info(`Executed query in ${duration}ms`);
    return result;
  } catch (error) {
    logger.error(`Query error: ${error.message}`);
    throw error;
  }
};

const getClient = async () => {
  return pool.connect();
};

const close = async () => {
  await pool.end();
  logger.info('Connection pool closed');
};

module.exports = {
  query,
  getClient,
  pool,
  close,
};
