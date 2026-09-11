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

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  type?: string;
  created_at: string;
  read_at?: string;
};

export type MessageContact = { id: string; name: string; avatarUrl?: string; registryId: string; registryName: string; recipientType?: 'account' | 'guest'; claimToken?: string };
export type AppMessage = { id: string; sender_id: string; recipient_id: string; sender_name: string; recipient_name: string; registry_id: string; body: string; created_at: string; conversation_id?: string; conversation_people?: string; conversation_member_ids?: string; conversation_member_avatars?: string };
export type AdminPerson = { id: string; type: 'account' | 'guest'; name: string; email?: string; avatarUrl?: string; listCount: number; lastSeenAt?: string | null };

type ApiResponse<T> = T & { error?: string };

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const text = await response.text();
  let body: ApiResponse<T>;
  try {
    body = JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new Error(response.ok ? 'The server returned an invalid response.' : `The server could not complete that request (${response.status}).`);
  }
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

export async function getSavedRegistries() {
  const response = await request<{ registries: Registry[] }>('/api/saved-lists');
  return response.registries.map(normaliseRegistry);
}

export async function saveSharedRegistry(accessCode: string) {
  const response = await request<{ registry: Registry }>('/api/saved-lists', {
    method: 'POST',
    body: JSON.stringify({ accessCode }),
  });
  return normaliseRegistry(response.registry);
}

