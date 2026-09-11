import {
  ArrowRight,
  Bell,
  BookOpen,
  Gift as GiftIcon,
  LogOut,
  MessageCircle,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type SetStateAction } from "react";
import "./App.css";
import { AuthScreen } from "./components/AuthScreen";
import { GiverWorkspace } from "./components/GiverWorkspace.tsx";
import { ListSetup } from "./components/ListSetup";
import { ProfileScreen } from "./components/ProfileScreen";
import { RecipientWorkspace } from "./components/RecipientWorkspace";
import { CommunicationPanel } from "./components/CommunicationPanel";
import { registry as initialRegistry } from "./data/registry";
import {
  createGiftGiverView,
  createRecipientView,
  updateGiftClaim,
} from "./lib/projections";
import {
  clearSession,
  createAccount,
  getAccountRegistries,
  getSavedRegistries,
  getNotifications,
  getMessages,
  getMessageContacts,
  getGuestMessages,
  getGuestNotifications,
  deleteNotification,
  deleteAllNotifications,
  deleteGuestNotification,
  deleteAllGuestNotifications,
  getGuestMessageContacts,
  registerGuestPresence,
  createConversation,
  sendConversationMessage,
  leaveConversation,
  markMessageNotificationsRead,
  markActivityNotificationsRead,
  markGuestMessageNotificationsRead,
  markGuestActivityNotificationsRead,
  getSharedRegistry,
  getStoredSession,
  saveAccountRegistries,
  saveSharedRegistry,
  removeSavedRegistry,
  signIn,
  updateSharedClaim,
  updateAccountProfile,
} from "./lib/accountStore";
import type { AppMessage, AppNotification, MessageContact, ProfileDetails, RecipientAccount } from "./lib/accountStore";
import type {
  ClaimFilter,
  ClaimState,
  Gift,
  GiftGiverProfile,
  GiftFilters,
  Registry,
} from "./types";

type Workspace = "recipient" | "giver";

type GiftDraft = Omit<Gift, "id" | "addedAt">;

const blankGift: GiftDraft = {
  title: "",
  description: "",
  imageUrl: "",
  linkUrl: "",
  price: undefined,
  categoryId: "",
  status: "",
  dependsOn: [],
  dependencyText: "",
};

const guestProfileStorageKey = "giftregistry_guest_profile";

function getStoredGuestProfile(): GiftGiverProfile {
  try {
    const storedProfile = JSON.parse(window.localStorage.getItem(guestProfileStorageKey) ?? "null") as Partial<GiftGiverProfile> | null;
    if (storedProfile?.id && storedProfile.mode === "guest") {
      return {
        id: storedProfile.id,
        mode: "guest",
        displayName: storedProfile.displayName ?? "",
        avatarUrl: storedProfile.avatarUrl,
        claimToken: storedProfile.claimToken ?? crypto.randomUUID(),
      };
    }
  } catch {
    return { id: `guest-${crypto.randomUUID()}`, mode: "guest", displayName: "", claimToken: crypto.randomUUID() };
  }
  return { id: `guest-${crypto.randomUUID()}`, mode: "guest", displayName: "", claimToken: crypto.randomUUID() };
}

function normaliseLink(link: string) {
  const trimmedLink = link.trim();
  return trimmedLink && !/^https?:\/\//i.test(trimmedLink)
    ? `https://${trimmedLink}`
    : trimmedLink;
}

