import {
  ArrowRight,
  BookOpen,
  Gift as GiftIcon,
  LogOut,
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
  getSharedRegistry,
  getStoredSession,
  saveAccountRegistries,
  signIn,
  updateSharedClaim,
  updateAccountProfile,
} from "./lib/accountStore";
import type { ProfileDetails, RecipientAccount } from "./lib/accountStore";
import type {
  ClaimFilter,
  ClaimState,
  Gift,
  GiftGiverProfile,
  GiftGiverSortOption,
  Registry,
  SortOption,
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
  const [recipientCategory, setRecipientCategory] = useState("all");
  const [recipientSort, setRecipientSort] = useState<SortOption>("recent");
  const [giverCategory, setGiverCategory] = useState("all");
  const [giverSort] = useState<GiftGiverSortOption>("claim-state");
  const [giverClaimFilter, setGiverClaimFilter] = useState<ClaimFilter>("all");
  const [giverDependenciesOnly, setGiverDependenciesOnly] = useState(false);
  const [giftGiverProfile, setGiftGiverProfile] = useState<GiftGiverProfile>({
    id: "demo-viewer",
    mode: "guest",
    displayName: "",
  });
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
  const [listSetupMode, setListSetupMode] = useState<"create" | "edit">("create");
  const [showProfile, setShowProfile] = useState(false);
  const [activeSharedCode, setActiveSharedCode] = useState(sharedCode);
  const giverRegistry = sharedRegistry ?? registry;

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      try {
        const storedAccount = await getStoredSession();
        if (cancelled) return;
        setAccount(storedAccount);
        if (sharedCode) {
          setAccessCode(sharedCode);
          try {
            const nextSharedRegistry = await getSharedRegistry(sharedCode);
            if (cancelled) return;
            setSharedRegistry(nextSharedRegistry);
            setActiveSharedCode(sharedCode);
            setWorkspace("giver");
            if (storedAccount) {
              setGiftGiverProfile({
                id: storedAccount.id,
                mode: "account",
                displayName: storedAccount.name,
                avatarUrl: storedAccount.avatarUrl,
              });
              setIsUnlocked(true);
            }
          } catch (error) {
            if (!cancelled) setAccessError(error instanceof Error ? error.message : "That shared list could not be opened.");
          }
        }
        if (storedAccount) {
          const nextRegistries = await getAccountRegistries(storedAccount);
          if (cancelled) return;
          setRegistries(nextRegistries);
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

  const recipientView = useMemo(
    () =>
      createRecipientView(registry, {
        category: recipientCategory,
        sort: recipientSort,
      }),
    [registry, recipientCategory, recipientSort],
  );
  const giftGiverView = useMemo(
    () =>
      (isUnlocked || Boolean(sharedRegistry))
        ? createGiftGiverView(giverRegistry, giverRegistry.claims, {
            category: giverCategory,
            sort: giverSort,
            claimFilter: giverClaimFilter,
            dependenciesOnly: giverDependenciesOnly,
          })
        : null,
    [
      giverRegistry,
      isUnlocked,
      sharedRegistry,
      giverCategory,
      giverSort,
      giverClaimFilter,
      giverDependenciesOnly,
    ],
  );
  const totalValue = registry.gifts.reduce(
    (sum, gift) => sum + (gift.price ?? 0),
    0,
  );

  const unlockRegistry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = accessCode.trim().toUpperCase();
    if (sharedRegistry?.accessCode === code) {
      setIsUnlocked(true);
      setAccessError("");
      return;
    }
    try {
      const nextSharedRegistry = await getSharedRegistry(code);
      setSharedRegistry(nextSharedRegistry);
      setActiveSharedCode(code);
      setIsUnlocked(true);
      setAccessError("");
    } catch (error) {
      setIsUnlocked(false);
      setAccessError(error instanceof Error ? error.message : "That code does not match this registry.");
    }
  };

  const updateClaim = async (giftId: string, state: ClaimState) => {
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
      setWorkspace("recipient");
      setShowProfile(false);
      setShowListSetup(false);
      const nextRegistries = await getAccountRegistries(nextAccount);
      setRegistries(nextRegistries);
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
    setWorkspace("recipient");
    setRegistries([]);
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

  const openNewList = () => {
    setListName("");
    setListOccasion("");
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
    const newRegistry: Registry = {
      ...initialRegistry,
      id: `registry-${Date.now()}`,
      listName: name,
      occasion: listOccasion.trim(),
      ownerName: account.name,
      accessCode: crypto.randomUUID().slice(0, 6).toUpperCase(),
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
              <button aria-label="Log out" className="icon-button" onClick={signOut} title="Log out" type="button">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button className="text-button" onClick={() => setWorkspace("recipient")} type="button">
              Create account <ArrowRight size={15} />
            </button>
          )}
        </div>
      </header>
      <nav className="role-tabs" aria-label="Workspace">
        <button className={workspace === "recipient" ? "active" : ""} onClick={() => setWorkspace("recipient")} type="button">
          <BookOpen size={17} /> My list
        </button>
        <button className={workspace === "giver" ? "active" : ""} onClick={() => setWorkspace("giver")} type="button">
          <UsersRound size={17} /> I have a code
        </button>
      </nav>
      {workspace === "recipient" ? (
        <RecipientWorkspace
          registry={registry}
          registries={registries}
          activeRegistryId={activeRegistryId}
          recipientView={recipientView}
          totalValue={totalValue}
          recipientCategory={recipientCategory}
          recipientSort={recipientSort}
          copied={copied}
          showAddGift={showAddGift}
          showListSettings={showListSettings}
          editingGiftId={editingGiftId}
          newGift={newGift}
          newCategory={newCategory}
          newStatus={newStatus}
          setRecipientCategory={setRecipientCategory}
          setRecipientSort={setRecipientSort}
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
        />
      ) : (
        <GiverWorkspace
          registry={giverRegistry}
          view={giftGiverView}
          profile={giftGiverProfile}
          accessCode={accessCode}
          accessError={accessError}
          unlocked={isUnlocked}
          category={giverCategory}
          claimFilter={giverClaimFilter}
          dependenciesOnly={giverDependenciesOnly}
          setAccessCode={setAccessCode}
          setProfile={setGiftGiverProfile}
          setCategory={setGiverCategory}
          setClaimFilter={setGiverClaimFilter}
          setDependenciesOnly={setGiverDependenciesOnly}
          unlock={unlockRegistry}
          setUnlocked={setIsUnlocked}
          updateClaim={updateClaim}
        />
      )}
      <footer>
        <span>HaulBoard</span>
        <span>Make a list. Share it.</span>
      </footer>
    </main>
  );
}

export default App;
