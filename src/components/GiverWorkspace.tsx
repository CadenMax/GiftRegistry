import { ArrowRight, Bookmark, Copy, Gift as GiftIcon, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { GiftFilterControls } from "./GiftFilterControls";
import { DescriptionDialog } from "./DescriptionDialog";
import type { ClaimFilter, ClaimState, GiftFilters, GiftGiverProfile, GiftGiverView, Registry } from "../types";

type GiverWorkspaceProps = {
    registry: Registry;
    view: GiftGiverView | null;
    profile: GiftGiverProfile;
    accessCode: string;
    accessError: string;
    unlocked: boolean;
    filters: GiftFilters;
    claimFilter: ClaimFilter;
    signedIn: boolean;
    savedRegistries: Registry[];
    canSave: boolean;
    saved: boolean;
    setAccessCode: (value: string) => void;
    setProfile: (value: GiftGiverProfile) => void;
    setFilters: (update: Partial<GiftFilters>) => void;
    setClaimFilter: (value: ClaimFilter) => void;
    unlock: (event: FormEvent<HTMLFormElement>) => void;
    setUnlocked: (value: boolean) => void;
    updateClaim: (giftId: string, state: ClaimState | null, purchasedItems?: string[]) => void;
    saveList: () => void;
    removeSavedList: () => void;
    onRemoveSavedList: (accessCode: string) => void;
    onDuplicateList: () => void;
    onOpenSavedList: (registry: Registry) => void;
    onMessage: (personId: string, personName: string) => void;
};

function profileInitial(profile: GiftGiverProfile) {
    return profile.displayName.trim().charAt(0).toUpperCase() || "?";
}

function ProfileBadge({ profile }: { profile: GiftGiverProfile }) {
    return profile.avatarUrl ? (
        <span className="avatar" title={profile.displayName}>
            <img alt="" src={profile.avatarUrl} />
        </span>
    ) : (
        <span className="avatar" title={profile.displayName || "Guest giver"}>{profileInitial(profile)}</span>
    );
}

function OwnerBadge({ registry }: { registry: Registry }) {
    const initial = registry.ownerName.trim().charAt(0).toUpperCase() || "?";
    return (
        <div className="list-owner-card">
            {registry.ownerAvatarUrl ? <img alt="" className="list-owner-avatar" src={registry.ownerAvatarUrl} /> : <span className="list-owner-avatar list-owner-initial">{initial}</span>}
            <span><small>Gift list from</small><strong>{registry.ownerName || "A friend"}</strong></span>
        </div>
    );
}

function ClaimPeople({ people, onMessage }: { people: GiftGiverView["gifts"][number]["claimPeople"]; onMessage: (personId: string, personName: string) => void }) {
    const considering = people.filter((person) => person.state === "considering");
    const bought = people.filter((person) => person.state === "claimed");
    const peopleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const closeOtherDetails = (event: PointerEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            const clickedDetails = target?.closest(".claim-person-items");
            peopleRef.current?.querySelectorAll<HTMLDetailsElement>(".claim-person-items[open]").forEach((details) => {
                if (details !== clickedDetails) details.removeAttribute("open");
            });
        };
        document.addEventListener("pointerdown", closeOtherDetails);
        return () => document.removeEventListener("pointerdown", closeOtherDetails);
    }, []);

    if (people.length === 0) return null;

    return (
        <div className="claim-people" ref={peopleRef}>
            {considering.length > 0 ? <ClaimPeopleRow label="Considering" people={considering} onMessage={onMessage} /> : null}
            {bought.length > 0 ? <ClaimPeopleRow label="Bought by" people={bought} onMessage={onMessage} /> : null}
        </div>
    );
}

