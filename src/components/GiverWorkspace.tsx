import { ArrowRight, Bookmark, ChevronDown, Copy, Gift as GiftIcon } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { GiftFilterControls } from "./GiftFilterControls";
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
    savedRegistries: Registry[];
    canSave: boolean;
    saved: boolean;
    setAccessCode: (value: string) => void;
    setProfile: (value: GiftGiverProfile) => void;
    setFilters: (update: Partial<GiftFilters>) => void;
    setClaimFilter: (value: ClaimFilter) => void;
    unlock: (event: FormEvent<HTMLFormElement>) => void;
    setUnlocked: (value: boolean) => void;
    updateClaim: (giftId: string, state: ClaimState) => void;
    saveList: () => void;
    removeSavedList: () => void;
    onDuplicateList: () => void;
    onOpenSavedList: (registry: Registry) => void;
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

function ClaimPeople({ people }: { people: GiftGiverView["gifts"][number]["claimPeople"] }) {
    const considering = people.filter((person) => person.state === "considering");
    const bought = people.filter((person) => person.state === "claimed");
    if (people.length === 0) return null;

    return (
        <div className="claim-people">
            {considering.length > 0 ? <ClaimPeopleRow label="Considering" people={considering} /> : null}
            {bought.length > 0 ? <ClaimPeopleRow label="Bought by" people={bought} /> : null}
        </div>
    );
}

function ClaimPeopleRow({ label, people }: { label: string; people: GiftGiverView["gifts"][number]["claimPeople"] }) {
    return (
        <div className="claim-people-row">
            <span className="claim-people-label">{label}</span>
            <span className="claim-people-list">
                {people.map((person) => (
                    <span className="claim-person" key={person.id} title={person.name}>
                        {person.avatarUrl ? <img alt="" src={person.avatarUrl} /> : <span>{person.name.trim().charAt(0).toUpperCase() || "?"}</span>}
                        {person.name}
                    </span>
                ))}
            </span>
        </div>
    );
}

export function GiverWorkspace({ registry, view, profile, accessCode, accessError, unlocked, filters, claimFilter, canSave, saved, savedRegistries, setAccessCode, setProfile, setFilters, setClaimFilter, unlock, setUnlocked, updateClaim, saveList, removeSavedList, onDuplicateList, onOpenSavedList }: GiverWorkspaceProps) {
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
                    {savedRegistries.length > 0 ? <div className="saved-list-panel"><div className="saved-list-heading"><Bookmark size={16} /><strong>Saved lists</strong></div><div className="saved-list-scroll">{savedRegistries.map((savedList) => <button className="saved-list-option" key={savedList.id} onClick={() => onOpenSavedList(savedList)} type="button">{savedList.ownerAvatarUrl ? <img alt="" className="saved-list-avatar" src={savedList.ownerAvatarUrl} /> : <span className="saved-list-avatar saved-list-initial">{savedList.ownerName.trim().charAt(0).toUpperCase() || "?"}</span>}<span><strong>{savedList.listName}</strong><small>{savedList.ownerName ? `From ${savedList.ownerName}` : savedList.occasion || "Shared list"}</small></span><ArrowRight size={16} /></button>)}</div></div> : null}
                    <div className="code-divider"><span>or enter a code</span></div>
                    <form onSubmit={unlock}>
                        <label>List code<input autoFocus aria-describedby={accessError ? "access-error" : undefined} aria-invalid={Boolean(accessError)} onChange={(event) => setAccessCode(event.target.value)} placeholder="Owner-provided code" value={accessCode} /></label>
                        <label>Your name<input onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} placeholder="Your name" value={profile.displayName} /></label>
                        <button className="primary-button" type="submit">Open list <ArrowRight size={17} /></button>
                    </form>
                    {accessError ? <p className="error-message" id="access-error">{accessError}</p> : <small>Need a code? Ask the list owner.</small>}
                </div>
            ) : (
                <>
                    <div className="giver-summary">
                        <span className="giver-identity">Signed in as <ProfileBadge profile={profile} /><strong>{profile.displayName || "Guest"}</strong></span>
                    </div>
                    <GiftFilterControls claimFilter={claimFilter} registry={registry} filters={filters} setClaimFilter={setClaimFilter} setFilters={setFilters} />
                    <div className="gift-grid">
                        {view?.gifts.map((gift) => (
                            <article className="gift-card" key={gift.id}>
                                {gift.imageUrl ? <img alt={gift.title} className="gift-image" src={gift.imageUrl} /> : <div className="gift-image gift-image-placeholder"><GiftIcon size={24} /><span>No image</span></div>}
                                <div className="gift-copy">
                                    <div className="gift-title-row"><div>{gift.status ? <span className="gift-status" style={{ "--tag-color": gift.statusColor } as CSSProperties}>{gift.status}</span> : null}<h3>{gift.title}</h3><p>{gift.description || "No description."}</p></div></div>
                                    <div className="gift-footer"><span className="gift-category" style={{ "--tag-color": gift.categoryColor } as CSSProperties}>{gift.categoryName}</span><strong>{gift.priceLabel}</strong></div>
                                    {gift.dependenciesLabel ? <div className="gift-dependency dependency-alert"><ChevronDown size={14} /> Also consider: {gift.dependenciesLabel}</div> : null}
                                    <ClaimPeople people={gift.claimPeople} />
                                    <div className="gift-actions"><button disabled={gift.claimState === "claimed"} onClick={() => updateClaim(gift.id, "considering")} type="button">I am considering this</button><button disabled={gift.claimState === "claimed"} onClick={() => updateClaim(gift.id, "claimed")} type="button">I am buying this</button></div>
                                </div>
                            </article>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
