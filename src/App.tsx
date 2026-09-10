import { ArrowRight, BookOpen, Check, ChevronDown, Gift as GiftIcon, Link as LinkIcon, Plus, Search, Share2, Trash2, UserRound, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { registry as initialRegistry } from './data/registry';
import { createGiftGiverView, createRecipientView, updateGiftClaim } from './lib/projections';
import { clearSession, createAccount, getAccountRegistry, getStoredSession, saveAccountRegistry, signIn } from './lib/accountStore';
import type { ClaimFilter, ClaimState, Gift, GiftGiverProfile, GiftGiverSortOption, Priority, Registry, SortOption } from './types';
import type { RecipientAccount } from './lib/accountStore';

type Workspace = 'recipient' | 'giver';

const blankGift: Omit<Gift, 'id' | 'addedAt'> = {
    title: '', description: '', imageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=85',
    linkUrl: '', price: 0, categoryId: 'home', priority: 'medium', status: 'On my wishlist', dependsOn: [],
};

function App() {
    const [account, setAccount] = useState<RecipientAccount | null>(() => getStoredSession());
    const [registry, setRegistry] = useState<Registry>(() => {
        const storedAccount = getStoredSession();
        return storedAccount ? getAccountRegistry(storedAccount, initialRegistry) : initialRegistry;
    });
    const [workspace, setWorkspace] = useState<Workspace>('recipient');
    const [recipientCategory, setRecipientCategory] = useState('all');
    const [recipientSort, setRecipientSort] = useState<SortOption>('priority');
    const [giverCategory, setGiverCategory] = useState('all');
    const [giverSort] = useState<GiftGiverSortOption>('claim-state');
    const [giverClaimFilter, setGiverClaimFilter] = useState<ClaimFilter>('all');
    const [giverDependenciesOnly, setGiverDependenciesOnly] = useState(false);
    const [giftGiverProfile, setGiftGiverProfile] = useState<GiftGiverProfile>({ id: 'demo-viewer', mode: 'guest', displayName: '' });
    const [accessCode, setAccessCode] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [accessError, setAccessError] = useState('');
    const [showAddGift, setShowAddGift] = useState(false);
    const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
    const [newGift, setNewGift] = useState(blankGift);
    const [copied, setCopied] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [authMode, setAuthMode] = useState<'create' | 'sign-in'>('create');
    const [authName, setAuthName] = useState('');
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        if (account) saveAccountRegistry(account, registry);
    }, [account, registry]);

    const recipientView = useMemo(() => createRecipientView(registry, { category: recipientCategory, sort: recipientSort }), [registry, recipientCategory, recipientSort]);
    const giftGiverView = useMemo(() => isUnlocked ? createGiftGiverView(registry, registry.claims, { category: giverCategory, sort: giverSort, claimFilter: giverClaimFilter, dependenciesOnly: giverDependenciesOnly }) : null, [registry, isUnlocked, giverCategory, giverSort, giverClaimFilter, giverDependenciesOnly]);
    const totalValue = registry.gifts.reduce((sum, gift) => sum + gift.price, 0);

    const unlockRegistry = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (accessCode.trim().toUpperCase() === registry.accessCode) { setIsUnlocked(true); setAccessError(''); }
        else { setIsUnlocked(false); setAccessError('That code does not match this registry.'); }
    };
    const updateClaim = (giftId: string, state: ClaimState) => setRegistry((current) => ({ ...current, claims: updateGiftClaim(current.claims, giftId, giftGiverProfile, state) }));
    const addGift = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!newGift.title.trim()) return;
        setRegistry((current) => ({ ...current, gifts: editingGiftId ? current.gifts.map((gift) => gift.id === editingGiftId ? { ...gift, ...newGift, title: newGift.title.trim() } : gift) : [...current.gifts, { ...newGift, id: `gift-${Date.now()}`, title: newGift.title.trim(), addedAt: new Date().toISOString() }] }));
        setNewGift({ ...blankGift, categoryId: registry.categories[0]?.id ?? 'home' });
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
    const deleteGift = (giftId: string) => setRegistry((current) => ({ ...current, gifts: current.gifts.filter((gift) => gift.id !== giftId), claims: current.claims.filter((claim) => claim.giftId !== giftId) }));
    const addCategory = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!newCategory.trim()) return;
        const id = newCategory.trim().toLowerCase().replace(/\s+/g, '-');
        setRegistry((current) => ({ ...current, categories: [...current.categories, { id, name: newCategory.trim() }] }));
        setNewCategory('');
    };
    const copyCode = async () => { await navigator.clipboard?.writeText(registry.accessCode); setCopied(true); setTimeout(() => setCopied(false), 1800); };
    const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setAuthError('');
        try {
            const nextAccount = authMode === 'create'
                ? await createAccount(authName, authEmail, authPassword, initialRegistry)
                : await signIn(authEmail, authPassword);
            setAccount(nextAccount);
            setRegistry(getAccountRegistry(nextAccount, initialRegistry));
            setAuthPassword('');
        } catch (error) {
            setAuthError(error instanceof Error ? error.message : 'Unable to create your account.');
        }
    };
    const signOut = () => {
        clearSession();
        setAccount(null);
        setWorkspace('recipient');
        setRegistry(initialRegistry);
    };

    if (!account && workspace === 'recipient') {
        return (
            <main className="app-shell">
                <header className="topbar" id="top"><a className="brand" href="#top"><span className="brand-mark"><GiftIcon size={18} /></span>kindlist</a><button className="text-button" onClick={() => setWorkspace('giver')} type="button">I have a code <ArrowRight size={15} /></button></header>
                <section className="auth-layout">
                    <div className="auth-intro"><span className="eyebrow">Your private gift list</span><h1>Start with an account.<br /><em>Keep the surprise.</em></h1><p>Your list belongs to you. Create an account so your wishes, categories, and sharing code are ready whenever you return.</p></div>
                    <form className="auth-card" onSubmit={handleAuthSubmit}><div className="auth-tabs"><button className={authMode === 'create' ? 'active' : ''} onClick={() => setAuthMode('create')} type="button">Create account</button><button className={authMode === 'sign-in' ? 'active' : ''} onClick={() => setAuthMode('sign-in')} type="button">Sign in</button></div><h2>{authMode === 'create' ? 'Make your list yours' : 'Welcome back'}</h2><p>{authMode === 'create' ? 'It only takes a moment to get started.' : 'Sign in to continue to your gift list.'}</p>{authMode === 'create' ? <label>Your name<input autoFocus required onChange={(event) => setAuthName(event.target.value)} placeholder="e.g. Alex Morgan" value={authName} /></label> : null}<label>Email address<input required onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" type="email" value={authEmail} /></label><label>Password<input minLength={8} required onChange={(event) => setAuthPassword(event.target.value)} placeholder="At least 8 characters" type="password" value={authPassword} /></label>{authError ? <p className="error-message">{authError}</p> : null}<button className="primary-button" type="submit">{authMode === 'create' ? 'Create my account' : 'Sign in'} <ArrowRight size={17} /></button><small>For now, this prototype stores your account locally in this browser. A production backend can replace this boundary later.</small></form>
                </section>
                <footer><span>kindlist</span><span>Thoughtful giving, made simple.</span></footer>
            </main>
        );
    }

    return (
        <main className="app-shell">
            <header className="topbar" id="top"><a className="brand" href="#top"><span className="brand-mark"><GiftIcon size={18} /></span>kindlist</a><div className="topbar-actions">{account ? <><button className="icon-button" onClick={signOut} title="Sign out" type="button"><UserRound size={18} /></button><span className="avatar">{account.name.slice(0, 2).toUpperCase()}</span></> : <button className="text-button" onClick={() => setWorkspace('recipient')} type="button">Create account <ArrowRight size={15} /></button>}</div></header>
            <nav className="role-tabs" aria-label="Workspace"><button className={workspace === 'recipient' ? 'active' : ''} onClick={() => setWorkspace('recipient')} type="button"><BookOpen size={17} /> My list</button><button className={workspace === 'giver' ? 'active' : ''} onClick={() => setWorkspace('giver')} type="button"><UsersRound size={17} /> I have a code</button></nav>

            {workspace === 'recipient' ? <section className="workspace recipient-workspace">
                <div className="section-heading"><div><span className="eyebrow">Your {registry.occasion.toLowerCase()}</span><h2>{registry.listName}</h2><p>Start adding gifts you would love to receive.</p></div><button className="primary-button" onClick={() => { setNewGift({ ...blankGift, categoryId: registry.categories[0]?.id ?? 'home' }); setEditingGiftId(null); setShowAddGift(true); }} type="button"><Plus size={17} /> Add a gift</button></div>
                <div className="stats-row"><div><strong>{registry.gifts.length}</strong><span>little wishes</span></div><div><strong>${totalValue}</strong><span>all together</span></div><div><strong>{registry.categories.length}</strong><span>categories</span></div></div>
                <div className="share-strip"><div className="share-icon"><Share2 size={18} /></div><div><strong>Share your list</strong><p>Friends only need this code to coordinate.</p></div><code>{registry.accessCode}</code><button aria-label="Copy access code" className="copy-button" onClick={copyCode} type="button">{copied ? <Check size={17} /> : <LinkIcon size={17} />}</button></div>
                {showAddGift ? <form className="add-gift-form" onSubmit={addGift}><div className="form-heading"><div><span className="eyebrow">New wish</span><h3>Add something lovely</h3></div><button className="text-button" onClick={() => setShowAddGift(false)} type="button">Cancel</button></div><div className="form-grid"><label>Gift name<input autoFocus required onChange={(event) => setNewGift({ ...newGift, title: event.target.value })} placeholder="What would make you smile?" value={newGift.title} /></label><label>Price<input min="0" onChange={(event) => setNewGift({ ...newGift, price: Number(event.target.value) })} type="number" value={newGift.price} /></label><label className="wide-field">Description<textarea onChange={(event) => setNewGift({ ...newGift, description: event.target.value })} placeholder="Tell people a little more..." value={newGift.description} /></label><label>Category<select onChange={(event) => setNewGift({ ...newGift, categoryId: event.target.value })} value={newGift.categoryId}>{registry.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Priority<select onChange={(event) => setNewGift({ ...newGift, priority: event.target.value as Priority })} value={newGift.priority}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label><label className="wide-field">Link<input onChange={(event) => setNewGift({ ...newGift, linkUrl: event.target.value })} placeholder="https://..." type="url" value={newGift.linkUrl} /></label></div><button className="primary-button" type="submit">Add to my list <ArrowRight size={17} /></button></form> : null}
                <div className="toolbar-row"><div className="filter-label"><Search size={16} /><span>Browse wishes</span></div><label>Category<select value={recipientCategory} onChange={(event) => setRecipientCategory(event.target.value)}><option value="all">All categories</option>{recipientView.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Sort by<select value={recipientSort} onChange={(event) => setRecipientSort(event.target.value as SortOption)}><option value="priority">Priority</option><option value="recent">Recently added</option><option value="price">Price</option><option value="name">Name</option></select></label></div>
                <div className="privacy-note"><Check size={16} /><span>Private by design. This view never receives information about who is considering or buying anything.</span></div>
                {recipientView.gifts.length === 0 ? <div className="empty-state"><GiftIcon size={24} /><h3>Your list is ready for its first wish</h3><p>Add a gift to start building your list. You can always edit or remove it later.</p><button className="primary-button" onClick={() => { setNewGift({ ...blankGift, categoryId: registry.categories[0]?.id ?? 'home' }); setEditingGiftId(null); setShowAddGift(true); }} type="button"><Plus size={17} /> Add your first gift</button></div> : null}
                <div className="gift-grid">{recipientView.gifts.map((gift) => <article className="gift-card" key={gift.id}><img alt={gift.title} className="gift-image" src={gift.imageUrl} /><div className="gift-copy"><div className="gift-title-row"><div><span className={`priority-dot priority-${gift.priority}`}>{gift.priority} priority</span><h3>{gift.title}</h3><p>{gift.description}</p></div><span className="gift-card-actions"><button aria-label={`Edit ${gift.title}`} className="delete-button" onClick={() => editGift(gift.id)} title="Edit gift" type="button"><BookOpen size={16} /></button><button aria-label={`Remove ${gift.title}`} className="delete-button" onClick={() => deleteGift(gift.id)} title="Remove gift" type="button"><Trash2 size={16} /></button></span></div><div className="gift-footer"><span>{gift.categoryName}</span><strong>${gift.priceLabel.replace('$', '')}</strong></div><div className="gift-dependency">{gift.dependenciesLabel === 'Independent gift' ? 'No dependencies' : `Needs: ${gift.dependenciesLabel}`}</div><a className="gift-link" href={gift.linkUrl} rel="noreferrer" target="_blank">View inspiration <ArrowRight size={15} /></a></div></article>)}</div>
                <form className="category-form" onSubmit={addCategory}><span><strong>Make it yours</strong><small>Add a category for the things you love.</small></span><input aria-label="New category" onChange={(event) => setNewCategory(event.target.value)} placeholder="New category" value={newCategory} /><button aria-label="Add category" className="small-button" type="submit"><Plus size={16} /></button></form>
            </section> : <section className="workspace giver-workspace">
                <div className="section-heading"><div><span className="eyebrow">A list shared with you</span><h2>Help make a surprise</h2><p>See what is still available, and quietly coordinate with everyone else.</p></div><span className="giver-badge"><UsersRound size={16} /> Gift giver</span></div>
                {!isUnlocked ? <div className="unlock-panel"><div className="unlock-art"><GiftIcon size={26} /></div><div><h3>Enter your access code</h3><p>Ask the list owner for their six-character code. No account needed.</p></div><form onSubmit={unlockRegistry}><label>List code<input autoFocus aria-describedby={accessError ? 'access-error' : undefined} aria-invalid={Boolean(accessError)} onChange={(event) => setAccessCode(event.target.value)} placeholder="e.g. MAYA-27" value={accessCode} /></label><label>Your name<input onChange={(event) => setGiftGiverProfile({ ...giftGiverProfile, displayName: event.target.value })} placeholder="So people know it is you" value={giftGiverProfile.displayName} /></label><button className="primary-button" type="submit">Open list <ArrowRight size={17} /></button></form>{accessError ? <p className="error-message" id="access-error">{accessError}</p> : <small>Try the demo code <strong>{registry.accessCode}</strong></small>}</div> : <><div className="giver-welcome"><div><span className="eyebrow">You are looking at</span><h2>{registry.listName}</h2></div><button className="text-button" onClick={() => setIsUnlocked(false)} type="button">Use another code</button></div><div className="giver-summary"><span><strong>{giftGiverProfile.displayName || ''}</strong>, you are all set.</span><span><i className="legend-dot available-dot" /> Still available <i className="legend-dot considering-dot" /> Being considered <i className="legend-dot claimed-dot" /> Claimed</span></div><div className="toolbar-row"><div className="filter-label"><Search size={16} /><span>Find a gift</span></div><label>Category<select value={giverCategory} onChange={(event) => setGiverCategory(event.target.value)}><option value="all">All categories</option>{giftGiverView?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Status<select value={giverClaimFilter} onChange={(event) => setGiverClaimFilter(event.target.value as ClaimFilter)}><option value="all">Everything</option><option value="available">Available</option><option value="considering">Considering</option><option value="claimed">Claimed</option></select></label><label className="check-filter"><input checked={giverDependenciesOnly} onChange={(event) => setGiverDependenciesOnly(event.target.checked)} type="checkbox" /> Has dependencies</label></div><div className="gift-grid">{giftGiverView?.gifts.map((gift) => <article className="gift-card" key={gift.id}><img alt={gift.title} className="gift-image" src={gift.imageUrl} /><div className="gift-copy"><div className="gift-title-row"><div><span className={`claim-tag claim-${gift.claimState}`}>{gift.claimLabel}</span><h3>{gift.title}</h3><p>{gift.description}</p></div></div><div className="gift-footer"><span>{gift.categoryName}</span><strong>{gift.priceLabel}</strong></div>{gift.dependenciesLabel !== 'Independent gift' ? <div className="gift-dependency dependency-alert"><ChevronDown size={14} /> This gift works best with {gift.dependenciesLabel}</div> : null}<p className="claim-details">{gift.claimDetail}</p><div className="gift-actions"><button disabled={gift.claimState === 'claimed'} onClick={() => updateClaim(gift.id, 'considering')} type="button">I am considering this</button><button className="secondary-button" disabled={Boolean(gift.claimOwnerId && gift.claimOwnerId !== giftGiverProfile.id)} onClick={() => updateClaim(gift.id, 'claimed')} type="button">Claim this gift</button></div></div></article>)}</div></>}
            </section>}
            <footer><span>kindlist</span><span>Thoughtful giving, made simple.</span></footer>
        </main>
    );
}

export default App;