import type { Registry } from '../types';

export type RecipientAccount = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
};

export type ProfileDetails = {
  name: string;
  email: string;
  avatarUrl?: string;
  currentPassword: string;
  newPassword: string;
};

type StoredAccount = RecipientAccount & {
  passwordDigest: string;
};

const accountsKey = 'kindlist.accounts';
const sessionKey = 'kindlist.session';
const registryKey = (accountId: string) => `kindlist.registry.${accountId}`;
const registriesKey = (accountId: string) => `kindlist.registries.${accountId}`;

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

function normaliseRegistry(registry: Registry) {
  return { ...registry, statuses: registry.statuses ?? [] };
}

export function getAccountRegistries(account: RecipientAccount) {
  const storedRegistries = readJson<Registry[] | null>(registriesKey(account.id), null);
  if (storedRegistries) return storedRegistries.map(normaliseRegistry);

  const legacyRegistry = readJson<Registry | null>(registryKey(account.id), null);
  return legacyRegistry ? [normaliseRegistry(legacyRegistry)] : [];
}

export async function createAccount(name: string, email: string, password: string) {
  const accounts = readJson<StoredAccount[]>(accountsKey, []);
  const normalisedEmail = email.trim().toLowerCase();
  if (accounts.some((account) => account.email === normalisedEmail)) {
    throw new Error('An account with that email already exists.');
  }

  const account: RecipientAccount = { id: crypto.randomUUID(), name: name.trim(), email: normalisedEmail };
  const passwordDigest = await digestPassword(password);
  window.localStorage.setItem(accountsKey, JSON.stringify([...accounts, { ...account, passwordDigest }]));
  saveAccountRegistries(account, []);
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

export async function updateAccountProfile(account: RecipientAccount, details: ProfileDetails) {
  const accounts = readJson<StoredAccount[]>(accountsKey, []);
  const accountIndex = accounts.findIndex((candidate) => candidate.id === account.id);
  if (accountIndex < 0) throw new Error('This account could not be found.');

  const name = details.name.trim();
  const email = details.email.trim().toLowerCase();
  if (!name || !email) throw new Error('Name and email are required.');
  if (accounts.some((candidate) => candidate.email === email && candidate.id !== account.id)) {
    throw new Error('An account with that email already exists.');
  }

  const storedAccount = accounts[accountIndex];
  let passwordDigest = storedAccount.passwordDigest;
  if (details.newPassword) {
    if (!details.currentPassword || passwordDigest !== await digestPassword(details.currentPassword)) {
      throw new Error('Your current password is incorrect.');
    }
    if (details.newPassword.length < 8) {
      throw new Error('Your new password must be at least 8 characters.');
    }
    passwordDigest = await digestPassword(details.newPassword);
  }

  const nextAccount: RecipientAccount = {
    id: account.id,
    name,
    email,
    avatarUrl: details.avatarUrl,
  };
  accounts[accountIndex] = { ...nextAccount, passwordDigest };
  window.localStorage.setItem(accountsKey, JSON.stringify(accounts));
  saveSession(nextAccount);
  return nextAccount;
}

export function clearSession() {
  window.localStorage.removeItem(sessionKey);
}

export function saveAccountRegistries(account: RecipientAccount, registries: Registry[]) {
  window.localStorage.setItem(registriesKey(account.id), JSON.stringify(registries));
}