function App() {
  const sharedCode = new URLSearchParams(window.location.search).get("list")?.trim().toUpperCase() ?? "";
  const [account, setAccount] = useState<RecipientAccount | null>(null);
  const [registries, setRegistries] = useState<Registry[]>([]);
  const [savedRegistries, setSavedRegistries] = useState<Registry[]>([]);
  const [sharedRegistry, setSharedRegistry] = useState<Registry | null>(null);
  const [activeRegistryId, setActiveRegistryId] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const registry = registries.find((item) => item.id === activeRegistryId) ?? initialRegistry;
  const setRegistry = (update: SetStateAction<Registry>) => {
    setRegistries((current) =>
      current.map((item) =>
        item.id === activeRegistryId
          ? typeof update === "function"
            ? update(item)
            : update
          : item,
      ),
    );
  };
  const [workspace, setWorkspace] = useState<Workspace>(() => sharedCode ? "giver" : "recipient");
  const [recipientFilters, setRecipientFilters] = useState<GiftFilters>({ sort: "name-asc", categoryIds: [], statusIds: [], minPrice: undefined, maxPrice: undefined, dependency: "all", dependentOnGiftId: "" });
  const [giverFilters, setGiverFilters] = useState<GiftFilters>({ sort: "name-asc", categoryIds: [], statusIds: [], minPrice: undefined, maxPrice: undefined, dependency: "all", dependentOnGiftId: "" });
  const [giverClaimFilter, setGiverClaimFilter] = useState<ClaimFilter>("all");
  const [giftGiverProfile, setGiftGiverProfile] = useState<GiftGiverProfile>(getStoredGuestProfile);
  const [accessCode, setAccessCode] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [showAddGift, setShowAddGift] = useState(false);
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [newGift, setNewGift] = useState<GiftDraft>(blankGift);
  const [copied, setCopied] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#e5c7b8");
  const [newStatusColor, setNewStatusColor] = useState("#d9e7b8");
  const [showListSettings, setShowListSettings] = useState(false);
  const [authMode, setAuthMode] = useState<"create" | "sign-in">("create");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [listName, setListName] = useState("");
  const [listOccasion, setListOccasion] = useState("");
  const [showListSetup, setShowListSetup] = useState(false);
  const [listSetupMode, setListSetupMode] = useState<"create" | "edit" | "duplicate">("create");
  const [duplicateSource, setDuplicateSource] = useState<Registry | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showOwnListsPrompt, setShowOwnListsPrompt] = useState(false);
  const [activeSharedCode, setActiveSharedCode] = useState(sharedCode);
  const [showCommunication, setShowCommunication] = useState(false);
  const [communicationMode, setCommunicationMode] = useState<"notifications" | "messages">("notifications");
  const [focusContactId, setFocusContactId] = useState<string | undefined>();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [messageContacts, setMessageContacts] = useState<MessageContact[]>([]);
  const unreadMessageCount = notifications.filter((notification) => !notification.read_at && notification.type === "message").length;
  const unreadActivityCount = notifications.filter((notification) => !notification.read_at && notification.type !== "message").length;
  const giverRegistry = sharedRegistry ?? registry;

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      try {
        const storedAccount = await getStoredSession();
        if (cancelled) return;
        setAccount(storedAccount);
        if (storedAccount) {
          setGiftGiverProfile({
            id: storedAccount.id,
            mode: "account",
            displayName: storedAccount.name,
            avatarUrl: storedAccount.avatarUrl,
          });
        }
        if (sharedCode) {
          setAccessCode(sharedCode);
          try {
            const nextSharedRegistry = await getSharedRegistry(sharedCode);
            if (cancelled) return;
            if (!storedAccount) {
              const guestProfile = getStoredGuestProfile();
              await registerGuestPresence(sharedCode, { ...guestProfile, mode: "guest" });
            }
            setSharedRegistry(nextSharedRegistry);
            setActiveSharedCode(sharedCode);
            setWorkspace("giver");
            setIsUnlocked(true);
            if (storedAccount) {
              setGiftGiverProfile({
                id: storedAccount.id,
                mode: "account",
                displayName: storedAccount.name,
                avatarUrl: storedAccount.avatarUrl,
              });
            }
          } catch (error) {
            if (!cancelled) setAccessError(error instanceof Error ? error.message : "That shared list could not be opened.");
          }
        }
        if (storedAccount) {
          const nextRegistries = await getAccountRegistries(storedAccount);
          const nextSavedRegistries = await getSavedRegistries();
          if (cancelled) return;
          setRegistries(nextRegistries);
          setSavedRegistries(nextSavedRegistries);
          setActiveRegistryId(nextRegistries[0]?.id ?? "");
        }
      } finally {
        if (!cancelled) setSessionReady(true);
      }
    };
    void restoreSession();
    return () => { cancelled = true; };
  }, [sharedCode]);

  useEffect(() => {
    if (account && sessionReady) void saveAccountRegistries(account, registries);
  }, [account, registries, sessionReady]);

  useEffect(() => {
    if (!isUnlocked || !activeSharedCode) return;
    let cancelled = false;
    const refreshSharedRegistry = async () => {
      try {
        const nextRegistry = await getSharedRegistry(activeSharedCode);
        if (!cancelled) setSharedRegistry((current) => current && current.accessCode === nextRegistry.accessCode ? nextRegistry : current);
      } catch {
        // Keep the current list visible if a background refresh briefly fails.
      }
    };
    const interval = window.setInterval(() => void refreshSharedRegistry(), 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [activeSharedCode, isUnlocked]);

  useEffect(() => {
    if ((!account && !sharedRegistry) || !sessionReady) return;
    let cancelled = false;
    const refreshCommunication = async () => {
      const [notificationsResult, messagesResult, contactsResult] = await Promise.allSettled([
        account ? getNotifications() : getGuestNotifications(giftGiverProfile.id, giftGiverProfile.claimToken),
        account ? getMessages() : getGuestMessages(giftGiverProfile.id, giftGiverProfile.claimToken),
        account ? getMessageContacts() : getGuestMessageContacts(activeSharedCode, giftGiverProfile.id, giftGiverProfile.claimToken, giftGiverProfile.displayName),
      ]);
      if (cancelled) return;
      if (notificationsResult.status === "fulfilled") setNotifications(notificationsResult.value);
      if (messagesResult.status === "fulfilled") setMessages(messagesResult.value);
      if (contactsResult.status === "fulfilled") setMessageContacts(contactsResult.value);
    };
    void refreshCommunication();
    const interval = window.setInterval(() => void refreshCommunication(), 15000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [account, activeSharedCode, giftGiverProfile.claimToken, giftGiverProfile.displayName, giftGiverProfile.id, sessionReady, sharedRegistry]);

  const recipientView = useMemo(
    () =>
      createRecipientView(registry, {
        ...recipientFilters,
      }),
    [registry, recipientFilters],
  );
  const giftGiverView = useMemo(
    () =>
      (isUnlocked || Boolean(sharedRegistry))
        ? createGiftGiverView(giverRegistry, giverRegistry.claims, {
            ...giverFilters,
            claimFilter: giverClaimFilter,
          })
        : null,
    [
      giverRegistry,
      isUnlocked,
      sharedRegistry,
      giverFilters,
      giverClaimFilter,
    ],
  );
  const totalValue = registry.gifts.reduce(
    (sum, gift) => sum + (gift.price ?? 0),
    0,
  );

  const unlockRegistry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = accessCode.trim().toUpperCase();
    if (!account) {
      const guestName = giftGiverProfile.displayName.trim();
      const storedGuestProfile = getStoredGuestProfile();
      const guestProfileChanged = storedGuestProfile.displayName.trim() !== guestName;
      const guestProfile = guestProfileChanged ? {
        id: `guest-${crypto.randomUUID()}`,
        mode: "guest" as const,
        displayName: guestName,
        claimToken: crypto.randomUUID(),
      } : { ...giftGiverProfile, mode: "guest" as const, displayName: guestName };
      window.localStorage.setItem(guestProfileStorageKey, JSON.stringify(guestProfile));
      setGiftGiverProfile(guestProfile);
    }
    if (sharedRegistry?.accessCode === code) {
      setIsUnlocked(true);
      setAccessError("");
      return;
    }
    try {
      const nextSharedRegistry = await getSharedRegistry(code);
      if (!account) {
        const guestProfile = getStoredGuestProfile();
        await registerGuestPresence(code, { ...guestProfile, mode: "guest" });
      }
      setSharedRegistry(nextSharedRegistry);
      setActiveSharedCode(code);
      setIsUnlocked(true);
      setAccessError("");
    } catch (error) {
      setIsUnlocked(false);
      setAccessError(error instanceof Error ? error.message : "That code does not match this registry.");
    }
  };

  const updateClaim = async (giftId: string, state: ClaimState | null) => {
    if (sharedRegistry && activeSharedCode) {
      const nextRegistry = await updateSharedClaim(activeSharedCode, giftId, giftGiverProfile, state);
      setSharedRegistry(nextRegistry);
      return;
    }
    setRegistry((current) => ({
      ...current,
      claims: updateGiftClaim(current.claims, giftId, giftGiverProfile, state),
    }));
  };

  const addGift = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newGift.title.trim()) return;
    setRegistry((current) => ({
      ...current,
      gifts: editingGiftId
        ? current.gifts.map((gift) =>
            gift.id === editingGiftId
              ? {
                  ...gift,
                  ...newGift,
                  title: newGift.title.trim(),
                  linkUrl: normaliseLink(newGift.linkUrl ?? ""),
                }
              : gift,
          )
        : [
            ...current.gifts,
            {
              ...newGift,
              id: `gift-${Date.now()}`,
              title: newGift.title.trim(),
              linkUrl: normaliseLink(newGift.linkUrl ?? ""),
              addedAt: new Date().toISOString(),
            },
          ],
    }));
    setNewGift({ ...blankGift });
    setEditingGiftId(null);
    setShowAddGift(false);
  };

  const editGift = (giftId: string) => {
    const gift = registry.gifts.find((item) => item.id === giftId);
    if (!gift) return;
    setNewGift(gift);
    setEditingGiftId(giftId);
    setShowAddGift(true);
  };

  const deleteGift = (giftId: string) =>
    setRegistry((current) => ({
      ...current,
      gifts: current.gifts.filter((gift) => gift.id !== giftId),
      claims: current.claims.filter((claim) => claim.giftId !== giftId),
    }));

  const addCategory = (assignToGift = true) => {
    if (!newCategory.trim()) return;
    const id = newCategory.trim().toLowerCase().replace(/\s+/g, "-");
    setRegistry((current) => ({
      ...current,
      categories: current.categories.some((category) => category.id === id)
        ? current.categories
        : [...current.categories, { id, name: newCategory.trim(), color: newCategoryColor }],
    }));
    if (assignToGift) setNewGift((current) => ({ ...current, categoryId: id }));
    setNewCategory("");
    setNewCategoryColor("#e5c7b8");
  };

  const addStatus = (assignToGift = true) => {
    if (!newStatus.trim()) return;
    const id = newStatus.trim().toLowerCase().replace(/\s+/g, "-");
    setRegistry((current) => ({
      ...current,
      statuses: current.statuses.some((status) => status.id === id)
        ? current.statuses
        : [...current.statuses, { id, name: newStatus.trim(), color: newStatusColor }],
    }));
    if (assignToGift) setNewGift((current) => ({ ...current, status: id }));
    setNewStatus("");
    setNewStatusColor("#d9e7b8");
  };

  const updateCategoryColor = (categoryId: string, color: string) => {
    setRegistry((current) => ({
      ...current,
      categories: current.categories.map((category) =>
        category.id === categoryId ? { ...category, color } : category,
      ),
    }));
  };

  const updateStatusColor = (statusId: string, color: string) => {
    setRegistry((current) => ({
      ...current,
      statuses: current.statuses.map((status) =>
        status.id === statusId ? { ...status, color } : status,
      ),
    }));
  };

  const deleteCategory = (categoryId: string) => {
    setRegistry((current) => ({
      ...current,
      categories: current.categories.filter(
        (category) => category.id !== categoryId,
      ),
      gifts: current.gifts.map((gift) =>
        gift.categoryId === categoryId
          ? { ...gift, categoryId: undefined }
          : gift,
      ),
    }));
    setNewGift((current) =>
      current.categoryId === categoryId
        ? { ...current, categoryId: undefined }
        : current,
    );
  };

  const deleteStatus = (statusId: string) => {
    setRegistry((current) => ({
      ...current,
      statuses: current.statuses.filter((status) => status.id !== statusId),
      gifts: current.gifts.map((gift) =>
        gift.status === statusId ? { ...gift, status: undefined } : gift,
      ),
    }));
    setNewGift((current) =>
      current.status === statusId ? { ...current, status: undefined } : current,
    );
  };

  const handleImageFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () =>
      setNewGift((current) => ({
        ...current,
        imageUrl: String(reader.result ?? ""),
      })),
    );
    reader.readAsDataURL(file);
  };

  const copyCode = async () => {
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("list", registry.accessCode);
    await navigator.clipboard?.writeText(shareUrl.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    try {
      const authenticatedAccount =
        authMode === "create"
          ? await createAccount(
              authName,
              authEmail,
              authPassword,
            )
          : await signIn(authEmail, authPassword);
      const nextAccount = (await getStoredSession()) ?? authenticatedAccount;
      setAccount(nextAccount);
      setGiftGiverProfile({
        id: nextAccount.id,
        mode: "account",
        displayName: nextAccount.name,
        avatarUrl: nextAccount.avatarUrl,
      });
      setSharedRegistry(null);
      setActiveSharedCode("");
      setIsUnlocked(false);
      setAccessCode("");
      setWorkspace("recipient");
      setShowProfile(false);
      setShowListSetup(false);
      const nextRegistries = await getAccountRegistries(nextAccount);
      const nextSavedRegistries = await getSavedRegistries();
      setRegistries(nextRegistries);
      setSavedRegistries(nextSavedRegistries);
      setActiveRegistryId(nextRegistries[0]?.id ?? "");
      setAuthPassword("");
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to create your account.",
      );
    }
  };

  const signOut = () => {
    clearSession();
    setAccount(null);
    setGiftGiverProfile(getStoredGuestProfile());
    setWorkspace("recipient");
    setRegistries([]);
    setSavedRegistries([]);
    setActiveRegistryId("");
    setShowListSetup(false);
    setListSetupMode("create");
    setShowProfile(false);
  };

  const selectRegistry = (registryId: string) => {
    setActiveRegistryId(registryId);
    setWorkspace("recipient");
    setIsUnlocked(false);
    setAccessError("");
  };

  const openSavedRegistry = (savedRegistry: Registry) => {
    setSharedRegistry(savedRegistry);
    setActiveSharedCode(savedRegistry.accessCode);
    setAccessCode(savedRegistry.accessCode);
    setIsUnlocked(true);
    setWorkspace("giver");
    if (account) {
      setGiftGiverProfile({
        id: account.id,
        mode: "account",
        displayName: account.name,
        avatarUrl: account.avatarUrl,
      });
    }
  };

  const openOwnLists = () => {
    if (!account && sharedRegistry) {
      setShowOwnListsPrompt(true);
      return;
    }
    setWorkspace("recipient");
  };

  const signInForOwnLists = () => {
    setShowOwnListsPrompt(false);
    setAuthMode("sign-in");
    setWorkspace("recipient");
  };

  const saveCurrentSharedRegistry = async () => {
    if (!account || !sharedRegistry) return;
    const savedRegistry = await saveSharedRegistry(sharedRegistry.accessCode);
    setSavedRegistries((current) =>
      current.some((item) => item.accessCode === savedRegistry.accessCode)
        ? current
        : [...current, savedRegistry],
    );
  };

  const removeSavedRegistryByCode = async (accessCodeToRemove: string) => {
    await removeSavedRegistry(accessCodeToRemove);
    setSavedRegistries((current) => current.filter((item) => item.accessCode !== accessCodeToRemove));
  };

  const removeCurrentSavedRegistry = async () => {
    if (!sharedRegistry) return;
    await removeSavedRegistryByCode(sharedRegistry.accessCode);
  };

  const sendAppMessage = async (recipientIds: string[], registryId: string, body: string, existingConversationId?: string) => {
    if (existingConversationId) {
      await sendConversationMessage(existingConversationId, giftGiverProfile, body);
      setMessages(account ? await getMessages() : await getGuestMessages(giftGiverProfile.id, giftGiverProfile.claimToken));
      return;
    }
    const selectedContacts = messageContacts.filter((contact) => recipientIds.includes(contact.id) && contact.registryId === registryId);
    const conversationId = await createConversation(activeSharedCode, registryId, giftGiverProfile, selectedContacts);
    await sendConversationMessage(conversationId, giftGiverProfile, body);
    setMessages(account ? await getMessages() : await getGuestMessages(giftGiverProfile.id, giftGiverProfile.claimToken));
  };

  const messagePerson = (personId: string, _personName: string) => {
    setCommunicationMode("messages");
    setFocusContactId(messageContacts.some((contact) => contact.id === personId) ? personId : undefined);
    setShowCommunication(true);
  };

  const duplicateList = (sourceRegistry = registry) => {
    setDuplicateSource(sourceRegistry);
    setListName(`${sourceRegistry.listName} copy`);
    setListOccasion(sourceRegistry.occasion);
    setListSetupMode("duplicate");
    setShowListSetup(true);
  };

  const openNewList = () => {
    setListName("");
    setListOccasion("");
    setDuplicateSource(null);
    setListSetupMode("create");
    setShowListSetup(true);
  };

  const openEditList = () => {
    setListName(registry.listName);
    setListOccasion(registry.occasion);
    setListSetupMode("edit");
    setShowListSetup(true);
  };

  const deleteActiveList = () => {
    if (!window.confirm(`Delete "${registry.listName}"? This will remove all gifts on this list.`)) return;
    const remaining = registries.filter((item) => item.id !== activeRegistryId);
    setRegistries(remaining);
    setIsUnlocked(false);
    setAccessError("");
    if (remaining.length > 0) {
      setActiveRegistryId(remaining[0].id);
    } else {
      setActiveRegistryId("");
      setListSetupMode("create");
      setListName("");
      setListOccasion("");
      setShowListSetup(false);
    }
  };

  const saveProfile = async (details: ProfileDetails) => {
    if (!account) return;
    const nextAccount = await updateAccountProfile(account, details);
    setAccount(nextAccount);
    setGiftGiverProfile((current) => ({
      ...current,
      id: nextAccount.id,
      mode: "account",
      displayName: nextAccount.name,
      avatarUrl: nextAccount.avatarUrl,
    }));
    setRegistries((current) =>
      current.map((item) => ({ ...item, ownerName: nextAccount.name })),
    );
  };

  const saveListDetails = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = listName.trim();
    if (!name || !account) return;
    if (listSetupMode === "edit") {
      setRegistry((current) => ({
        ...current,
        listName: name,
        occasion: listOccasion.trim(),
      }));
      setShowListSetup(false);
      setListSetupMode("create");
      setListName("");
      setListOccasion("");
      return;
    }
    const sourceRegistry = listSetupMode === "duplicate" ? (duplicateSource ?? registry) : initialRegistry;
    const newRegistry: Registry = {
      ...sourceRegistry,
      id: `registry-${Date.now()}`,
      listName: name,
      occasion: listOccasion.trim(),
      ownerName: account.name,
      accessCode: crypto.randomUUID().slice(0, 6).toUpperCase(),
      claims: [],
    };
    setRegistries((current) => [...current, newRegistry]);
    setActiveRegistryId(newRegistry.id);
    setShowListSetup(false);
    setListSetupMode("create");
    setListName("");
    setListOccasion("");
  };

  if (!sessionReady) {
    return <main className="app-shell" />;
  }

  if (!account && workspace === "recipient") {
    return (
      <AuthScreen
        authMode={authMode}
        authName={authName}
        authEmail={authEmail}
        authPassword={authPassword}
        authError={authError}
        onModeChange={setAuthMode}
        onNameChange={setAuthName}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSubmit={handleAuthSubmit}
        onOpenGiver={() => setWorkspace("giver")}
      />
    );
  }

  if (account && !sharedRegistry && workspace === "recipient" && showListSetup) {
    return (
      <ListSetup
        listName={listName}
        occasion={listOccasion}
        mode={listSetupMode}
        onListNameChange={setListName}
        onOccasionChange={setListOccasion}
        onSubmit={saveListDetails}
        onCancel={() => {
          setShowListSetup(false);
          setListSetupMode("create");
          setListName("");
          setListOccasion("");
        }}
      />
    );
  }

  if (account && !sharedRegistry && showProfile) {
    return (
      <ProfileScreen
        account={account}
        listCount={registries.length}
        onBack={() => {
          setShowProfile(false);
          setWorkspace("recipient");
        }}
        onSignOut={signOut}
        onSave={saveProfile}
      />
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar" id="top">
        <a className="brand" href="#top">
          <span className="brand-mark"><GiftIcon size={18} /></span>
          HaulBoard
        </a>
        <div className="topbar-actions">
          {account ? (
            <>
              <button aria-label="Open profile" className="icon-button" onClick={() => setShowProfile(true)} title="Profile" type="button">
                {account.avatarUrl ? <img alt="" src={account.avatarUrl} /> : <UserRound size={18} />}
              </button>
              <button aria-label="Open notifications" className="text-button communication-trigger" onClick={() => { setCommunicationMode("notifications"); setFocusContactId(undefined); setShowCommunication(true); }} title="Notifications" type="button">
                <Bell size={16} /> Notifications{unreadActivityCount ? <span className="notification-count">{unreadActivityCount}</span> : null}
              </button>
              <button aria-label="Open Messenger" className="text-button communication-trigger" onClick={() => { setCommunicationMode("messages"); setFocusContactId(undefined); setShowCommunication(true); }} title="Messenger" type="button"><MessageCircle size={16} /> Messenger{unreadMessageCount ? <span className="notification-count message-count">{unreadMessageCount}</span> : null}</button>
              <button aria-label="Log out" className="icon-button" onClick={signOut} title="Log out" type="button">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              {isUnlocked ? <><button className="text-button communication-trigger" onClick={() => { setCommunicationMode("notifications"); setFocusContactId(undefined); setShowCommunication(true); }} type="button"><Bell size={16} /> Notifications{unreadActivityCount ? <span className="notification-count">{unreadActivityCount}</span> : null}</button><button className="text-button communication-trigger" onClick={() => { setCommunicationMode("messages"); setFocusContactId(undefined); setShowCommunication(true); }} type="button"><MessageCircle size={16} /> Messenger{unreadMessageCount ? <span className="notification-count message-count">{unreadMessageCount}</span> : null}</button></> : null}
              <button className="text-button" onClick={() => setWorkspace("recipient")} type="button">Create account <ArrowRight size={15} /></button>
            </>
          )}
        </div>
      </header>
      <nav className="role-tabs" aria-label="Workspace">
        <button className={workspace === "recipient" ? "active" : ""} onClick={openOwnLists} type="button">
          <BookOpen size={17} /> My list
        </button>
        <button className={workspace === "giver" ? "active" : ""} onClick={() => setWorkspace("giver")} type="button">
          <UsersRound size={17} /> Friends & family
        </button>
      </nav>
      {workspace === "recipient" ? (
        <RecipientWorkspace
          registry={registry}
          registries={registries}
          hasOwnList={registries.length > 0}
          activeRegistryId={activeRegistryId}
          recipientView={recipientView}
          totalValue={totalValue}
          filters={recipientFilters}
          copied={copied}
          showAddGift={showAddGift}
          showListSettings={showListSettings}
          editingGiftId={editingGiftId}
          newGift={newGift}
          newCategory={newCategory}
          newStatus={newStatus}
          setFilters={(update) => setRecipientFilters((current) => ({ ...current, ...update }))}
          setNewGift={setNewGift}
          setEditingGiftId={setEditingGiftId}
          setShowAddGift={setShowAddGift}
          setShowListSettings={setShowListSettings}
          setNewCategory={setNewCategory}
          setNewStatus={setNewStatus}
          addGift={addGift}
          addCategory={addCategory}
          addStatus={addStatus}
          deleteCategory={deleteCategory}
          deleteStatus={deleteStatus}
          updateCategoryColor={updateCategoryColor}
          updateStatusColor={updateStatusColor}
          editGift={editGift}
          deleteGift={deleteGift}
          copyCode={copyCode}
          handleImageFile={handleImageFile}
          normaliseLink={normaliseLink}
          onSelectList={selectRegistry}
          onNewList={openNewList}
          onEditList={openEditList}
          onDeleteList={deleteActiveList}
          onDuplicateList={() => duplicateList(registry)}
        />
      ) : (
        <GiverWorkspace
          registry={giverRegistry}
          view={giftGiverView}
          profile={giftGiverProfile}
          accessCode={accessCode}
          accessError={accessError}
          unlocked={isUnlocked}
          filters={giverFilters}
          claimFilter={giverClaimFilter}
          signedIn={Boolean(account)}
          savedRegistries={savedRegistries}
          canSave={Boolean(account && sharedRegistry)}
          saved={Boolean(sharedRegistry && savedRegistries.some((item) => item.accessCode === sharedRegistry.accessCode))}
          setAccessCode={setAccessCode}
          setProfile={setGiftGiverProfile}
          setFilters={(update) => setGiverFilters((current) => ({ ...current, ...update }))}
          setClaimFilter={setGiverClaimFilter}
          unlock={unlockRegistry}
          setUnlocked={setIsUnlocked}
          updateClaim={updateClaim}
          saveList={saveCurrentSharedRegistry}
          removeSavedList={removeCurrentSavedRegistry}
          onRemoveSavedList={(accessCodeToRemove) => {
            if (window.confirm("Remove this saved list?")) void removeSavedRegistryByCode(accessCodeToRemove);
          }}
          onDuplicateList={() => duplicateList(sharedRegistry ?? registry)}
          onOpenSavedList={openSavedRegistry}
          onMessage={messagePerson}
        />
      )}
      {showOwnListsPrompt ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-labelledby="own-lists-prompt-title" aria-modal="true" className="access-prompt" role="dialog">
            <button aria-label="Close" className="access-prompt-close" onClick={() => setShowOwnListsPrompt(false)} type="button">×</button>
            <span className="unlock-art"><BookOpen size={22} /></span>
            <h2 id="own-lists-prompt-title">Sign in to Access your Own Lists</h2>
            <p>Your friend’s list is still open. Sign in to view and manage your own lists.</p>
            <div className="access-prompt-actions">
              <button className="secondary-button" onClick={() => setShowOwnListsPrompt(false)} type="button">Stay on this list</button>
              <button className="primary-button" onClick={signInForOwnLists} type="button">Sign in <ArrowRight size={16} /></button>
            </div>
          </section>
        </div>
      ) : null}
      {showCommunication && (account || isUnlocked) ? <CommunicationPanel key={`${communicationMode}-${focusContactId ?? "communication"}`} panelMode={communicationMode} notifications={notifications} messages={messages} contacts={messageContacts} currentUserId={giftGiverProfile.id} currentUserName={giftGiverProfile.displayName} currentUserAvatar={giftGiverProfile.avatarUrl} focusContactId={focusContactId} onSend={sendAppMessage} onMarkMessageNotificationsRead={() => { void (account ? markMessageNotificationsRead() : markGuestMessageNotificationsRead(giftGiverProfile.id, giftGiverProfile.claimToken)); setNotifications((current) => current.map((notification) => notification.type === "message" ? { ...notification, read_at: notification.read_at ?? new Date().toISOString() } : notification)); }} onLeaveConversation={async (chat) => { await leaveConversation(chat, giftGiverProfile); setMessages(account ? await getMessages() : await getGuestMessages(giftGiverProfile.id)); }} onDeleteNotification={(id) => { void (account ? deleteNotification(id) : deleteGuestNotification(id, giftGiverProfile.id, giftGiverProfile.claimToken)); setNotifications((current) => current.filter((notification) => notification.id !== id)); }} onDeleteAllNotifications={() => { void (account ? deleteAllNotifications() : deleteAllGuestNotifications(giftGiverProfile.id, giftGiverProfile.claimToken)); setNotifications([]); }} onMarkNotificationsRead={() => { void (account ? markActivityNotificationsRead() : markGuestActivityNotificationsRead(giftGiverProfile.id, giftGiverProfile.claimToken)); setNotifications((current) => current.map((notification) => notification.type === "message" ? notification : { ...notification, read_at: notification.read_at ?? new Date().toISOString() })); }} onClose={() => { setShowCommunication(false); setFocusContactId(undefined); }} /> : null}
      <footer>
        <span>HaulBoard</span>
        <span>Make a list. Share it.</span>
      </footer>
    </main>
  );
}

export default App;