function ClaimPeopleRow({ label, people, onMessage }: { label: string; people: GiftGiverView["gifts"][number]["claimPeople"]; onMessage: (personId: string, personName: string) => void }) {
    return (
        <div className="claim-people-row">
            <span className="claim-people-label">{label}</span>
            <span className="claim-people-list">
                {people.map((person) => (
                    <div className="claim-person" key={`${person.id}-${person.state}`}>
                        <button className="claim-person-main" onClick={() => onMessage(person.id, person.name)} title={`Message ${person.name}`} type="button"><span className="claim-person-avatar">{person.avatarUrl ? <img alt="" src={person.avatarUrl} /> : person.name.trim().charAt(0).toUpperCase() || "?"}</span><span className="claim-person-details">{person.name}</span></button>
                        {person.purchasedItems?.length ? <details className="claim-person-items"><summary>View items</summary><ul>{person.purchasedItems.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></details> : null}
                    </div>
                ))}
            </span>
        </div>
    );
}

function ownsClaim(gift: GiftGiverView["gifts"][number], viewerName: string, state: ClaimState) {
    const nameKey = viewerName.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
    return gift.claimPeople.some((person) => person.name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase() === nameKey && person.state === state);
}

function claimItemsFor(gift: GiftGiverView["gifts"][number], viewerName: string) {
    const viewerNameKey = viewerName.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
    const ownClaim = gift.claimPeople.find((person) => person.name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase() === viewerNameKey && person.state === "claimed");
    return ownClaim?.purchasedItems ?? [];
}

type ClaimActionsProps = {
    gift: GiftGiverView["gifts"][number];
    viewerName: string;
    updateClaim: (giftId: string, state: ClaimState | null, purchasedItems?: string[]) => void;
    claimItemGiftId: string | null;
    setClaimItemGiftId: (giftId: string | null) => void;
    claimItems: string[];
    setClaimItems: (items: string[]) => void;
    newClaimItem: string;
    setNewClaimItem: (value: string) => void;
};

function ClaimActions({ gift, viewerName, updateClaim, claimItemGiftId, setClaimItemGiftId, claimItems, setClaimItems, newClaimItem, setNewClaimItem }: ClaimActionsProps) {
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const ownClaim = ownsClaim(gift, viewerName, "claimed");
    const openItemForm = () => {
        setClaimItemGiftId(gift.id);
        setClaimItems(claimItemsFor(gift, viewerName));
        setNewClaimItem("");
    };
    const saveItems = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const items = [...claimItems, newClaimItem.trim()].filter(Boolean);
        if (items.length === 0 && !ownClaim) return;
        updateClaim(gift.id, "claimed", items);
        setClaimItemGiftId(null);
    };

    return <>
        <div className="gift-actions">
            {!(gift.isListInList && ownClaim) ? <button disabled={!gift.isListInList && gift.claimState === "claimed"} onClick={() => updateClaim(gift.id, ownsClaim(gift, viewerName, "considering") ? null : "considering")} type="button">{ownsClaim(gift, viewerName, "considering") ? "Undo considering this" : "I am considering this"}</button> : null}
            {gift.isListInList ? <button onClick={openItemForm} type="button">{ownClaim ? "Add or edit items" : "I am buying from this list"}</button> : <button disabled={gift.claimState === "claimed" && !ownClaim} onClick={() => updateClaim(gift.id, ownClaim ? null : "claimed")} type="button">{ownClaim ? "Undo buying this" : "I am buying this"}</button>}
        </div>
        {gift.isListInList && claimItemGiftId === gift.id ? <form className="claim-item-form" onSubmit={saveItems}>
            <div className="claim-item-list">{claimItems.map((item, index) => <div className="claim-item-row" key={`${item}-${index}`}>
                {editingItemIndex === index ? <input autoFocus aria-label={`Purchased item ${index + 1}`} maxLength={240} onBlur={() => setEditingItemIndex(null)} onChange={(event) => setClaimItems(claimItems.map((current, itemIndex) => itemIndex === index ? event.target.value : current))} onKeyDown={(event) => { if (event.key === "Enter") setEditingItemIndex(null); }} value={item} /> : <button className="claim-item-label" onClick={() => setEditingItemIndex(index)} type="button">{item}</button>}
                <button aria-label={`Remove ${item}`} className="icon-button claim-item-remove" onClick={() => setClaimItems(claimItems.filter((_, itemIndex) => itemIndex !== index))} title={`Remove ${item}`} type="button"><Trash2 size={14} /></button>
            </div>)}</div>
            <div className="claim-item-add"><input aria-label="New purchased item" maxLength={240} onChange={(event) => setNewClaimItem(event.target.value)} placeholder="Add another item" value={newClaimItem} /></div>
            <div className="claim-item-form-actions"><button className="primary-button" type="submit">Save items</button><button className="text-button" onClick={() => setClaimItemGiftId(null)} type="button">Cancel</button>{ownClaim ? <button className="text-button" onClick={() => { updateClaim(gift.id, null); setClaimItemGiftId(null); }} type="button">Undo buying</button> : null}</div>
        </form> : null}
    </>;
}

