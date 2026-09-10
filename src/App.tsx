import {
  ArrowRight,
  BookOpen,
  Gift as GiftIcon,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { AuthScreen } from "./components/AuthScreen";
import { GiverWorkspace } from "./components/GiverWorkspace";
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
  getAccountRegistry,
  getStoredSession,
  saveAccountRegistry,
  signIn,
} from "./lib/accountStore";
import type { RecipientAccount } from "./lib/accountStore";
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
  const [account, setAccount] = useState<RecipientAccount | null>(() =>
    getStoredSession(),
  );
  const [registry, setRegistry] = useState<Registry>(() => {
    const storedAccount = getStoredSession();
    return storedAccount
      ? getAccountRegistry(storedAccount, initialRegistry)
      : initialRegistry;
  });
  const [workspace, setWorkspace] = useState<Workspace>("recipient");
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
  const [showListSettings, setShowListSettings] = useState(false);
  const [authMode, setAuthMode] = useState<"create" | "sign-in">("create");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (account) saveAccountRegistry(account, registry);
  }, [account, registry]);

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
      isUnlocked
        ? createGiftGiverView(registry, registry.claims, {
            category: giverCategory,
            sort: giverSort,
            claimFilter: giverClaimFilter,
            dependenciesOnly: giverDependenciesOnly,
          })
        : null,
    [
      registry,
      isUnlocked,
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

  const unlockRegistry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (accessCode.trim().toUpperCase() === registry.accessCode) {
      setIsUnlocked(true);
      setAccessError("");
    } else {
      setIsUnlocked(false);
      setAccessError("That code does not match this registry.");
    }
  };

  const updateClaim = (giftId: string, state: ClaimState) =>
    setRegistry((current) => ({
      ...current,
      claims: updateGiftClaim(current.claims, giftId, giftGiverProfile, state),
    }));

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
        : [...current.categories, { id, name: newCategory.trim() }],
    }));
    if (assignToGift) setNewGift((current) => ({ ...current, categoryId: id }));
    setNewCategory("");
  };

  const addStatus = (assignToGift = true) => {
    if (!newStatus.trim()) return;
    const id = newStatus.trim().toLowerCase().replace(/\s+/g, "-");
    setRegistry((current) => ({
      ...current,
      statuses: current.statuses.some((status) => status.id === id)
        ? current.statuses
        : [...current.statuses, { id, name: newStatus.trim() }],
    }));
    if (assignToGift) setNewGift((current) => ({ ...current, status: id }));
    setNewStatus("");
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
    await navigator.clipboard?.writeText(registry.accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    try {
      const nextAccount =
        authMode === "create"
          ? await createAccount(
              authName,
              authEmail,
              authPassword,
              initialRegistry,
            )
          : await signIn(authEmail, authPassword);
      setAccount(nextAccount);
      setRegistry(getAccountRegistry(nextAccount, initialRegistry));
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
    setRegistry(initialRegistry);
  };

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

  return (
    <main className="app-shell">
      <header className="topbar" id="top">
        <a className="brand" href="#top">
          <span className="brand-mark"><GiftIcon size={18} /></span>
          kindlist
        </a>
        <div className="topbar-actions">
          {account ? (
            <>
              <button className="icon-button" onClick={signOut} title="Sign out" type="button">
                <UserRound size={18} />
              </button>
              <span className="avatar">{account.name.slice(0, 2).toUpperCase()}</span>
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
          editGift={editGift}
          deleteGift={deleteGift}
          copyCode={copyCode}
          handleImageFile={handleImageFile}
          normaliseLink={normaliseLink}
        />
      ) : (
        <GiverWorkspace
          registry={registry}
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
        <span>kindlist</span>
        <span>Thoughtful giving, made simple.</span>
      </footer>
    </main>
  );
}

export default App;
