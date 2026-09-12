export async function handleSharedApi({
  request,
  response,
  path,
  readBody,
  json,
  statements,
  findSharedRegistry,
  authenticatedAccount,
  publicRegistry,
  updateClaim,
  randomUUID,
}) {
  const sharedMatch = path.match(/^\/api\/shared\/([^/]+)(?:\/claims)?$/);
  if (!sharedMatch) return false;

  const accessCode = decodeURIComponent(sharedMatch[1]).trim().toUpperCase();
  const shared = findSharedRegistry(accessCode);
  if (!shared) {
    json(response, 404, { error: 'That shared list could not be found.' });
    return true;
  }
  const signedInAccount = authenticatedAccount(request);
  if (signedInAccount?.id === shared.row.account_id) {
    json(response, 403, { error: 'List owners cannot open their own shared list.' });
    return true;
  }
  if (request.method === 'GET' && path === `/api/shared/${sharedMatch[1]}`) {
    if (signedInAccount) {
      statements.trackAccess.run(signedInAccount.id, shared.row.id, accessCode, new Date().toISOString());
    }
    json(response, 200, { registry: publicRegistry(shared.registry) });
    return true;
  }
  if (request.method === 'PATCH' && path.endsWith('/claims')) {
    const body = await readBody(request);
    const giftExists = shared.registry.gifts.some((gift) => gift.id === body.giftId);
    if (!giftExists || !body.profile || (body.state !== null && !['considering', 'claimed'].includes(body.state))) {
      json(response, 400, { error: 'That claim is not valid.' });
      return true;
    }
    if (body.profile.mode === 'account' && (!signedInAccount || signedInAccount.id !== body.profile.id)) {
      json(response, 403, { error: 'Sign in to use your account identity.' });
      return true;
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
    json(response, 200, { registry: publicRegistry(nextRegistry) });
    return true;
  }
  return false;
}