function LegacyClaimActions({ gift, viewerName, updateClaim, claimItemGiftId, setClaimItemGiftId, claimItems, setClaimItems, newClaimItem, setNewClaimItem }: { gift: GiftGiverView["gifts"][number]; viewerName: string; updateClaim: (giftId: string, state: ClaimState | null, purchasedItems?: string[]) => void; claimItemGiftId: string | null; setClaimItemGiftId: (giftId: string | null) => void; claimItems: string[]; setClaimItems: (items: string[]) => void; newClaimItem: string; setNewClaimItem: (value: string) => void }) {
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const ownClaim = ownsClaim(gift, viewerName, "claimed");
    const openItemForm = () => {
        setClaimItemGiftId(gift.id);
        setClaimItems(claimItemsFor(gift, viewerName));
        setNewClaimItem("");
    };
    const saveItems = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const items = [...claimItems, newClaimItem.trim()].filter(Boolean);
        if (items.length === 0 && !ownClaim) return;
        updateClaim(gift.id, "claimed", items);
        setClaimItemGiftId(null);
    };
    return <><div className="gift-actions"><button disabled={!gift.isListInList && gift.claimState === "claimed"} onClick={() => updateClaim(gift.id, ownsClaim(gift, viewerName, "considering") ? null : "considering")} type="button">{ownsClaim(gift, viewerName, "considering") ? "Undo considering this" : "I am considering this"}</button>{gift.isListInList ? <button onClick={openItemForm} type="button">{ownClaim ? "Add or edit items" : "I am buying from this list"}</button> : <button disabled={gift.claimState === "claimed" && !ownClaim} onClick={() => updateClaim(gift.id, ownClaim ? null : "claimed")} type="button">{ownClaim ? "Undo buying this" : "I am buying this"}</button>}</div>{gift.isListInList && claimItemGiftId === gift.id ? <form className="claim-item-form" onSubmit={saveItems}><div className="claim-item-list">{claimItems.map((item, index) => <div className="claim-item-row" key={`${item}-${index}`}>{editingItemIndex === index ? <input autoFocus aria-label={`Purchased item ${index + 1}`} maxLength={240} onBlur={() => setEditingItemIndex(null)} onChange={(event) => setClaimItems(claimItems.map((current, itemIndex) => itemIndex === index ? event.target.value : current))} onKeyDown={(event) => { if (event.key === "Enter") setEditingItemIndex(null); }} value={item} /> : <button className="claim-item-label" onClick={() => setEditingItemIndex(index)} type="button">{item}</button>}<button aria-label={`Remove ${item}`} className="icon-button claim-item-remove" onClick={() => setClaimItems(claimItems.filter((_, itemIndex) => itemIndex !== index))} title={`Remove ${item}`} type="button"><Trash2 size={14} /></button></div>)}</div><div className="claim-item-add"><input aria-label="New purchased item" maxLength={240} onChange={(event) => setNewClaimItem(event.target.value)} placeholder="Add another item" value={newClaimItem} /></div><div className="claim-item-form-actions"><button className="primary-button" type="submit">Save items</button><button className="text-button" onClick={() => setClaimItemGiftId(null)} type="button">Cancel</button>{ownClaim ? <button className="text-button" onClick={() => { updateClaim(gift.id, null); setClaimItemGiftId(null); }} type="button">Clear Items</button> : null}</div></form> : null}</>;
    return <><div className="gift-actions"><button disabled={!gift.isListInList && gift.claimState === "claimed"} onClick={() => updateClaim(gift.id, ownsClaim(gift, viewerName, "considering") ? null : "considering")} type="button">{ownsClaim(gift, viewerName, "considering") ? "Undo considering this" : "I am considering this"}</button>{gift.isListInList ? <button onClick={openItemForm} type="button">{ownClaim ? "Add or edit items" : "I am buying from this list"}</button> : <button disabled={gift.claimState === "claimed" && !ownClaim} onClick={() => updateClaim(gift.id, ownClaim ? null : "claimed")} type="button">{ownClaim ? "Undo buying this" : "I am buying this"}</button>}</div>{gift.isListInList && claimItemGiftId === gift.id ? <form className="claim-item-form" onSubmit={saveItems}><div className="claim-item-list">{claimItems.map((item, index) => <div className="claim-item-row" key={`${item}-${index}`}>{editingItemIndex === index ? <input autoFocus aria-label={`Purchased item ${index + 1}`} maxLength={240} onBlur={() => setEditingItemIndex(null)} onChange={(event) => setClaimItems(claimItems.map((current, itemIndex) => itemIndex === index ? event.target.value : current))} onKeyDown={(event) => { if (event.key === "Enter") setEditingItemIndex(null); }} value={item} /> : <button className="claim-item-label" onClick={() => setEditingItemIndex(index)} type="button">{item}</button>}<button aria-label={`Remove ${item}`} className="icon-button claim-item-remove" onClick={() => setClaimItems(claimItems.filter((_, itemIndex) => itemIndex !== index))} title={`Remove ${item}`} type="button"><Trash2 size={14} /></button></div>)}</div><div className="claim-item-add"><input aria-label="New purchased item" maxLength={240} onChange={(event) => setNewClaimItem(event.target.value)} placeholder="Add another item" value={newClaimItem} /></div><div className="claim-item-form-actions"><button className="primary-button" type="submit">Save items</button><button className="text-button" onClick={() => setClaimItemGiftId(null)} type="button">Cancel</button>{ownClaim ? <button className="text-button" onClick={() => { updateClaim(gift.id, null); setClaimItemGiftId(null); }} type="button">Undo buying</button> : null}</div></form> : null}</>;
}

