// Uses Node's built-in test runner (node --test) so no extra dev
// dependency is needed. Only covers what doesn't require a live
// database: health check, 404 handling, and request validation
// (which runs before any controller touches the DB).
const test = require('node:test');
const assert = require('node:assert');
require('dotenv').config();

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

const app = require('../src/app');

function listen() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function request(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const data = body ? JSON.stringify(body) : null;
    const req = require('http').request(
      { host: 'localhost', port, path, method, headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null }));
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('GET /api/health returns ok', async () => {
  const server = await listen();
  const res = await request(server, 'GET', '/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
  server.close();
});

test('unknown route returns 404', async () => {
  const server = await listen();
  const res = await request(server, 'GET', '/api/does-not-exist');
  assert.strictEqual(res.status, 404);
  server.close();
});

test('POST /api/auth/register rejects a short password before touching the DB', async () => {
  const server = await listen();
  const res = await request(server, 'POST', '/api/auth/register', {
    fullName: 'Test User',
    email: 'test@example.com',
    password: '123'
  });
  assert.strictEqual(res.status, 400);
  assert.match(res.body.error, /password/i);
  server.close();
});

test('POST /api/auth/register rejects an invalid email', async () => {
  const server = await listen();
  const res = await request(server, 'POST', '/api/auth/register', {
    fullName: 'Test User',
    email: 'not-an-email',
    password: 'longenoughpassword'
  });
  assert.strictEqual(res.status, 400);
  assert.match(res.body.error, /email/i);
  server.close();
});

test('protected routes reject requests with no token', async () => {
  const server = await listen();
  const res = await request(server, 'GET', '/api/projects');
  assert.strictEqual(res.status, 401);
  server.close();
});
