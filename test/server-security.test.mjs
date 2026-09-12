import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = new URL('..', import.meta.url);
const workspacePath = fileURLToPath(root);

async function startServer() {
  const dataDirectory = await mkdtemp(join(tmpdir(), 'giftregistry-test-'));
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: workspacePath,
    env: { ...process.env, DATA_DIR: dataDirectory, PORT: '0', NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const port = await new Promise((resolve, reject) => {
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(/localhost:(\d+)/);
      if (match) resolve(Number(match[1]));
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (chunk) => { output += chunk.toString(); });
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`Test server exited with ${code}: ${output}`)));
  });
  return {
    dataDirectory,
    port,
    stop: async () => {
      child.kill();
      await new Promise((resolve) => child.once('exit', resolve));
      await rm(dataDirectory, { recursive: true, force: true });
    },
  };
}

function cookieFrom(response) {
  return response.headers.get('set-cookie')?.split(';', 1)[0] ?? '';
}

async function request(server, path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${server.port}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const text = await response.text();
  let body = {};
  if (text) body = JSON.parse(text);
  return { response, body };
}

async function register(server, name, email) {
  const result = await request(server, '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password: 'correct horse battery staple' }),
  });
  assert.equal(result.response.status, 201);
  return { account: result.body.account, cookie: cookieFrom(result.response) };
}

test('server applies security headers and rejects oversized JSON bodies', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());

  const health = await request(server, '/api/session');
  assert.equal(health.response.status, 200);
  assert.equal(health.response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(health.response.headers.get('x-frame-options'), 'DENY');
  assert.match(health.response.headers.get('content-security-policy') ?? '', /default-src 'self'/);

  const oversized = await request(server, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'a@example.com', password: 'x'.repeat(8 * 1024 * 1024) }),
  });
  assert.equal(oversized.response.status, 413);
});

test('owner cannot access their own shared list and public responses strip guest tokens', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());
  const owner = await register(server, 'Owner', 'owner@example.com');
  const registry = {
    id: 'registry-test',
    listName: 'Test list',
    occasion: 'Birthday',
    ownerName: 'Owner',
    accessCode: 'TEST123',
    categories: [],
    statuses: [],
    gifts: [{ id: 'gift-test', title: 'A gift', dependsOn: [], addedAt: new Date().toISOString() }],
    claims: [{ giftId: 'gift-test', giverId: 'guest-1', giverName: 'Guest', giverMode: 'guest', state: 'claimed', giverToken: 'secret' }],
  };
  const saved = await request(server, '/api/registries', {
    method: 'PUT',
    headers: { Cookie: owner.cookie },
    body: JSON.stringify({ registries: [registry] }),
  });
  assert.equal(saved.response.status, 200);

  const ownList = await request(server, '/api/shared/TEST123', { headers: { Cookie: owner.cookie } });
  assert.equal(ownList.response.status, 403);

  const guestList = await request(server, '/api/shared/TEST123');
  assert.equal(guestList.response.status, 200);
  assert.equal(guestList.body.registry.claims.length, 1);
  assert.equal('giverToken' in guestList.body.registry.claims[0], false);
});

test('admin removal clears account access history', async (t) => {
  const server = await startServer();
  t.after(() => server.stop());
  const owner = await register(server, 'Owner', 'owner@example.com');
  const visitor = await register(server, 'Visitor', 'visitor@example.com');
  const registry = {
    id: 'registry-test',
    listName: 'Test list',
    occasion: 'Birthday',
    ownerName: 'Owner',
    accessCode: 'TEST123',
    categories: [],
    statuses: [],
    gifts: [],
    claims: [],
  };
  await request(server, '/api/registries', {
    method: 'PUT',
    headers: { Cookie: owner.cookie },
    body: JSON.stringify({ registries: [registry] }),
  });
  const accessed = await request(server, '/api/shared/TEST123', { headers: { Cookie: visitor.cookie } });
  assert.equal(accessed.response.status, 200);

  const database = new DatabaseSync(join(server.dataDirectory, 'kindlist.sqlite'));
  database.prepare('UPDATE list_access SET last_accessed_at = ? WHERE account_id = ?').run(new Date(Date.now() - 11 * 60 * 1000).toISOString(), visitor.account.id);
  database.close();

  const before = await request(server, '/api/admin/people', { headers: { Cookie: owner.cookie } });
  assert.equal(before.body.people.some((person) => person.id === visitor.account.id), true);
  const removed = await request(server, `/api/admin/people/${encodeURIComponent(visitor.account.id)}`, {
    method: 'DELETE',
    headers: { Cookie: owner.cookie },
    body: JSON.stringify({ personType: 'account' }),
  });
  assert.equal(removed.response.status, 200);

  const after = await request(server, '/api/admin/people', { headers: { Cookie: owner.cookie } });
  assert.equal(after.body.people.some((person) => person.id === visitor.account.id), false);
});
