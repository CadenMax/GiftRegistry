import { Bell, MessageCircle, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatComposer } from "./ChatComposer";
import type { AppMessage, AppNotification, MessageContact } from "../lib/accountStore";

type CommunicationPanelProps = {
  notifications: AppNotification[];
  messages: AppMessage[];
  contacts: MessageContact[];
  onSend: (recipientIds: string[], registryId: string, body: string, conversationId?: string) => Promise<void>;
  onMarkNotificationsRead: () => void;
  onClose: () => void;
  focusContactId?: string;
  panelMode?: "notifications" | "messages";
  onDeleteNotification?: (id: string) => void;
  onDeleteAllNotifications?: () => void;
  onLeaveConversation?: (chat: { conversationId?: string; registryId: string; participantIds: string[] }) => Promise<void>;
  onMarkMessageNotificationsRead?: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
};

export function CommunicationPanel({ notifications, messages, contacts, onSend, onMarkNotificationsRead, onClose, focusContactId, panelMode, onDeleteNotification, onDeleteAllNotifications, onLeaveConversation, onMarkMessageNotificationsRead, currentUserId, currentUserName, currentUserAvatar }: CommunicationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [mode, setMode] = useState<"notifications" | "messages">(() => panelMode ?? (focusContactId ? "messages" : "notifications"));
  const [panelPosition, setPanelPosition] = useState<{ left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(() => focusContactId ? [focusContactId] : []);
  const [sending, setSending] = useState(false);
  const [activeChatKey, setActiveChatKey] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [showNewChat, setShowNewChat] = useState(() => Boolean(focusContactId));
  const unreadActivityCount = notifications.filter((notification) => !notification.read_at && notification.type !== "message").length;
  const hasUnreadMessages = notifications.some((notification) => !notification.read_at && notification.type === "message");
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose]);
  const chats = useMemo(() => {
    const grouped = new Map<string, { key: string; conversationId?: string; registryId: string; registryName: string; people: string[]; messages: AppMessage[] }>();
    for (const message of messages) {
      const people = [message.sender_id, message.recipient_id].sort();
      const key = message.conversation_id ?? `${message.registry_id}:${people.join(":")}`;
      const current = grouped.get(key) ?? { key, conversationId: message.conversation_id, registryId: message.registry_id, registryName: "Shared list", people: [], messages: [] };
      const activePeople = message.conversation_people?.split("|||").filter(Boolean);
      current.people = activePeople?.length ? [...new Set(activePeople)] : [...new Set([...current.people, message.sender_name, message.recipient_name])];
      const alreadyShown = current.messages.some((existing) => existing.sender_id === message.sender_id && existing.body === message.body && existing.created_at === message.created_at);
      if (!alreadyShown) current.messages.push(message);
      grouped.set(key, current);
    }
    return [...grouped.values()].sort((left, right) => right.messages.at(-1)?.created_at.localeCompare(left.messages.at(-1)?.created_at ?? "") ?? 0);
  }, [messages]);
  const activeChat = chats.find((chat) => chat.key === activeChatKey) ?? chats[0];
  const chatTitle = (people: string[]) => people.length > 3 ? `${people.slice(0, 2).join(" + ")} + ${people.length - 2} others` : people.join(" + ");
  const previewPeople = (chat: typeof chats[number]) => {
    const currentUserName = chat.messages.find((message) => message.sender_id === currentUserId)?.sender_name
      ?? chat.messages.find((message) => message.recipient_id === currentUserId)?.recipient_name;
    const people = currentUserName
      ? [currentUserName, ...chat.people.filter((person) => person !== currentUserName)]
      : chat.people;
    return people.slice(0, 3);
  };

  const startDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target instanceof Element && event.target.closest("button")) || !panelRef.current) return;
    const panelBounds = panelRef.current.getBoundingClientRect();
    dragOffsetRef.current = { x: event.clientX - panelBounds.left, y: event.clientY - panelBounds.top };
    setPanelPosition({ left: panelBounds.left, top: panelBounds.top });
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const movePanel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !panelRef.current) return;
    const panelBounds = panelRef.current.getBoundingClientRect();
    const left = Math.min(Math.max(8, event.clientX - dragOffsetRef.current.x), window.innerWidth - panelBounds.width - 8);
    const top = Math.min(Math.max(8, event.clientY - dragOffsetRef.current.y), window.innerHeight - panelBounds.height - 8);
    setPanelPosition({ left, top });
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  useEffect(() => {
    if (mode === "notifications" && unreadActivityCount > 0) onMarkNotificationsRead();
    if (mode === "messages" && hasUnreadMessages) onMarkMessageNotificationsRead?.();
  }, [mode, unreadActivityCount, hasUnreadMessages, onMarkNotificationsRead, onMarkMessageNotificationsRead]);

  const avatarFor = (name: string, chat = activeChat) => {
    const memberIndex = chat?.people.indexOf(name) ?? -1;
    const memberId = memberIndex >= 0
      ? chat?.messages.find((message) => message.conversation_member_ids)?.conversation_member_ids?.split("|||")[memberIndex]
      : undefined;
    const memberAvatar = memberIndex >= 0
      ? chat?.messages.find((message) => message.conversation_member_avatars)?.conversation_member_avatars?.split("|||")[memberIndex]
      : undefined;
    const isCurrentUser = name === currentUserName || chat?.messages.some((message) =>
      (message.sender_id === currentUserId && message.sender_name === name)
      || (message.recipient_id === currentUserId && message.recipient_name === name),
    );
    return isCurrentUser ? currentUserAvatar : memberAvatar || (contacts.find((contact) => contact.id === memberId)?.avatarUrl ?? contacts.find((contact) => contact.name === name)?.avatarUrl);
  };

  const sendWithBody = async (message: string) => {
    const selected = contacts.filter((contact) => selectedContactIds.includes(contact.id));
    if (!selected.length || !message.trim()) return;
    setSending(true);
    try {
      const contactsByRegistry = new Map<string, MessageContact[]>();
      for (const contact of selected) contactsByRegistry.set(contact.registryId, [...(contactsByRegistry.get(contact.registryId) ?? []), contact]);
      for (const [registryId, registryContacts] of contactsByRegistry) await onSend(registryContacts.map((contact) => contact.id), registryId, message.trim());
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="communication-panel" ref={panelRef} role="dialog" aria-label="Notifications and messages" style={panelPosition ? { left: panelPosition.left, top: panelPosition.top, right: "auto" } : undefined}>
      <div className={`communication-header${dragging ? " dragging" : ""}`} onPointerDown={startDragging} onPointerMove={movePanel} onPointerUp={stopDragging} title="Drag to move"><div><strong>{mode === "messages" ? "Messages" : "Stay in the loop"}</strong><small>{mode === "messages" ? "Your saved chats" : unreadActivityCount ? `${unreadActivityCount} new notification${unreadActivityCount === 1 ? "" : "s"}` : "Your list activity"}</small></div><button aria-label="Close" className="icon-button" onClick={onClose} type="button"><X size={17} /></button></div>
      {panelMode ? null : <div className="communication-tabs"><button className={mode === "notifications" ? "active" : ""} onClick={() => setMode("notifications")} type="button"><Bell size={15} /> Notifications</button><button className={mode === "messages" ? "active" : ""} onClick={() => setMode("messages")} type="button"><MessageCircle size={15} /> Messages</button></div>}
      {mode === "notifications" ? (
        <div className="communication-feed"><div className="notification-actions">{notifications.length ? <button className="text-button" onClick={onDeleteAllNotifications} type="button">Delete all</button> : null}</div>{notifications.length ? notifications.map((notification) => <article className={notification.read_at ? "communication-item" : "communication-item unread"} key={notification.id}><div className="communication-item-heading"><strong>{notification.title}</strong><button aria-label="Delete notification" className="icon-button" onClick={() => onDeleteNotification?.(notification.id)} type="button"><X size={13} /></button></div><p>{notification.body}</p><small>{new Date(notification.created_at).toLocaleString()}</small></article>) : <p className="communication-empty">No notifications yet.</p>}</div>
      ) : (
        <div className="communication-messages">
          <div className="saved-chats-section"><div className="saved-chats-heading"><strong>Saved chats</strong><button className="text-button" onClick={() => { setShowNewChat(true); setSelectedContactIds([]); }} type="button">New chat</button></div>{chats.length ? <div className="saved-chats-list">{chats.map((chat) => <button className={activeChat?.key === chat.key ? "saved-chat active" : "saved-chat"} key={chat.key} onClick={() => { setActiveChatKey(chat.key); setShowNewChat(false); setShowMembers(false); }} type="button"><span className="chat-avatar-stack">{previewPeople(chat).map((person) => <span key={person}>{avatarFor(person, chat) ? <img alt="" src={avatarFor(person, chat)} /> : person.trim().charAt(0).toUpperCase()}</span>)}</span><span><strong>{chatTitle(chat.people)}</strong><small>{chat.messages.at(-1)?.body ?? "No messages"}</small></span></button>)}</div> : <p className="communication-empty">No saved chats yet.</p>}</div>
          {!showNewChat && activeChat ? <div className="communication-feed active-chat-feed"><div className="active-chat-heading"><div className="chat-title"><strong>{chatTitle(activeChat.people)}</strong><small>{activeChat.people.length} members</small></div><div className="chat-heading-actions"><button aria-expanded={showMembers} className="text-button member-toggle" onClick={() => setShowMembers((current) => !current)} type="button"><Users size={14} /> {showMembers ? "Hide members" : "Members"}</button><button className="text-button" disabled={sending} onClick={async () => { if (!onLeaveConversation) return; const participantIds = [...new Set(activeChat.messages.flatMap((item) => [item.sender_id, item.recipient_id]).filter((id) => id !== currentUserId))]; await onLeaveConversation({ conversationId: activeChat.conversationId, registryId: activeChat.registryId, participantIds }); setActiveChatKey(""); setShowNewChat(false); }} type="button">Leave</button></div></div>{showMembers ? <div className="chat-members"><strong>Members</strong><div className="chat-member-list">{activeChat.people.map((person) => <span className="chat-member" key={person}><span className="contact-avatar">{avatarFor(person) ? <img alt="" src={avatarFor(person)} /> : person.trim().charAt(0).toUpperCase()}</span>{person}</span>)}</div></div> : null}<div className="message-list">{activeChat.messages.map((message) => <article className={`communication-item message-bubble ${message.sender_id === currentUserId ? "outgoing" : "incoming"}`} key={message.id}><strong>{message.sender_name}</strong><p>{message.body}</p><small>{new Date(message.created_at).toLocaleString()}</small></article>)}</div><ChatComposer disabled={sending} onSend={async (message) => { const recipientIds = [...new Set(activeChat.messages.flatMap((item) => [item.sender_id, item.recipient_id]).filter((id) => id !== currentUserId))]; await onSend(recipientIds, activeChat.registryId, message, activeChat.conversationId); }} /></div> : null}
          {showNewChat ? <div className="new-chat-modal"><div className="message-compose"><div className="new-chat-heading"><strong>New chat</strong><button aria-label="Close new chat" className="icon-button" onClick={() => setShowNewChat(false)} type="button"><X size={17} /></button></div><p className="communication-help">Choose one person for a direct chat, or several people to coordinate a gift together.</p><div className="contact-picker">{contacts.length ? contacts.map((contact) => <button className={selectedContactIds.includes(contact.id) ? "contact-card selected" : "contact-card"} key={`${contact.id}-${contact.registryId}`} onClick={() => setSelectedContactIds((current) => current.includes(contact.id) ? current.filter((id) => id !== contact.id) : [...current, contact.id])} type="button"><span className="contact-avatar">{contact.avatarUrl ? <img alt="" src={contact.avatarUrl} /> : contact.name.trim().charAt(0).toUpperCase()}</span><span><strong>{contact.name}</strong><small>{contact.registryName}</small></span></button>) : <p className="communication-empty">No other people are available from this list yet.</p>}</div><ChatComposer disabled={sending || !selectedContactIds.length} onSend={async (message) => { await sendWithBody(message); setSelectedContactIds([]); setShowNewChat(false); }} /></div></div> : null}
        </div>
      )}
    </div>
  );
}