void LegacyClaimActions;

export function GiverWorkspace({ registry, view, profile, accessCode, accessError, unlocked, filters, claimFilter, signedIn, canSave, saved, savedRegistries, setAccessCode, setProfile, setFilters, setClaimFilter, unlock, setUnlocked, updateClaim, saveList, removeSavedList, onRemoveSavedList, onDuplicateList, onOpenSavedList, onMessage }: GiverWorkspaceProps) {
    const viewerName = profile.displayName.trim() || "Taylor";
    const [claimItemGiftId, setClaimItemGiftId] = useState<string | null>(null);
    const [claimItems, setClaimItems] = useState<string[]>([]);
    const [newClaimItem, setNewClaimItem] = useState("");

    return (
        <section className="workspace giver-workspace">
            {unlocked ? <div className="shared-list-identity">
                <div>
                    <span className="eyebrow">{registry.occasion || "Shared gift list"}</span>
                    <h2>{registry.listName}</h2>
                    <OwnerBadge registry={registry} />
                </div>
                <span className="giver-header-actions"><button className="text-button giver-switch-action" onClick={() => setUnlocked(false)} type="button">Pick another list</button>{canSave ? <span className="giver-management-actions"><button className="text-button" onClick={saved ? removeSavedList : saveList} type="button">{saved ? "Remove saved list" : "Save list"}</button><button className="text-button" onClick={onDuplicateList} type="button"><Copy size={15} /> Duplicate list</button></span> : null}</span>
            </div> : null}
            {!unlocked ? (
                <div className="unlock-panel">
                    <div className="unlock-art"><GiftIcon size={26} /></div>
                    <div><h3>Join the gift hunt</h3><p>Open a saved list or use the code from its owner.</p></div>
                    {savedRegistries.length > 0 ? <div className="saved-list-panel"><div className="saved-list-heading"><Bookmark size={16} /><strong>Saved lists</strong></div><div className="saved-list-scroll">{savedRegistries.map((savedList) => <div className="saved-list-option" key={savedList.id}><button aria-label={`Open ${savedList.listName}`} className="saved-list-open" onClick={() => onOpenSavedList(savedList)} type="button">{savedList.ownerAvatarUrl ? <img alt="" className="saved-list-avatar" src={savedList.ownerAvatarUrl} /> : <span className="saved-list-avatar saved-list-initial">{savedList.ownerName.trim().charAt(0).toUpperCase() || "?"}</span>}<span><strong>{savedList.listName}</strong><small>{savedList.ownerName ? `From ${savedList.ownerName}` : savedList.occasion || "Shared list"}</small></span><ArrowRight size={16} /></button><button aria-label={`Remove ${savedList.listName}`} className="saved-list-remove" onClick={() => onRemoveSavedList(savedList.accessCode)} title="Remove saved list" type="button"><Trash2 size={15} /></button></div>)}</div></div> : null}
                    <div className="code-divider"><span>or enter a code</span></div>
                    <form onSubmit={unlock}>
                        <label>List code<input autoFocus aria-describedby={accessError ? "access-error" : undefined} aria-invalid={Boolean(accessError)} onChange={(event) => setAccessCode(event.target.value)} placeholder="Owner-provided code" value={accessCode} /></label>
                        {signedIn ? null : <label>Your name<input onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} placeholder="Your name" value={profile.displayName} /></label>}
                        <button className="primary-button" type="submit">Open list <ArrowRight size={17} /></button>
                    </form>
                    {accessError ? <p className="error-message" id="access-error">{accessError}</p> : <small>Need a code? Ask the list owner.</small>}
                </div>
            ) : (
                <>
                    <div className="giver-summary">
                        <span className="giver-identity">Signed in as <ProfileBadge profile={profile} /><strong>{profile.displayName || "Guest"}</strong></span>
                    </div>
                    {registry.gifts.length === 0 ? (
                        <div className="empty-state"><GiftIcon size={24} /><h3>This list is empty</h3><p>This person hasn&apos;t added anything to their list yet.</p></div>
                    ) : (
                        <>
                            <GiftFilterControls claimFilter={claimFilter} registry={registry} filters={filters} setClaimFilter={setClaimFilter} setFilters={setFilters} />
                            <div className="gift-grid">
                                {view?.gifts.map((gift) => (
                                    <article className="gift-card" key={gift.id}>
                                        {gift.imageUrl ? <img alt={gift.title} className="gift-image" src={gift.imageUrl} /> : <div className="gift-image gift-image-placeholder"><GiftIcon size={24} /><span>No image</span></div>}
                                        <div className="gift-copy">
                                            <div className="gift-title-row"><div><h3>{gift.title}</h3>{gift.description ? <DescriptionDialog description={gift.description} maxLines={2} title={gift.title} /> : null}</div></div>
                                            {gift.dependenciesLabel ? <div className="gift-dependency dependency-alert">Depends on: {gift.dependenciesLabel}</div> : null}{gift.linkUrl ? <a className="gift-link" href={gift.linkUrl} rel="noreferrer" target="_blank">Open link <ArrowRight size={15} /></a> : null}
                                            <ClaimPeople people={gift.claimPeople} onMessage={onMessage} />
                                            <ClaimActions gift={gift} viewerName={viewerName} updateClaim={updateClaim} claimItemGiftId={claimItemGiftId} setClaimItemGiftId={setClaimItemGiftId} claimItems={claimItems} setClaimItems={setClaimItems} newClaimItem={newClaimItem} setNewClaimItem={setNewClaimItem} /><div className="gift-footer"><span className="gift-category" style={{ "--tag-color": gift.categoryColor } as CSSProperties}>{gift.categoryName}</span><strong className={`gift-price ${gift.priceLabel.length > 15 ? "gift-price-extra-long" : gift.priceLabel.length > 10 ? "gift-price-long" : ""}`}>{gift.priceLabel}</strong></div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </section>
    );
}
