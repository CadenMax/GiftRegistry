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
  CREATE TABLE IF NOT EXISTS list_access (
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    registry_id TEXT NOT NULL,
    access_code TEXT NOT NULL,
    last_accessed_at TEXT NOT NULL,
    PRIMARY KEY (account_id, registry_id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, sender_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    registry_id TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL, read_at TEXT
  );
  CREATE TABLE IF NOT EXISTS guest_messages (
    id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, sender_name TEXT NOT NULL,
    recipient_id TEXT NOT NULL, recipient_name TEXT NOT NULL, registry_id TEXT NOT NULL,
    body TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    registry_id TEXT, gift_id TEXT, type TEXT NOT NULL, title TEXT NOT NULL,
    body TEXT NOT NULL, created_at TEXT NOT NULL, read_at TEXT
  );
    CREATE TABLE IF NOT EXISTS guest_notifications (
      id TEXT PRIMARY KEY, profile_id TEXT NOT NULL, profile_token TEXT NOT NULL,
      registry_id TEXT, gift_id TEXT, type TEXT NOT NULL, title TEXT NOT NULL,
      body TEXT NOT NULL, created_at TEXT NOT NULL, read_at TEXT
    );
    CREATE TABLE IF NOT EXISTS guest_profiles (
      registry_id TEXT NOT NULL, profile_id TEXT NOT NULL, profile_token TEXT NOT NULL,
      display_name TEXT NOT NULL, avatar_url TEXT, last_seen_at TEXT NOT NULL,
      PRIMARY KEY (registry_id, profile_id)
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY, registry_id TEXT NOT NULL, title TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL, member_name TEXT NOT NULL, member_type TEXT NOT NULL,
      member_token TEXT, left_at TEXT, PRIMARY KEY (conversation_id, member_id)
    );
`);

for (const table of ['messages', 'guest_messages']) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((column) => column.name === 'conversation_id')) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN conversation_id TEXT`);
  }
}

