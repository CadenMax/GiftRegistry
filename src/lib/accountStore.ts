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

type ApiResponse<T> = T & { error?: string };

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await response.json() as ApiResponse<T>;
  if (!response.ok) throw new Error(body.error ?? 'The server could not complete that request.');
  return body;
}

export async function getStoredSession() {
  const response = await request<{ account: RecipientAccount | null }>('/api/session');
  return response.account;
}

function normaliseRegistry(registry: Registry) {
  return { ...registry, statuses: registry.statuses ?? [] };
}

export async function getAccountRegistries(_account: RecipientAccount) {
  const response = await request<{ registries: Registry[] }>('/api/registries');
  return response.registries.map(normaliseRegistry);
}

export async function createAccount(name: string, email: string, password: string) {
  const response = await request<{ account: RecipientAccount }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  return response.account;
}

export async function signIn(email: string, password: string) {
  const response = await request<{ account: RecipientAccount }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return response.account;
}

export async function updateAccountProfile(account: RecipientAccount, details: ProfileDetails) {
  const response = await request<{ account: RecipientAccount }>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify({ accountId: account.id, details }),
  });
  return response.account;
}

export async function clearSession() {
  await request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
}

export async function saveAccountRegistries(_account: RecipientAccount, registries: Registry[]) {
  await request<{ registries: Registry[] }>('/api/registries', {
    method: 'PUT',
    body: JSON.stringify({ registries }),
  });
}
