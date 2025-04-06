const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// PostgreSQL connection configuration with SSL settings
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: {
    rejectUnauthorized: false // This allows self-signed certificates
  }
});

// Set search path to public schema on connection
pool.on('connect', (client) => {
  client.query('SET search_path TO public');
});

module.exports = pool;