const statements = {
  accountById: database.prepare('SELECT id, name, email, avatar_url AS avatarUrl FROM accounts WHERE id = ?'),
  accountByEmail: database.prepare('SELECT * FROM accounts WHERE email = ?'),
  createAccount: database.prepare('INSERT INTO accounts (id, name, email, avatar_url, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
  updateAccount: database.prepare('UPDATE accounts SET name = ?, email = ?, avatar_url = ?, password_hash = ? WHERE id = ?'),
  registries: database.prepare('SELECT id, data FROM registries WHERE account_id = ? ORDER BY updated_at ASC'),
  replaceRegistry: database.prepare('INSERT INTO registries (id, account_id, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'),
  deleteRegistries: database.prepare('DELETE FROM registries WHERE account_id = ?'),
  session: database.prepare('SELECT account_id, expires_at FROM sessions WHERE token_hash = ?'),
  createSession: database.prepare('INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)'),
  deleteSession: database.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  savedLists: database.prepare('SELECT registry_id, access_code FROM saved_lists WHERE account_id = ? ORDER BY created_at ASC'),
  saveList: database.prepare('INSERT OR IGNORE INTO saved_lists (account_id, registry_id, access_code, created_at) VALUES (?, ?, ?, ?)'),
  deleteSavedList: database.prepare('DELETE FROM saved_lists WHERE account_id = ? AND access_code = ?'),
  sharedRegistries: database.prepare('SELECT id, account_id, data FROM registries'),
  listAccessForRegistry: database.prepare('SELECT account_id, last_accessed_at AS lastSeenAt FROM list_access WHERE registry_id = ?'),
  updateRegistry: database.prepare('UPDATE registries SET data = ?, updated_at = ? WHERE id = ? AND account_id = ?'),
  trackAccess: database.prepare('INSERT INTO list_access (account_id, registry_id, access_code, last_accessed_at) VALUES (?, ?, ?, ?) ON CONFLICT(account_id, registry_id) DO UPDATE SET last_accessed_at = excluded.last_accessed_at, access_code = excluded.access_code'),
  accessibleRegistries: database.prepare('SELECT registry_id, access_code FROM list_access WHERE account_id = ? UNION SELECT registry_id, access_code FROM saved_lists WHERE account_id = ?'),
  messages: database.prepare("SELECT messages.*, sender.name AS sender_name, recipient.name AS recipient_name, (SELECT GROUP_CONCAT(member_name, '|||') FROM conversation_members WHERE conversation_id = messages.conversation_id AND left_at IS NULL) AS conversation_people, (SELECT GROUP_CONCAT(member_id, '|||') FROM conversation_members WHERE conversation_id = messages.conversation_id AND left_at IS NULL) AS conversation_member_ids, (SELECT GROUP_CONCAT(IFNULL(COALESCE(accounts.avatar_url, guest_profiles.avatar_url), ''), '|||') FROM conversation_members LEFT JOIN accounts ON accounts.id = conversation_members.member_id LEFT JOIN guest_profiles ON guest_profiles.profile_id = conversation_members.member_id AND guest_profiles.registry_id = messages.registry_id WHERE conversation_id = messages.conversation_id AND left_at IS NULL) AS conversation_member_avatars FROM messages JOIN accounts sender ON sender.id = messages.sender_id JOIN accounts recipient ON recipient.id = messages.recipient_id WHERE (sender_id = ? OR recipient_id = ?) AND (messages.conversation_id IS NULL OR EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND member_id = ? AND left_at IS NULL)) ORDER BY created_at ASC"),
  createMessage: database.prepare('INSERT INTO messages (id, sender_id, recipient_id, registry_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
  guestMessages: database.prepare("SELECT guest_messages.*, (SELECT GROUP_CONCAT(member_name, '|||') FROM conversation_members WHERE conversation_id = guest_messages.conversation_id AND left_at IS NULL) AS conversation_people, (SELECT GROUP_CONCAT(member_id, '|||') FROM conversation_members WHERE conversation_id = guest_messages.conversation_id AND left_at IS NULL) AS conversation_member_ids, (SELECT GROUP_CONCAT(IFNULL(COALESCE(accounts.avatar_url, guest_profiles.avatar_url), ''), '|||') FROM conversation_members LEFT JOIN accounts ON accounts.id = conversation_members.member_id LEFT JOIN guest_profiles ON guest_profiles.profile_id = conversation_members.member_id AND guest_profiles.registry_id = guest_messages.registry_id WHERE conversation_id = guest_messages.conversation_id AND left_at IS NULL) AS conversation_member_avatars FROM guest_messages LEFT JOIN accounts sender_account ON sender_account.id = guest_messages.sender_id WHERE (sender_id = ? OR recipient_id = ? OR EXISTS (SELECT 1 FROM guest_profiles WHERE profile_token = ? AND profile_id IN (guest_messages.sender_id, guest_messages.recipient_id))) AND (guest_messages.conversation_id IS NULL OR EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = guest_messages.conversation_id AND (member_id = ? OR member_token = ?) AND left_at IS NULL)) ORDER BY created_at ASC"),
  createGuestMessage: database.prepare('INSERT INTO guest_messages (id, sender_id, sender_name, recipient_id, recipient_name, registry_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
  createConversationMessage: database.prepare('INSERT INTO guest_messages (id, sender_id, sender_name, recipient_id, recipient_name, registry_id, body, created_at, conversation_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  conversationMessages: database.prepare('SELECT id, sender_id, sender_name, recipient_id, recipient_name, registry_id, body, created_at, conversation_id FROM guest_messages WHERE conversation_id = ? UNION ALL SELECT id, sender_id, (SELECT name FROM accounts WHERE id = sender_id), recipient_id, (SELECT name FROM accounts WHERE id = recipient_id), registry_id, body, created_at, conversation_id FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'),
  updateMessageConversation: database.prepare('UPDATE guest_messages SET conversation_id = ? WHERE id = ?'),
  conversations: database.prepare('SELECT c.*, GROUP_CONCAT(cm.member_id) AS member_ids, GROUP_CONCAT(cm.member_name) AS member_names FROM conversations c JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.left_at IS NULL WHERE c.registry_id = ? GROUP BY c.id ORDER BY c.created_at DESC'),
  conversationById: database.prepare('SELECT * FROM conversations WHERE id = ?'),
  conversationMembers: database.prepare('SELECT * FROM conversation_members WHERE conversation_id = ? AND left_at IS NULL'),
  createConversation: database.prepare('INSERT INTO conversations (id, registry_id, title, created_at) VALUES (?, ?, ?, ?)'),
  addConversationMember: database.prepare('INSERT OR REPLACE INTO conversation_members (conversation_id, member_id, member_name, member_type, member_token, left_at) VALUES (?, ?, ?, ?, ?, NULL)'),
  leaveConversation: database.prepare('UPDATE conversation_members SET left_at = ? WHERE conversation_id = ? AND member_id = ? AND left_at IS NULL'),
  deleteConversation: database.prepare('DELETE FROM conversations WHERE id = ?'),
  notifications: database.prepare('SELECT * FROM notifications WHERE account_id = ? AND (registry_id IS NULL OR NOT EXISTS (SELECT 1 FROM registries WHERE registries.id = notifications.registry_id AND registries.account_id = ?)) ORDER BY created_at DESC LIMIT 50'),
  createNotification: database.prepare('INSERT INTO notifications (id, account_id, registry_id, gift_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
    guestNotifications: database.prepare('SELECT id, title, body, type, created_at, read_at FROM guest_notifications WHERE profile_id = ? AND profile_token = ? ORDER BY created_at DESC LIMIT 50'),
    createGuestNotification: database.prepare('INSERT INTO guest_notifications (id, profile_id, profile_token, registry_id, gift_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    guestProfiles: database.prepare('SELECT profile_id AS id, profile_token AS claimToken, display_name AS name, avatar_url AS avatarUrl, last_seen_at AS lastSeenAt, registry_id FROM guest_profiles WHERE registry_id = ? ORDER BY display_name COLLATE NOCASE ASC'),
    saveGuestProfile: database.prepare('INSERT INTO guest_profiles (registry_id, profile_id, profile_token, display_name, avatar_url, last_seen_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(registry_id, profile_id) DO UPDATE SET profile_token = excluded.profile_token, display_name = excluded.display_name, avatar_url = excluded.avatar_url, last_seen_at = excluded.last_seen_at'),
    touchGuestProfile: database.prepare('UPDATE guest_profiles SET last_seen_at = ? WHERE registry_id = ? AND profile_id = ? AND profile_token = ?'),
  markNotificationsRead: database.prepare('UPDATE notifications SET read_at = ? WHERE account_id = ? AND read_at IS NULL'),
};

function adminPeople(accountId) {
  const people = new Map();
  for (const row of statements.registries.all(accountId)) {
    const registry = JSON.parse(row.data);
    const registryPeople = new Set();
    const guestProfiles = statements.guestProfiles.all(registry.id);
    for (const access of statements.listAccessForRegistry.all(registry.id)) {
      if (!access.account_id || access.account_id === accountId) continue;
      const personKey = `account:${access.account_id}`;
      registryPeople.add(personKey);
      const account = statements.accountById.get(access.account_id);
      const existingPerson = people.get(personKey);
      if (existingPerson) {
        existingPerson.listCount += 1;
        existingPerson.lastSeenAt = [existingPerson.lastSeenAt, access.lastSeenAt].filter(Boolean).sort().at(-1) ?? null;
        continue;
      }
      if (account) {
        people.set(personKey, {
          id: account.id,
          type: 'account',
          name: account.name,
          ...(account.email ? { email: account.email } : {}),
          ...(account.avatarUrl ? { avatarUrl: account.avatarUrl } : {}),
          listCount: 1,
          lastSeenAt: access.lastSeenAt,
        });
      }
    }
    for (const claim of registry.claims ?? []) {
      if (!claim.giverId || claim.giverId === accountId) continue;
      const personKey = `${claim.giverMode}:${claim.giverId}`;
      const account = claim.giverMode === 'account' ? statements.accountById.get(claim.giverId) : null;
      const guestProfile = claim.giverMode === 'guest'
        ? guestProfiles.find((profile) => profile.id === claim.giverId)
        : null;
      if (registryPeople.has(personKey)) continue;
      registryPeople.add(personKey);
      const existingPerson = people.get(personKey);
      if (existingPerson) {
        existingPerson.listCount += 1;
        continue;
      }
      people.set(personKey, {
        id: claim.giverId,
        type: claim.giverMode === 'account' ? 'account' : 'guest',
        name: account?.name ?? claim.giverName ?? 'Guest',
        ...(account?.email ? { email: account.email } : {}),
        ...(account?.avatarUrl ? { avatarUrl: account.avatarUrl } : {}),
        listCount: 1,
        lastSeenAt: guestProfile?.lastSeenAt ?? null,
      });
    }
    for (const profile of guestProfiles) {
      const personKey = `guest:${profile.id}`;
      if (!profile.id || registryPeople.has(personKey)) continue;
      registryPeople.add(personKey);
      const existingPerson = people.get(personKey);
      if (existingPerson) {
        existingPerson.listCount += 1;
        existingPerson.lastSeenAt = [existingPerson.lastSeenAt, profile.lastSeenAt].filter(Boolean).sort().at(-1) ?? null;
        continue;
      }
      people.set(personKey, {
        id: profile.id,
        type: 'guest',
        name: profile.name,
        ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
        listCount: 1,
        lastSeenAt: profile.lastSeenAt,
      });
    }
  }
  return [...people.values()].sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
}

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
      return { row, registry: { ...registry, ownerId: owner?.id, ...(owner?.avatarUrl ? { ownerAvatarUrl: owner.avatarUrl } : {}) } };
    }
  }
  return null;
}

function publicRegistry(registry) {
  return {
    ...registry,
    claims: (registry.claims ?? []).map((claim) => {
      const publicClaim = { ...claim };
      if (claim.giverMode === 'account') {
        const account = statements.accountById.get(claim.giverId);
        if (account?.avatarUrl) publicClaim.giverAvatarUrl = account.avatarUrl;
      }
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
      if (signedInAccount) {
        statements.trackAccess.run(signedInAccount.id, shared.row.id, accessCode, new Date().toISOString());
      }
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
      if (signedInAccount) {
        statements.trackAccess.run(signedInAccount.id, shared.row.id, accessCode, new Date().toISOString());
      }
      const profile = signedInAccount
        ? { ...body.profile, id: signedInAccount.id, mode: 'account', displayName: signedInAccount.name, avatarUrl: signedInAccount.avatarUrl }
        : { ...body.profile, mode: 'guest' };
      if (profile.mode === 'guest') {
        statements.touchGuestProfile.run(new Date().toISOString(), shared.row.id, profile.id, profile.claimToken ?? '');
      }
      const previousClaims = shared.registry.claims ?? [];
      const nextRegistry = updateClaim(shared.registry, body.giftId, profile, body.state);
      statements.updateRegistry.run(JSON.stringify(nextRegistry), new Date().toISOString(), shared.row.id, shared.row.account_id);
      const claimChanged = JSON.stringify(previousClaims) !== JSON.stringify(nextRegistry.claims ?? []);
      if (claimChanged) {
        const gift = nextRegistry.gifts.find((item) => item.id === body.giftId);
        const actorName = profile.displayName || 'Someone';
        const verb = body.state === 'claimed'
          ? 'is buying'
          : body.state === 'considering'
            ? 'is also considering'
            : previousClaims.some((claim) => claim.giverId === profile.id && claim.state === 'claimed')
              ? 'is no longer buying'
              : 'is no longer considering';
        const recipients = new Map();
        for (const claim of previousClaims) {
          if (claim.giftId !== body.giftId || claim.giverId === profile.id || claim.giverId === shared.row.account_id) continue;
          if (claim.giverMode === 'account') {
            recipients.set(`account:${claim.giverId}`, { mode: 'account', id: claim.giverId });
          } else if (claim.giverToken) {
            recipients.set(`guest:${claim.giverId}`, { mode: 'guest', id: claim.giverId, token: claim.giverToken });
          }
        }
        for (const recipient of recipients.values()) {
          const title = `${actorName} updated a gift`;
          const message = `${actorName} ${verb} “${gift?.title ?? 'a gift'}”.`;
          if (recipient.mode === 'account') {
            statements.createNotification.run(randomUUID(), recipient.id, shared.row.id, body.giftId, 'claim', title, message, new Date().toISOString());
          } else {
            statements.createGuestNotification.run(randomUUID(), recipient.id, recipient.token, shared.row.id, body.giftId, 'claim', title, message, new Date().toISOString());
          }
        }
      }
      return json(response, 200, { registry: publicRegistry(nextRegistry) });
    }
  }

  if (request.method === 'GET' && path === '/api/guest-messages') {
    const query = new URL(request.url, `http://${request.headers.host}`).searchParams;
    const profileId = String(query.get('profileId') ?? '');
    const claimToken = String(query.get('claimToken') ?? '');
    const responseMessages = statements.guestMessages.all(profileId, profileId, claimToken, profileId, claimToken);
    return json(response, 200, { messages: responseMessages });
  }
  if (request.method === 'GET' && path === '/api/guest-notifications') {
    const query = new URL(request.url, `http://${request.headers.host}`).searchParams;
    const profileId = String(query.get('profileId') ?? '');
    const claimToken = String(query.get('claimToken') ?? '');
    return json(response, 200, { notifications: statements.guestNotifications.all(profileId, claimToken) });
  }
  if (request.method === 'DELETE' && path === '/api/guest-notifications') {
    const query = new URL(request.url, `http://${request.headers.host}`).searchParams;
    database.prepare('DELETE FROM guest_notifications WHERE profile_id = ? AND profile_token = ?').run(query.get('profileId') ?? '', query.get('claimToken') ?? '');
    return json(response, 200, { ok: true });
  }
  if (request.method === 'POST' && path === '/api/guest-notifications/read-message') {
    const query = new URL(request.url, `http://${request.headers.host}`).searchParams;
    database.prepare("UPDATE guest_notifications SET read_at = ? WHERE profile_id = ? AND profile_token = ? AND type = 'message' AND read_at IS NULL").run(new Date().toISOString(), query.get('profileId') ?? '', query.get('claimToken') ?? '');
    return json(response, 200, { ok: true });
  }
  if (request.method === 'POST' && path === '/api/guest-notifications/read-activity') {
    const query = new URL(request.url, `http://${request.headers.host}`).searchParams;
    database.prepare("UPDATE guest_notifications SET read_at = ? WHERE profile_id = ? AND profile_token = ? AND type <> 'message' AND read_at IS NULL").run(new Date().toISOString(), query.get('profileId') ?? '', query.get('claimToken') ?? '');
    return json(response, 200, { ok: true });
  }
  if (request.method === 'GET' && path === '/api/guest-message-contacts') {
    const query = new URL(request.url, `http://${request.headers.host}`).searchParams;
    const accessCode = String(query.get('accessCode') ?? '').toUpperCase();
    const profileId = String(query.get('profileId') ?? '');
    const claimToken = String(query.get('claimToken') ?? '');
    const profileName = claimNameKey(query.get('displayName') ?? '');
    const shared = findSharedRegistry(accessCode);
    if (!shared) return json(response, 404, { error: 'That shared list could not be found.' });
    const contacts = (shared.registry.claims ?? [])
      .filter((claim) => claim.giverId !== profileId && claim.giverToken !== claimToken && claimNameKey(claim.giverName) !== profileName && claim.giverName)
      .filter((claim) => claim.giverId !== shared.row.account_id)
      .map((claim) => ({ id: claim.giverId, name: claim.giverName, avatarUrl: claim.giverAvatarUrl, registryId: shared.row.id, registryName: shared.registry.listName, recipientType: claim.giverMode, claimToken: claim.giverToken }));
    const knownIds = new Set(contacts.map((contact) => contact.id));
    for (const guest of statements.guestProfiles.all(shared.row.id)) {
      if (guest.id === profileId || guest.claimToken === claimToken || claimNameKey(guest.name) === profileName || knownIds.has(guest.id)) continue;
      contacts.push({ id: guest.id, name: guest.name, avatarUrl: guest.avatarUrl, registryId: shared.row.id, registryName: shared.registry.listName, recipientType: 'guest', claimToken: guest.claimToken });
    }
    return json(response, 200, { contacts });
  }
  if (request.method === 'POST' && path === '/api/guest-presence') {
    const body = await readBody(request);
    const profile = body.profile;
    const shared = findSharedRegistry(String(body.accessCode ?? '').trim().toUpperCase());
    if (!shared || profile?.mode !== 'guest' || !String(profile.id ?? '').startsWith('guest-') || !profile.claimToken || !String(profile.displayName ?? '').trim()) {
      return json(response, 400, { error: 'That guest profile is not valid for this list.' });
    }
    statements.saveGuestProfile.run(shared.row.id, profile.id, profile.claimToken, String(profile.displayName).trim(), profile.avatarUrl ?? null, new Date().toISOString());
    return json(response, 200, { ok: true });
  }
  if (request.method === 'POST' && path === '/api/guest-messages') {
    const body = await readBody(request);
    const profile = body.profile;
    const accessCode = String(body.accessCode ?? '').trim().toUpperCase();
    const recipientId = String(body.recipientId ?? '');
    const messageBody = String(body.body ?? '').trim();
    const shared = findSharedRegistry(accessCode);
    const senderClaim = shared?.registry.claims?.find((claim) => claim.giverId === profile?.id && claim.giverToken === profile?.claimToken);
    const recipientClaim = shared?.registry.claims?.find((claim) => claim.giverId === recipientId);
    if (!shared || !senderClaim || !recipientClaim || !messageBody || shared.row.account_id === recipientId) {
      return json(response, 400, { error: 'That guest message recipient or list is not available.' });
    }
    const createdAt = new Date().toISOString();
    if (recipientClaim.giverMode === 'account') {
      statements.createGuestMessage.run(randomUUID(), senderClaim.giverId, senderClaim.giverName, recipientClaim.giverId, recipientClaim.giverName, shared.row.id, messageBody, createdAt);
      statements.createNotification.run(randomUUID(), recipientClaim.giverId, shared.row.id, null, 'message', `Message from ${senderClaim.giverName}`, messageBody, createdAt);
    } else {
      statements.createGuestMessage.run(randomUUID(), senderClaim.giverId, senderClaim.giverName, recipientClaim.giverId, recipientClaim.giverName, shared.row.id, messageBody, createdAt);
      statements.createGuestNotification.run(randomUUID(), recipientClaim.giverId, recipientClaim.giverToken ?? '', shared.row.id, null, 'message', `Message from ${senderClaim.giverName}`, messageBody, createdAt);
    }
    return json(response, 201, { ok: true });
  }
  if (request.method === 'DELETE' && path.startsWith('/api/guest-notifications/')) {
    const query = new URL(request.url, `http://${request.headers.host}`).searchParams;
    database.prepare('DELETE FROM guest_notifications WHERE id = ? AND profile_id = ? AND profile_token = ?').run(decodeURIComponent(path.slice('/api/guest-notifications/'.length)), query.get('profileId') ?? '', query.get('claimToken') ?? '');
    return json(response, 200, { ok: true });
  }
  if (request.method === 'POST' && path === '/api/conversations') {
    const body = await readBody(request);
    const registryId = String(body.registryId ?? '');
    const sender = body.profile;
    const account = authenticatedAccount(request);
    const registryRow = statements.sharedRegistries.all().find((row) => row.id === registryId);
    const shared = registryRow ? { row: registryRow, registry: JSON.parse(registryRow.data) } : null;
    const claims = shared?.registry.claims ?? [];
    const validGuestSender = sender?.mode === 'guest' && String(sender?.id ?? '').startsWith('guest-') && Boolean(sender?.claimToken) && Boolean(sender?.displayName?.trim());
    const allowed = account ? statements.accessibleRegistries.all(account.id, account.id).some((item) => item.registry_id === registryId) : Boolean(validGuestSender && shared?.row.id === registryId);
    const members = Array.isArray(body.members) ? body.members : [];
    if (!shared || !registryRow || !allowed || !sender || !members.length) return json(response, 400, { error: 'That conversation or list is not available.' });
    const allMembers = [sender, ...members].filter((member, index, list) => member?.id && list.findIndex((candidate) => candidate?.id === member.id) === index);
    const validMembers = allMembers.every((member) => {
      const memberType = member.mode ?? member.recipientType;
      if (account && member.id === account.id && memberType === 'account') return true;
      if (!account && member.id === sender?.id && memberType === 'guest' && validGuestSender) return true;
      const claim = claims.find((candidate) => candidate.giverId === member.id);
      if (claim && (memberType === 'account' || claim.giverToken === member.claimToken)) return true;
      if (memberType === 'guest') {
        const guestProfile = statements.guestProfiles.all(registryId).find((profile) => profile.id === member.id && profile.claimToken === member.claimToken);
        return Boolean(guestProfile);
      }
      return false;
    });
    if (!validMembers) return json(response, 400, { error: 'One or more conversation members are not available.' });
    const conversationId = randomUUID();
    const now = new Date().toISOString();
    statements.createConversation.run(conversationId, registryId, String(body.title ?? 'New chat'), now);
    for (const member of allMembers) {
      const claim = claims.find((candidate) => candidate.giverId === member.id);
      const memberType = member.mode ?? member.recipientType ?? claim?.giverMode ?? 'guest';
      const guestProfile = memberType === 'guest' ? statements.guestProfiles.all(registryId).find((profile) => profile.id === member.id) : null;
      statements.addConversationMember.run(conversationId, member.id, member.displayName ?? member.name ?? claim?.giverName ?? guestProfile?.name ?? 'Guest', memberType, member.claimToken ?? claim?.giverToken ?? guestProfile?.claimToken ?? null);
    }
    return json(response, 201, { conversationId });
  }
  if (request.method === 'POST' && path === '/api/conversation-messages') {
    const body = await readBody(request);
    const conversation = statements.conversationById.get(String(body.conversationId ?? ''));
    const members = conversation ? statements.conversationMembers.all(conversation.id) : [];
    const sender = body.profile;
    const authenticated = authenticatedAccount(request);
    const senderMember = members.find((member) => member.member_id === sender?.id && (member.member_type === 'guest' ? member.member_token === sender?.claimToken : authenticated?.id === member.member_id));
    const messageBody = String(body.body ?? '').trim();
    if (!conversation || !senderMember || !messageBody) return json(response, 400, { error: 'That conversation is not available.' });
    const createdAt = new Date().toISOString();
    for (const recipient of members.filter((member) => member.member_id !== sender.id)) {
      statements.createConversationMessage.run(randomUUID(), sender.id, sender.displayName, recipient.member_id, recipient.member_name, conversation.registry_id, messageBody, createdAt, conversation.id);
      if (recipient.member_type === 'account') statements.createNotification.run(randomUUID(), recipient.member_id, conversation.registry_id, null, 'message', `Message from ${sender.displayName}`, messageBody, createdAt);
      else statements.createGuestNotification.run(randomUUID(), recipient.member_id, recipient.member_token ?? '', conversation.registry_id, null, 'message', `Message from ${sender.displayName}`, messageBody, createdAt);
    }
    return json(response, 201, { ok: true });
  }
  if (request.method === 'POST' && path === '/api/conversations/leave') {
    const body = await readBody(request);
    const registryId = String(body.registryId ?? '');
    const profile = body.profile;
    const participantIds = Array.isArray(body.participantIds) ? body.participantIds.filter((id) => typeof id === 'string' && id !== profile?.id) : [];
    const registryRow = statements.sharedRegistries.all().find((row) => row.id === registryId);
    const authenticated = authenticatedAccount(request);
    const claim = registryRow ? (JSON.parse(registryRow.data).claims ?? []).find((candidate) => candidate.giverId === profile?.id && candidate.giverToken === profile?.claimToken) : null;
    if (!registryRow || !profile?.id || (!authenticated && !claim) || (authenticated && authenticated.id !== profile.id)) return json(response, 400, { error: 'That legacy chat is not available.' });
    const registry = JSON.parse(registryRow.data);
    const claims = registry.claims ?? [];
    const memberIds = [...new Set([profile.id, ...participantIds])];
    const members = memberIds.map((memberId) => {
      const account = statements.accountById.get(memberId);
      const claimMember = claims.find((candidate) => candidate.giverId === memberId);
      if (account) return { id: memberId, name: account.name, type: 'account', token: null };
      if (claimMember) return { id: memberId, name: claimMember.giverName, type: claimMember.giverMode, token: claimMember.giverToken ?? null };
      return null;
    });
    if (members.some((member) => !member)) return json(response, 400, { error: 'That legacy chat is not available.' });
    const conversationId = randomUUID();
    const createdAt = new Date().toISOString();
    statements.createConversation.run(conversationId, registryId, 'Group chat', createdAt);
    for (const member of members) statements.addConversationMember.run(conversationId, member.id, member.name, member.type, member.token);
    for (const participantId of participantIds) {
      database.prepare('UPDATE messages SET conversation_id = ? WHERE registry_id = ? AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))').run(conversationId, registryId, profile.id, participantId, participantId, profile.id);
      database.prepare('UPDATE guest_messages SET conversation_id = ? WHERE registry_id = ? AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))').run(conversationId, registryId, profile.id, participantId, participantId, profile.id);
    }
    statements.leaveConversation.run(createdAt, conversationId, profile.id);
    const remainingMembers = members.filter((member) => member.id !== profile.id);
    const leftMessage = `${members.find((member) => member.id === profile.id).name} left the chat.`;
    for (const recipient of remainingMembers) statements.createConversationMessage.run(randomUUID(), `system:${conversationId}`, 'System', recipient.id, recipient.name, registryId, leftMessage, createdAt, conversationId);
    return json(response, 200, { ok: true });
  }
  if (request.method === 'POST' && /^\/api\/conversations\/[^/]+\/leave$/.test(path)) {
    const body = await readBody(request);
    const conversationId = path.split('/')[3];
    const conversation = statements.conversationById.get(conversationId);
    const members = conversation ? statements.conversationMembers.all(conversationId) : [];
    const profile = body.profile;
    const authenticated = authenticatedAccount(request);
    const member = members.find((candidate) => candidate.member_id === profile?.id && (candidate.member_type === 'guest' ? candidate.member_token === profile?.claimToken : authenticated?.id === candidate.member_id));
    if (!conversation || !member) return json(response, 400, { error: 'That conversation is not available.' });
    statements.leaveConversation.run(new Date().toISOString(), conversationId, member.member_id);
    const remainingMembers = members.filter((candidate) => candidate.member_id !== member.member_id);
    if (remainingMembers.length === 0) {
      statements.deleteConversation.run(conversationId);
    } else {
      const leftMessage = `${member.member_name} left the chat.`;
      const createdAt = new Date().toISOString();
      for (const recipient of remainingMembers) {
        statements.createConversationMessage.run(randomUUID(), `system:${conversationId}`, 'System', recipient.member_id, recipient.member_name, conversation.registry_id, leftMessage, createdAt, conversationId);
      }
    }
    return json(response, 200, { ok: true });
  }

  const account = requireAccount(request, response);
  if (!account) return;
  if (request.method === 'GET' && path === '/api/notifications') {
    return json(response, 200, { notifications: statements.notifications.all(account.id, account.id) });
  }
  if (request.method === 'POST' && path === '/api/notifications/read') {
    statements.markNotificationsRead.run(new Date().toISOString(), account.id);
    return json(response, 200, { ok: true });
  }
  if (request.method === 'POST' && path === '/api/notifications/read-message') {
    database.prepare("UPDATE notifications SET read_at = ? WHERE account_id = ? AND type = 'message' AND read_at IS NULL").run(new Date().toISOString(), account.id);
    return json(response, 200, { ok: true });
  }
  if (request.method === 'POST' && path === '/api/notifications/read-activity') {
    database.prepare("UPDATE notifications SET read_at = ? WHERE account_id = ? AND type <> 'message' AND read_at IS NULL").run(new Date().toISOString(), account.id);
    return json(response, 200, { ok: true });
  }
  if (request.method === 'GET' && path === '/api/messages') {
    return json(response, 200, { messages: [...statements.messages.all(account.id, account.id, account.id), ...statements.guestMessages.all(account.id, account.id, '', account.id, '')].sort((left, right) => left.created_at.localeCompare(right.created_at)) });
  }
  if (request.method === 'GET' && path === '/api/message-contacts') {
    const contacts = new Map();
    for (const access of statements.accessibleRegistries.all(account.id, account.id)) {
      const row = statements.sharedRegistries.all().find((candidate) => candidate.id === access.registry_id);
      if (!row) continue;
      const registry = JSON.parse(row.data);
      for (const claim of registry.claims ?? []) {
        if (claim.giverId !== account.id && claim.giverId !== row.account_id && claim.giverMode === 'account') {
          const contact = statements.accountById.get(claim.giverId);
          if (contact && contact.id !== row.account_id) contacts.set(contact.id, { id: contact.id, name: contact.name, avatarUrl: contact.avatarUrl, registryId: row.id, registryName: registry.listName, recipientType: 'account' });
        }
        if (claim.giverId !== account.id && claim.giverId !== row.account_id && claim.giverMode === 'guest') {
          contacts.set(claim.giverId, { id: claim.giverId, name: claim.giverName, avatarUrl: claim.giverAvatarUrl, registryId: row.id, registryName: registry.listName, recipientType: 'guest', claimToken: claim.giverToken });
        }
      }
      for (const guest of statements.guestProfiles.all(row.id)) {
        if (guest.id !== account.id) contacts.set(guest.id, { id: guest.id, name: guest.name, avatarUrl: guest.avatarUrl, registryId: row.id, registryName: registry.listName, recipientType: 'guest', claimToken: guest.claimToken });
      }
    }
    return json(response, 200, { contacts: [...contacts.values()] });
  }
  if (request.method === 'POST' && path === '/api/messages') {
    const body = await readBody(request);
    const recipientId = String(body.recipientId ?? '');
    const registryId = String(body.registryId ?? '');
    const messageBody = String(body.body ?? '').trim();
    const accessible = statements.accessibleRegistries.all(account.id, account.id).some((item) => item.registry_id === registryId);
    const registryRow = statements.sharedRegistries.all().find((candidate) => candidate.id === registryId);
    const recipientAccount = statements.accountById.get(recipientId);
    const recipientGuestClaim = registryRow ? (JSON.parse(registryRow.data).claims ?? []).find((claim) => claim.giverId === recipientId && claim.giverMode === 'guest') : null;
    const recipientGuestProfile = registryRow ? statements.guestProfiles.all(registryId).find((profile) => profile.id === recipientId) : null;
    const guestRecipient = recipientGuestClaim ?? recipientGuestProfile;
    if (!recipientId || !registryId || !messageBody || !accessible || recipientId === account.id || !registryRow || registryRow.account_id === recipientId || (!recipientAccount && !guestRecipient)) {
      return json(response, 400, { error: 'That message recipient or list is not available.' });
    }
    const createdAt = new Date().toISOString();
    if (recipientAccount) {
      statements.createMessage.run(randomUUID(), account.id, recipientId, registryId, messageBody, createdAt);
      statements.createNotification.run(randomUUID(), recipientId, registryId, null, 'message', `Message from ${account.name}`, messageBody, createdAt);
    } else {
      statements.createGuestMessage.run(randomUUID(), account.id, account.name, recipientId, guestRecipient.name ?? guestRecipient.giverName, registryId, messageBody, createdAt);
      statements.createGuestNotification.run(randomUUID(), recipientId, guestRecipient.claimToken ?? guestRecipient.giverToken ?? '', registryId, null, 'message', `Message from ${account.name}`, messageBody, createdAt);
    }
    return json(response, 201, { ok: true });
  }
  if (request.method === 'DELETE' && path.startsWith('/api/notifications/')) {
    const notificationId = decodeURIComponent(path.slice('/api/notifications/'.length));
    database.prepare('DELETE FROM notifications WHERE id = ? AND account_id = ?').run(notificationId, account.id);
    return json(response, 200, { ok: true });
  }
  if (request.method === 'DELETE' && path === '/api/notifications') {
    database.prepare('DELETE FROM notifications WHERE account_id = ?').run(account.id);
    return json(response, 200, { ok: true });
  }
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
  if (request.method === 'GET' && path === '/api/admin/people') {
    return json(response, 200, { people: adminPeople(account.id) });
  }
  const adminPersonMatch = path.match(/^\/api\/admin\/people\/([^/]+)$/);
  if (request.method === 'DELETE' && adminPersonMatch) {
    const personId = decodeURIComponent(adminPersonMatch[1]);
    const body = await readBody(request);
    const personType = body.personType === 'account' ? 'account' : 'guest';
    if (personId === account.id) return json(response, 400, { error: 'You cannot remove yourself from your own lists.' });
    const ownedRegistries = statements.registries.all(account.id);
    const registryIds = ownedRegistries.map((row) => row.id);
    database.exec('BEGIN IMMEDIATE');
    const activeSince = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const activeUse = registryIds.length > 0 && (personType === 'guest'
      ? database.prepare(`SELECT 1 FROM guest_profiles WHERE profile_id = ? AND registry_id IN (${registryIds.map(() => '?').join(',')}) AND last_seen_at >= ? LIMIT 1`).get(personId, ...registryIds, activeSince)
      : database.prepare(`SELECT 1 FROM list_access JOIN sessions ON sessions.account_id = list_access.account_id WHERE list_access.account_id = ? AND list_access.registry_id IN (${registryIds.map(() => '?').join(',')}) AND list_access.last_accessed_at >= ? AND sessions.expires_at >= ? LIMIT 1`).get(personId, ...registryIds, activeSince, Date.now()));
    if (activeUse) {
      database.exec('ROLLBACK');
      return json(response, 409, { error: 'This person is actively using one of your lists. Try again after they leave the list.' });
    }
    try {
      for (const row of ownedRegistries) {
        const registry = JSON.parse(row.data);
        const nextClaims = (registry.claims ?? []).filter((claim) => !(claim.giverId === personId && (personType === 'account' ? claim.giverMode === 'account' : claim.giverMode === 'guest')));
        if (nextClaims.length !== (registry.claims ?? []).length) {
          statements.updateRegistry.run(JSON.stringify({ ...registry, claims: nextClaims }), new Date().toISOString(), row.id, account.id);
        }
        if (personType === 'guest') {
          database.prepare('DELETE FROM guest_profiles WHERE registry_id = ? AND profile_id = ?').run(row.id, personId);
          database.prepare('DELETE FROM guest_notifications WHERE registry_id = ? AND profile_id = ?').run(row.id, personId);
          database.prepare('DELETE FROM guest_messages WHERE registry_id = ? AND (sender_id = ? OR recipient_id = ?)').run(row.id, personId, personId);
        }
      }
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
    return json(response, 200, { ok: true });
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