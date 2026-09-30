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
  sendVerificationEmail,
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
      const account = { id: randomUUID(), name: String(body.name).trim(), email, emailVerified: false, marketingOptIn: Boolean(body.marketingOptIn) };
      statements.createAccount.run(account.id, account.name, account.email, null, passwordHash(password), 0, account.marketingOptIn ? 1 : 0, new Date().toISOString());
      const verificationToken = randomUUID() + randomUUID();
      statements.createVerificationToken.run(tokenHash(verificationToken), account.id, Date.now() + 1000 * 60 * 60 * 24);
      setSession(response, account.id);
      const verificationUrl = await sendVerificationEmail({ account, token: verificationToken });
      json(response, 201, { account, verificationRequired: true, ...(process.env.NODE_ENV !== 'production' ? { verificationUrl } : {}) });
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
