import { ChevronDown, Gift as GiftIcon, ArrowRight, Search, UsersRound } from "lucide-react";
import type { FormEvent } from "react";
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

export function GiverWorkspace({ registry, view, profile, accessCode, accessError, unlocked, category, claimFilter, dependenciesOnly, setAccessCode, setProfile, setCategory, setClaimFilter, setDependenciesOnly, unlock, setUnlocked, updateClaim }: GiverWorkspaceProps) {
    return <section className="workspace giver-workspace"><div className="section-heading"><div><span className="eyebrow">A list shared with you</span><h2>Help make a surprise</h2><p>See what is still available, and quietly coordinate with everyone else.</p></div><span className="giver-badge"><UsersRound size={16} /> Gift giver</span></div>{!unlocked ? <div className="unlock-panel"><div className="unlock-art"><GiftIcon size={26} /></div><div><h3>Enter your access code</h3><p>Ask the list owner for their six-character code. No account needed.</p></div><form onSubmit={unlock}><label>List code<input autoFocus aria-describedby={accessError ? "access-error" : undefined} aria-invalid={Boolean(accessError)} onChange={(event) => setAccessCode(event.target.value)} placeholder="Owner-provided code" value={accessCode} /></label><label>Your name<input onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} placeholder="So people know it is you" value={profile.displayName} /></label><button className="primary-button" type="submit">Open list <ArrowRight size={17} /></button></form>{accessError ? <p className="error-message" id="access-error">{accessError}</p> : <small>Enter the access code shared by the list owner.</small>}</div> : <><div className="giver-welcome"><div><span className="eyebrow">You are looking at</span><h2>{registry.listName}</h2></div><button className="text-button" onClick={() => setUnlocked(false)} type="button">Use another code</button></div><div className="giver-summary"><span><strong>{profile.displayName || ""}</strong>, you are all set.</span><span><i className="legend-dot available-dot" /> Still available <i className="legend-dot considering-dot" /> Being considered <i className="legend-dot claimed-dot" /> Claimed</span></div><div className="toolbar-row"><div className="filter-label"><Search size={16} /><span>Find a gift</span></div><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{view?.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Status<select value={claimFilter} onChange={(event) => setClaimFilter(event.target.value as ClaimFilter)}><option value="all">Everything</option><option value="available">Available</option><option value="considering">Considering</option><option value="claimed">Claimed</option></select></label><label className="check-filter"><input checked={dependenciesOnly} onChange={(event) => setDependenciesOnly(event.target.checked)} type="checkbox" /> Has dependencies</label></div><div className="gift-grid">{view?.gifts.map((gift) => <article className="gift-card" key={gift.id}>{gift.imageUrl ? <img alt={gift.title} className="gift-image" src={gift.imageUrl} /> : <div className="gift-image gift-image-placeholder"><GiftIcon size={24} /><span>No image yet</span></div>}<div className="gift-copy"><div className="gift-title-row"><div><span className={`claim-tag claim-${gift.claimState}`}>{gift.claimLabel}</span>{gift.status ? <span className="gift-status">{gift.status}</span> : null}<h3>{gift.title}</h3><p>{gift.description || "No description added."}</p></div></div><div className="gift-footer"><span>{gift.categoryName}</span><strong>{gift.priceLabel}</strong></div>{gift.dependenciesLabel ? <div className="gift-dependency dependency-alert"><ChevronDown size={14} /> This gift works best with {gift.dependenciesLabel}</div> : null}<p className="claim-details">{gift.claimDetail}</p><div className="gift-actions"><button disabled={gift.claimState === "claimed"} onClick={() => updateClaim(gift.id, "considering")} type="button">I am considering this</button><button disabled={gift.claimState === "claimed"} onClick={() => updateClaim(gift.id, "claimed")} type="button">I am buying this</button></div></div></article>)}</div></>}</section>;
}