export async function removeSavedRegistry(accessCode: string) {
  await request<{ ok: boolean }>(`/api/saved-lists/${encodeURIComponent(accessCode)}`, { method: 'DELETE' });
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

export async function getAdminPeople() {
  const response = await request<{ people: AdminPerson[] }>('/api/admin/people');
  return response.people;
}

export async function removeAdminPerson(person: Pick<AdminPerson, 'id' | 'type'>) {
  await request<{ ok: boolean }>(`/api/admin/people/${encodeURIComponent(person.id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ personType: person.type }),
  });
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

export async function getSharedRegistry(accessCode: string) {
  const response = await request<{ registry: Registry }>(`/api/shared/${encodeURIComponent(accessCode)}`);
  return response.registry;
}

export async function updateSharedClaim(
  accessCode: string,
  giftId: string,
  profile: { id: string; mode: 'guest' | 'account'; displayName: string; avatarUrl?: string; claimToken?: string },
  state: 'considering' | 'claimed' | null,
) {
  const response = await request<{ registry: Registry }>(`/api/shared/${encodeURIComponent(accessCode)}/claims`, {
    method: 'PATCH',
    body: JSON.stringify({ giftId, profile, state }),
  });
  return response.registry;
}

export async function getNotifications() {
  const response = await request<{ notifications: AppNotification[] }>('/api/notifications');
  return response.notifications;
}

export async function markNotificationsRead() {
  await request<{ ok: boolean }>('/api/notifications/read', { method: 'POST' });
}

export async function markMessageNotificationsRead() {
  await request<{ ok: boolean }>('/api/notifications/read-message', { method: 'POST' });
}

export async function markActivityNotificationsRead() {
  await request<{ ok: boolean }>('/api/notifications/read-activity', { method: 'POST' });
}

export async function getMessages() {
  const response = await request<{ messages: AppMessage[] }>('/api/messages');
  return response.messages;
}

export async function getMessageContacts() {
  const response = await request<{ contacts: MessageContact[] }>('/api/message-contacts');
  return response.contacts;
}

export async function sendMessage(recipientId: string, registryId: string, body: string) {
  await request<{ ok: boolean }>('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ recipientId, registryId, body }),
  });
}

export async function getGuestMessages(profileId: string, claimToken?: string) {
  const response = await request<{ messages: AppMessage[] }>(`/api/guest-messages?profileId=${encodeURIComponent(profileId)}&claimToken=${encodeURIComponent(claimToken ?? '')}`);
  return response.messages;
}

export async function getGuestNotifications(profileId: string, claimToken?: string) {
  const response = await request<{ notifications: AppNotification[] }>(`/api/guest-notifications?profileId=${encodeURIComponent(profileId)}&claimToken=${encodeURIComponent(claimToken ?? '')}`);
  return response.notifications;
}

export async function markGuestMessageNotificationsRead(profileId: string, claimToken?: string) {
  await request<{ ok: boolean }>(`/api/guest-notifications/read-message?profileId=${encodeURIComponent(profileId)}&claimToken=${encodeURIComponent(claimToken ?? '')}`, { method: 'POST' });
}

export async function markGuestActivityNotificationsRead(profileId: string, claimToken?: string) {
  await request<{ ok: boolean }>(`/api/guest-notifications/read-activity?profileId=${encodeURIComponent(profileId)}&claimToken=${encodeURIComponent(claimToken ?? '')}`, { method: 'POST' });
}

export async function getGuestMessageContacts(accessCode: string, profileId: string, claimToken?: string, displayName?: string) {
  const response = await request<{ contacts: MessageContact[] }>(`/api/guest-message-contacts?accessCode=${encodeURIComponent(accessCode)}&profileId=${encodeURIComponent(profileId)}&claimToken=${encodeURIComponent(claimToken ?? '')}&displayName=${encodeURIComponent(displayName ?? '')}`);
  return response.contacts;
}

export async function registerGuestPresence(accessCode: string, profile: { id: string; mode: 'guest'; displayName: string; avatarUrl?: string; claimToken?: string }) {
  await request<{ ok: boolean }>('/api/guest-presence', {
    method: 'POST',
    body: JSON.stringify({ accessCode, profile }),
  });
}

export async function sendGuestMessage(accessCode: string, profile: { id: string; displayName: string; claimToken?: string }, recipientId: string, body: string) {
  await request<{ ok: boolean }>('/api/guest-messages', {
    method: 'POST',
    body: JSON.stringify({ accessCode, profile, recipientId, body }),
  });
}

export async function createConversation(accessCode: string, registryId: string, profile: { id: string; mode: string; displayName: string; claimToken?: string }, members: MessageContact[]) {
  const response = await request<{ conversationId: string }>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ accessCode, registryId, profile, members }),
  });
  return response.conversationId;
}

export async function sendConversationMessage(conversationId: string, profile: { id: string; displayName: string; claimToken?: string }, body: string) {
  await request<{ ok: boolean }>('/api/conversation-messages', {
    method: 'POST',
    body: JSON.stringify({ conversationId, profile, body }),
  });
}

export async function leaveConversation(chat: { conversationId?: string; registryId: string; participantIds: string[] }, profile: { id: string; claimToken?: string }) {
  const path = chat.conversationId ? `/api/conversations/${encodeURIComponent(chat.conversationId)}/leave` : '/api/conversations/leave';
  await request<{ ok: boolean }>(path, { method: 'POST', body: JSON.stringify({ ...chat, profile }) });
}

export async function deleteNotification(notificationId: string) {
  await request<{ ok: boolean }>(`/api/notifications/${encodeURIComponent(notificationId)}`, { method: 'DELETE' });
}

export async function deleteAllNotifications() {
  await request<{ ok: boolean }>('/api/notifications', { method: 'DELETE' });
}

export async function deleteGuestNotification(notificationId: string, profileId: string, claimToken?: string) {
  await request<{ ok: boolean }>(`/api/guest-notifications/${encodeURIComponent(notificationId)}?profileId=${encodeURIComponent(profileId)}&claimToken=${encodeURIComponent(claimToken ?? '')}`, { method: 'DELETE' });
}

export async function deleteAllGuestNotifications(profileId: string, claimToken?: string) {
  await request<{ ok: boolean }>(`/api/guest-notifications?profileId=${encodeURIComponent(profileId)}&claimToken=${encodeURIComponent(claimToken ?? '')}`, { method: 'DELETE' });
}
