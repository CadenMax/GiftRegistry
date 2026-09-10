import { ArrowRight, ChevronDown, Gift as GiftIcon, Search, UsersRound } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import type { ClaimFilter, ClaimState, GiftGiverProfile, GiftGiverView, Registry } from "../types";

type GiverWorkspaceProps = {
    registry: Registry;
    view: GiftGiverView | null;
    profile: GiftGiverProfile;
    accessCode: string;
    accessError: string;
    unlocked: boolean;
    category: string;
    claimFilter: ClaimFilter;
    dependenciesOnly: boolean;
    setAccessCode: (value: string) => void;
    setProfile: (value: GiftGiverProfile) => void;
    setCategory: (value: string) => void;
    setClaimFilter: (value: ClaimFilter) => void;
    setDependenciesOnly: (value: boolean) => void;
    unlock: (event: FormEvent<HTMLFormElement>) => void;
    setUnlocked: (value: boolean) => void;
    updateClaim: (giftId: string, state: ClaimState) => void;
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

export function GiverWorkspace({ registry, view, profile, accessCode, accessError, unlocked, category, claimFilter, dependenciesOnly, setAccessCode, setProfile, setCategory, setClaimFilter, setDependenciesOnly, unlock, setUnlocked, updateClaim }: GiverWorkspaceProps) {
    return (
        <section className="workspace giver-workspace">
            <div className="section-heading">
                <div>
                    <span className="eyebrow">Shared gift list</span>
                    <h2>Pick a gift</h2>
                    <p>Browse the list and mark what you plan to buy.</p>
                </div>
                <span className="giver-badge"><UsersRound size={16} /> Giver</span>
            </div>
            {!unlocked ? (
                <div className="unlock-panel">
                    <div className="unlock-art"><GiftIcon size={26} /></div>
                    <div><h3>Enter the list code</h3><p>Use the code from the list owner.</p></div>
                    <form onSubmit={unlock}>
                        <label>List code<input autoFocus aria-describedby={accessError ? "access-error" : undefined} aria-invalid={Boolean(accessError)} onChange={(event) => setAccessCode(event.target.value)} placeholder="Owner-provided code" value={accessCode} /></label>
                        <label>Your name<input onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} placeholder="Your name" value={profile.displayName} /></label>
                        <button className="primary-button" type="submit">Open list <ArrowRight size={17} /></button>
                    </form>
                    {accessError ? <p className="error-message" id="access-error">{accessError}</p> : <small>Need a code? Ask the list owner.</small>}
                </div>
            ) : (
                <>
                    <div className="giver-welcome">
                        <div><span className="eyebrow">Shared list</span><h2>{registry.listName}</h2></div>
                        <button className="text-button" onClick={() => setUnlocked(false)} type="button">Change code</button>
                    </div>
                    <div className="giver-summary">
                        <span className="giver-identity">Signed in as <ProfileBadge profile={profile} /><strong>{profile.displayName || "Guest"}</strong></span>
                    </div>
                    <div className="toolbar-row">
                        <div className="filter-label"><Search size={16} /><span>Browse gifts</span></div>
                        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{view?.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                        <label>Status<select value={claimFilter} onChange={(event) => setClaimFilter(event.target.value as ClaimFilter)}><option value="all">Everything</option><option value="available">Available</option><option value="considering">Considering</option><option value="claimed">Claimed</option></select></label>
                        <label className="check-filter"><input checked={dependenciesOnly} onChange={(event) => setDependenciesOnly(event.target.checked)} type="checkbox" /> Has dependencies</label>
                    </div>
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
