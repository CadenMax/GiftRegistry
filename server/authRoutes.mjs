export async function handleAuthApi({
  request,
  response,
  path,
  readBody,
  statements,
  json,
  accountFromRow,
  passwordHash,
  passwordsMatch,
  sessionToken,
  tokenHash,
  setSession,
  randomUUID,
}) {
  if (request.method === 'POST' && (path === '/api/auth/register' || path === '/api/auth/login')) {
    const body = await readBody(request);
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    if (!email || !password || (path.endsWith('register') && !String(body.name ?? '').trim())) {
      json(response, 400, { error: 'Name, email, and password are required.' });
      return true;
    }
    const existing = statements.accountByEmail.get(email);
    if (path.endsWith('register')) {
      if (existing) {
        json(response, 409, { error: 'An account with that email already exists.' });
        return true;
      }
      const account = { id: randomUUID(), name: String(body.name).trim(), email };
      statements.createAccount.run(account.id, account.name, account.email, null, passwordHash(password), new Date().toISOString());
      setSession(response, account.id);
      json(response, 201, { account });
      return true;
    }
    if (!existing || !passwordsMatch(password, existing.password_hash)) {
      json(response, 401, { error: 'The email or password is incorrect.' });
      return true;
    }
    const account = accountFromRow(existing);
    setSession(response, account.id);
    json(response, 200, { account });
    return true;
  }
  if (request.method === 'POST' && path === '/api/auth/logout') {
    const token = sessionToken(request);
    if (token) statements.deleteSession.run(tokenHash(token));
    response.setHeader('Set-Cookie', 'kindlist_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
    json(response, 200, { ok: true });
    return true;
  }
  return false;
}
