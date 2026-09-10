import type { Registry } from '../types';

export type RecipientAccount = {
  id: string;
  name: string;
  email: string;
};

type StoredAccount = RecipientAccount & {
  passwordDigest: string;
};

const accountsKey = 'kindlist.accounts';
const sessionKey = 'kindlist.session';
const registryKey = (accountId: string) => `kindlist.registry.${accountId}`;

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function digestPassword(password: string) {
  const encoded = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getStoredSession() {
  return readJson<RecipientAccount | null>(sessionKey, null);
}

export function getAccountRegistry(account: RecipientAccount, initialRegistry: Registry) {
  return readJson<Registry>(registryKey(account.id), {
    ...initialRegistry,
    ownerName: account.name,
    accessCode: `${account.id.slice(-4).toUpperCase()}-LIST`,
  });
}

export async function createAccount(name: string, email: string, password: string, initialRegistry: Registry) {
  const accounts = readJson<StoredAccount[]>(accountsKey, []);
  const normalisedEmail = email.trim().toLowerCase();
  if (accounts.some((account) => account.email === normalisedEmail)) {
    throw new Error('An account with that email already exists.');
  }

  const account: RecipientAccount = { id: crypto.randomUUID(), name: name.trim(), email: normalisedEmail };
  const passwordDigest = await digestPassword(password);
  window.localStorage.setItem(accountsKey, JSON.stringify([...accounts, { ...account, passwordDigest }]));
  saveAccountRegistry(account, { ...initialRegistry, ownerName: account.name, accessCode: `${account.id.slice(-4).toUpperCase()}-LIST` });
  saveSession(account);
  return account;
}

export async function signIn(email: string, password: string) {
  const accounts = readJson<StoredAccount[]>(accountsKey, []);
  const account = accounts.find((candidate) => candidate.email === email.trim().toLowerCase());
  if (!account || account.passwordDigest !== await digestPassword(password)) {
    throw new Error('The email or password is incorrect.');
  }

  const { passwordDigest: _passwordDigest, ...profile } = account;
  saveSession(profile);
  return profile;
}

export function saveSession(account: RecipientAccount) {
  window.localStorage.setItem(sessionKey, JSON.stringify(account));
}

export function clearSession() {
  window.localStorage.removeItem(sessionKey);
}

export function saveAccountRegistry(account: RecipientAccount, registry: Registry) {
  window.localStorage.setItem(registryKey(account.id), JSON.stringify(registry));
}
