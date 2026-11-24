// Creates the database named in TIDB_DATABASE if it does not exist yet.
// Only touches that one database - it never drops or alters anything.
import mysql from 'mysql2/promise';

const { TIDB_HOST, TIDB_PORT, TIDB_USER, TIDB_PASSWORD, TIDB_DATABASE, TIDB_SSL } = process.env;

if (!TIDB_HOST || !TIDB_USER || !TIDB_DATABASE) {
  console.error('Missing TIDB_HOST / TIDB_USER / TIDB_DATABASE in server/.env');
  process.exit(1);
}
if (!/^[A-Za-z0-9_]+$/.test(TIDB_DATABASE)) {
  console.error('TIDB_DATABASE may only contain letters, digits and underscores.');
  process.exit(1);
}

const connection = await mysql.createConnection({
  host: TIDB_HOST,
  port: Number(TIDB_PORT || 4000),
  user: TIDB_USER,
  password: TIDB_PASSWORD,
  ssl: TIDB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
});

await connection.query(`CREATE DATABASE IF NOT EXISTS \`${TIDB_DATABASE}\``);
console.log(`Database "${TIDB_DATABASE}" is ready on ${TIDB_HOST}.`);
await connection.end();
