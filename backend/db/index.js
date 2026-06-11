const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // maximum 20 connections
  idleTimeoutMillis: 30000,  // close idle connections after 30s
  connectionTimeoutMillis: 2000, // fail fast if can't connect in 2s
});

pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL successfully!'))
  .catch(err => console.error('❌ Database connection error:', err));

module.exports = pool;