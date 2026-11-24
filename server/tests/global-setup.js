// Prepares a separate "<db>_test" database so tests never touch real data.
import { execSync } from 'node:child_process';
import path from 'node:path';
import mysql from 'mysql2/promise';

export default async function setup() {
  const serverDir = path.resolve(__dirname, '..');
  try {
    process.loadEnvFile(path.join(serverDir, '.env'));
  } catch {
    /* env may already be provided by the shell / CI */
  }

  const url = new URL(process.env.DATABASE_URL);
  const testDb = `${url.pathname.slice(1)}_test`;
  url.pathname = `/${testDb}`;
  const testUrl = url.toString();

  const conn = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: url.searchParams.get('sslaccept') ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${testDb}\``);
  await conn.end();

  execSync('npx prisma db push --skip-generate', {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'pipe',
  });

  // Test workers inherit this.
  process.env.DATABASE_URL = testUrl;
  process.env.AUTH_RATE_LIMIT = '1000';
  process.env.NODE_ENV = 'test';
}
