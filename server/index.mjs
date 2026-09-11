import { createServer } from 'node:http';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = join(root, 'data');
mkdirSync(dataDirectory, { recursive: true });
const database = new DatabaseSync(join(dataDirectory, 'kindlist.sqlite'));
const port = Number(process.env.PORT ?? 3001);
const isProduction = process.env.NODE_ENV === 'production';

database.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    avatar_url TEXT, password_hash TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS registries (
    id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    data TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS saved_lists (
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    registry_id TEXT NOT NULL,
    access_code TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (account_id, registry_id)
  );
`);

const statements = {
  accountById: database.prepare('SELECT id, name, email, avatar_url AS avatarUrl FROM accounts WHERE id = ?'),
  accountByEmail: database.prepare('SELECT * FROM accounts WHERE email = ?'),
  createAccount: database.prepare('INSERT INTO accounts (id, name, email, avatar_url, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
  updateAccount: database.prepare('UPDATE accounts SET name = ?, email = ?, avatar_url = ?, password_hash = ? WHERE id = ?'),
  registries: database.prepare('SELECT data FROM registries WHERE account_id = ? ORDER BY updated_at ASC'),
  replaceRegistry: database.prepare('INSERT INTO registries (id, account_id, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'),
  deleteRegistries: database.prepare('DELETE FROM registries WHERE account_id = ?'),
  session: database.prepare('SELECT account_id, expires_at FROM sessions WHERE token_hash = ?'),
  createSession: database.prepare('INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)'),
  deleteSession: database.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  savedLists: database.prepare('SELECT registry_id, access_code FROM saved_lists WHERE account_id = ? ORDER BY created_at ASC'),
  saveList: database.prepare('INSERT OR IGNORE INTO saved_lists (account_id, registry_id, access_code, created_at) VALUES (?, ?, ?, ?)'),
  deleteSavedList: database.prepare('DELETE FROM saved_lists WHERE account_id = ? AND access_code = ?'),
  sharedRegistries: database.prepare('SELECT id, account_id, data FROM registries'),
  updateRegistry: database.prepare('UPDATE registries SET data = ?, updated_at = ? WHERE id = ? AND account_id = ?'),
};

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function accountFromRow(row) {
  const avatarUrl = row.avatarUrl ?? row.avatar_url;
  return { id: row.id, name: row.name, email: row.email, ...(avatarUrl ? { avatarUrl } : {}) };
}

function readBody(request) {
  return new Promise((resolveBody, reject) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try { resolveBody(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON body.')); }
    });
    request.on('error', reject);
  });
}

function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function passwordsMatch(password, storedHash) {
  const [salt, expected] = storedHash.split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function tokenHash(token) { return createHash('sha256').update(token).digest('hex'); }

function sessionToken(request) {
  const match = (request.headers.cookie ?? '').match(/(?:^|; )kindlist_session=([^;]+)/);
  return match?.[1] ?? '';
}

function authenticatedAccount(request) {
  const token = sessionToken(request);
  if (!token) return null;
  const hash = tokenHash(token);
  const session = statements.session.get(hash);
  if (!session || session.expires_at < Date.now()) {
    if (session) statements.deleteSession.run(hash);
    return null;
  }
  const account = statements.accountById.get(session.account_id);
  return account ? accountFromRow(account) : null;
}

function requireAccount(request, response) {
  const account = authenticatedAccount(request);
  if (!account) json(response, 401, { error: 'You must be signed in.' });
  return account;
}

function setSession(response, accountId) {
  const token = randomBytes(32).toString('hex');
  statements.createSession.run(tokenHash(token), accountId, Date.now() + 1000 * 60 * 60 * 24 * 30);
  response.setHeader('Set-Cookie', `kindlist_session=${token}; HttpOnly; Path=/; SameSite=Lax${isProduction ? '; Secure' : ''}`);
}

function findSharedRegistry(accessCode) {
  for (const row of statements.sharedRegistries.all()) {
    const registry = JSON.parse(row.data);
    if (registry.accessCode === accessCode) {
      const owner = statements.accountById.get(row.account_id);
      return { row, registry: { ...registry, ...(owner?.avatarUrl ? { ownerAvatarUrl: owner.avatarUrl } : {}) } };
    }
  }
  return null;
}

function publicRegistry(registry) {
  return {
    ...registry,
    claims: (registry.claims ?? []).map((claim) => {
      const publicClaim = { ...claim };
      delete publicClaim.giverToken;
      return publicClaim;
    }),
  };
}

function claimNameKey(name) {
  return String(name || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function updateClaim(registry, giftId, profile, state) {
  const claims = registry.claims ?? [];
  const thisGiftClaims = claims.filter((claim) => claim.giftId === giftId);
  const profileNameKey = claimNameKey(profile.displayName || 'Guest');
  if (state === null) {
    const ownClaims = thisGiftClaims.filter((claim) => claimNameKey(claim.giverName) === profileNameKey);
    const ownClaim = ownClaims.find((claim) => claim.state === 'claimed') ?? ownClaims[0];
    const canClearClaim = Boolean(ownClaim);
    if (!canClearClaim) return registry;
    return {
      ...registry,
      claims: [
        ...claims.filter((claim) => claim.giftId !== giftId),
        ...thisGiftClaims.filter((claim) => claim !== ownClaim),
      ],
    };
  }
  if (thisGiftClaims.some((claim) => claim.state === 'claimed' && claimNameKey(claim.giverName) !== profileNameKey)) return registry;
  const nextClaim = {
    giftId,
    giverId: String(profile.id || `guest-${randomUUID()}`),
    state,
    giverName: String(profile.displayName || 'Guest').trim(),
    giverMode: profile.mode === 'account' ? 'account' : 'guest',
    ...(profile.avatarUrl ? { giverAvatarUrl: profile.avatarUrl } : {}),
    ...(profile.mode !== 'account' && profile.claimToken ? { giverToken: profile.claimToken } : {}),
  };
  const retainedGiftClaims = state === 'considering'
    ? thisGiftClaims.filter((claim) => claimNameKey(claim.giverName) !== profileNameKey)
    : thisGiftClaims.filter((claim) => claim.state === 'considering');
  return {
    ...registry,
    claims: [
      ...claims.filter((claim) => claim.giftId !== giftId),
      ...retainedGiftClaims,
      nextClaim,
    ],
  };
}

async function handleApi(request, response, path) {
  if (request.method === 'GET' && path === '/api/session') {
    return json(response, 200, { account: authenticatedAccount(request) });
  }
  if (request.method === 'POST' && (path === '/api/auth/register' || path === '/api/auth/login')) {
    const body = await readBody(request);
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    if (!email || !password || (path.endsWith('register') && !String(body.name ?? '').trim())) {
      return json(response, 400, { error: 'Name, email, and password are required.' });
    }
    const existing = statements.accountByEmail.get(email);
    if (path.endsWith('register')) {
      if (existing) return json(response, 409, { error: 'An account with that email already exists.' });
      const account = { id: randomUUID(), name: String(body.name).trim(), email };
      statements.createAccount.run(account.id, account.name, account.email, null, passwordHash(password), new Date().toISOString());
      setSession(response, account.id);
      return json(response, 201, { account });
    }
    if (!existing || !passwordsMatch(password, existing.password_hash)) {
      return json(response, 401, { error: 'The email or password is incorrect.' });
    }
    const account = accountFromRow(existing);
    setSession(response, account.id);
    return json(response, 200, { account });
  }
  if (request.method === 'POST' && path === '/api/auth/logout') {
    const token = sessionToken(request);
    if (token) statements.deleteSession.run(tokenHash(token));
    response.setHeader('Set-Cookie', 'kindlist_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
    return json(response, 200, { ok: true });
  }

  const sharedMatch = path.match(/^\/api\/shared\/([^/]+)(?:\/claims)?$/);
  if (sharedMatch) {
    const accessCode = decodeURIComponent(sharedMatch[1]).trim().toUpperCase();
    const shared = findSharedRegistry(accessCode);
    if (!shared) return json(response, 404, { error: 'That shared list could not be found.' });
    const signedInAccount = authenticatedAccount(request);
    if (signedInAccount?.id === shared.row.account_id) {
      return json(response, 403, { error: 'List owners cannot open their own shared list.' });
    }
    if (request.method === 'GET' && path === `/api/shared/${sharedMatch[1]}`) {
      return json(response, 200, { registry: publicRegistry(shared.registry) });
    }
    if (request.method === 'PATCH' && path.endsWith('/claims')) {
      const body = await readBody(request);
      const giftExists = shared.registry.gifts.some((gift) => gift.id === body.giftId);
      if (!giftExists || !body.profile || (body.state !== null && !['considering', 'claimed'].includes(body.state))) {
        return json(response, 400, { error: 'That claim is not valid.' });
      }
      if (body.profile.mode === 'account' && (!signedInAccount || signedInAccount.id !== body.profile.id)) {
        return json(response, 403, { error: 'Sign in to use your account identity.' });
      }
      const profile = signedInAccount
        ? { ...body.profile, id: signedInAccount.id, mode: 'account', displayName: signedInAccount.name, avatarUrl: signedInAccount.avatarUrl }
        : { ...body.profile, mode: 'guest' };
      const nextRegistry = updateClaim(shared.registry, body.giftId, profile, body.state);
      statements.updateRegistry.run(JSON.stringify(nextRegistry), new Date().toISOString(), shared.row.id, shared.row.account_id);
      return json(response, 200, { registry: publicRegistry(nextRegistry) });
    }
  }

  const account = requireAccount(request, response);
  if (!account) return;
  if (request.method === 'GET' && path === '/api/registries') {
    const registries = statements.registries.all(account.id).map((row) => JSON.parse(row.data));
    return json(response, 200, { registries });
  }
  if (request.method === 'PUT' && path === '/api/registries') {
    const body = await readBody(request);
    const registries = Array.isArray(body.registries) ? body.registries : [];
    const existingRegistries = new Map(
      statements.registries.all(account.id).map((row) => {
        const registry = JSON.parse(row.data);
        return [registry.id, registry];
      }),
    );
    const registriesToPersist = registries.map((registry) => {
      const existingRegistry = existingRegistries.get(registry.id);
      if (!existingRegistry) return registry;
      const giftIds = new Set(registry.gifts.map((gift) => gift.id));
      return {
        ...registry,
        claims: (existingRegistry.claims ?? []).filter((claim) => giftIds.has(claim.giftId)),
      };
    });
    const timestamp = new Date().toISOString();
    database.exec('BEGIN');
    try {
      statements.deleteRegistries.run(account.id);
      for (const registry of registriesToPersist) statements.replaceRegistry.run(registry.id, account.id, JSON.stringify(registry), timestamp);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
    return json(response, 200, { registries: registriesToPersist });
  }
  if (request.method === 'GET' && path === '/api/saved-lists') {
    const registries = statements.savedLists.all(account.id)
      .map((savedList) => {
        const registry = findSharedRegistry(savedList.access_code)?.registry;
        return registry ? publicRegistry(registry) : null;
      })
      .filter(Boolean);
    return json(response, 200, { registries });
  }
  if (request.method === 'POST' && path === '/api/saved-lists') {
    const body = await readBody(request);
    const accessCode = String(body.accessCode ?? '').trim().toUpperCase();
    const shared = findSharedRegistry(accessCode);
    if (!shared) return json(response, 404, { error: 'That shared list could not be found.' });
    if (shared.row.account_id === account.id) return json(response, 403, { error: 'You cannot save your own list as a shared list.' });
    statements.saveList.run(account.id, shared.row.id, shared.registry.accessCode, new Date().toISOString());
    return json(response, 200, { registry: shared.registry });
  }
  const savedListMatch = path.match(/^\/api\/saved-lists\/([^/]+)$/);
  if (request.method === 'DELETE' && savedListMatch) {
    statements.deleteSavedList.run(account.id, decodeURIComponent(savedListMatch[1]).trim().toUpperCase());
    return json(response, 200, { ok: true });
  }
  if (request.method === 'PATCH' && path === '/api/profile') {
    const body = await readBody(request);
    const details = body.details ?? {};
    const name = String(details.name ?? '').trim();
    const email = String(details.email ?? '').trim().toLowerCase();
    if (!name || !email) return json(response, 400, { error: 'Name and email are required.' });
    const duplicate = statements.accountByEmail.get(email);
    if (duplicate && duplicate.id !== account.id) return json(response, 409, { error: 'An account with that email already exists.' });
    const stored = statements.accountByEmail.get(account.email);
    let nextPasswordHash = stored.password_hash;
    if (details.newPassword) {
      if (!details.currentPassword || !passwordsMatch(details.currentPassword, stored.password_hash)) return json(response, 400, { error: 'Your current password is incorrect.' });
      if (String(details.newPassword).length < 8) return json(response, 400, { error: 'Your new password must be at least 8 characters.' });
      nextPasswordHash = passwordHash(String(details.newPassword));
    }
    const avatarUrl = String(details.avatarUrl ?? '');
    statements.updateAccount.run(name, email, avatarUrl || null, nextPasswordHash, account.id);
    return json(response, 200, { account: { id: account.id, name, email, ...(avatarUrl ? { avatarUrl } : {}) } });
  }
  json(response, 404, { error: 'Not found.' });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    try { await handleApi(request, response, url.pathname); }
    catch (error) {
      console.error(error);
      if (!response.headersSent) json(response, 500, { error: 'The server could not complete that request.' });
    }
    return;
  }
  const filePath = url.pathname === '/' ? join(root, 'dist', 'index.html') : join(root, 'dist', url.pathname);
  if (existsSync(filePath)) {
    const contentType = filePath.endsWith('.html') ? 'text/html; charset=utf-8' : filePath.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(readFileSync(filePath));
  } else {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(port, () => console.log(`kindlist server listening on http://localhost:${port}`));