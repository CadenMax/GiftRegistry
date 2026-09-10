import {
  ArrowRight,
  Gift,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import './App.css';
import { registry } from './data/registry';
import { createGiftGiverView, createRecipientView, updateGiftClaim } from './lib/projections';
import type { ClaimFilter, ClaimState, GiftGiverProfile, GiftGiverSortOption, SortOption } from './types';

const architectureHighlights = [
  {
    icon: ShieldCheck,
    title: 'Private by design',
    description:
      'Recipient responses are built from a separate projection, so claim data is excluded before the UI ever receives it.',
  },
  {
    icon: KeyRound,
    title: 'Access-code sharing',
    description:
      'Gift givers can enter a list code to browse and interact with a registry without being forced to create an account.',
  },
  {
    icon: Sparkles,
    title: 'Flexible gift model',
    description:
      'Gifts support categories, priority, price, links, images, status, and multi-item dependencies from the start.',
  },
];

const roleHighlights = [
  {
    icon: UserRound,
    title: 'Recipient',
    description:
      'Owns lists, manages gifts and categories, shares access codes, and never receives claim or purchase data.',
  },
  {
    icon: UsersRound,
    title: 'Gift giver',
    description:
      'Uses a share code, browses private registry details, and can mark gifts as considering or claimed with a guest or account identity.',
  },
];

function App() {
  const [accessCode, setAccessCode] = useState('');
  const [activeAccessCode, setActiveAccessCode] = useState('');
  const [giftGiverProfile, setGiftGiverProfile] = useState<GiftGiverProfile>({
    id: 'demo-viewer',
    mode: 'guest',
    displayName: 'Taylor',
  });
  const [claimRecords, setClaimRecords] = useState(registry.claims);
  const [recipientCategory, setRecipientCategory] = useState('all');
  const [recipientSort, setRecipientSort] = useState<SortOption>('priority');
  const [giverCategory, setGiverCategory] = useState('all');
  const [giverSort, setGiverSort] = useState<GiftGiverSortOption>('claim-state');
  const [giverClaimFilter, setGiverClaimFilter] = useState<ClaimFilter>('all');
  const [giverDependenciesOnly, setGiverDependenciesOnly] = useState(false);
  const [accessError, setAccessError] = useState('');

  const recipientView = useMemo(
    () => createRecipientView(registry, { category: recipientCategory, sort: recipientSort }),
    [recipientCategory, recipientSort],
  );

  const giftGiverView = useMemo(
    () =>
      activeAccessCode === registry.accessCode
        ? createGiftGiverView(registry, claimRecords, {
            category: giverCategory,
            sort: giverSort,
            claimFilter: giverClaimFilter,
            dependenciesOnly: giverDependenciesOnly,
          })
        : null,
    [activeAccessCode, claimRecords, giverCategory, giverSort, giverClaimFilter, giverDependenciesOnly],
  );

  const availableCategories = recipientView.categories;

  const handleAccessSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (accessCode.trim().toUpperCase() === registry.accessCode) {
      setActiveAccessCode(registry.accessCode);
      setAccessError('');
      return;
    }

    setActiveAccessCode('');
    setAccessError('That access code does not match this registry preview.');
  };

  const updateClaim = (giftId: string, state: ClaimState) => {
    setClaimRecords((currentClaims) => updateGiftClaim(currentClaims, giftId, giftGiverProfile, state));
  };

  const activeDisplayName = giftGiverProfile.displayName.trim() || 'Taylor';

  return (
    <main className="app-shell">
      <section className="hero card">
        <div className="hero-copy">
          <span className="eyebrow">Personalised Gift Registry</span>
          <h1>Thoughtful gifting without duplicate surprises.</h1>
          <p>
            This starter experience establishes the architecture, privacy boundaries, and mobile-first
            registry flows needed for recipients and gift givers.
          </p>
          <div className="hero-pills">
            <span>
              <LockKeyhole size={16} />
              Claim data stays private from recipients
            </span>
            <span>
              <Gift size={16} />
              Categories, priority, links, images, and dependencies
            </span>
          </div>
        </div>
        <div className="hero-panel">
          <h2>Core assumptions</h2>
          <ul>
            <li>Recipients authenticate with full accounts and own one or more registries.</li>
            <li>Gift givers can continue as guests or save a lightweight account identity.</li>
            <li>Access codes unlock a giver-safe projection of the list, not owner management data.</li>
          </ul>
        </div>
      </section>

      <section className="section-grid">
        {architectureHighlights.map(({ icon: Icon, title, description }) => (
          <article className="card feature-card" key={title}>
            <Icon size={20} />
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <section className="section-grid roles-grid">
        {roleHighlights.map(({ icon: Icon, title, description }) => (
          <article className="card role-card" key={title}>
            <div className="role-heading">
              <Icon size={18} />
              <h2>{title}</h2>
            </div>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <section className="workspace-grid">
        <article className="card workspace-card">
          <div className="workspace-header">
            <div>
              <span className="eyebrow">Recipient workspace</span>
              <h2>{recipientView.listName}</h2>
            </div>
            <p className="access-code-note">Share code: {recipientView.accessCode}</p>
          </div>

          <div className="toolbar">
            <label>
              Category
              <select value={recipientCategory} onChange={(event) => setRecipientCategory(event.target.value)}>
                <option value="all">All</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort by
              <select
                value={recipientSort}
                onChange={(event) => setRecipientSort(event.target.value as SortOption)}
              >
                <option value="priority">Priority</option>
                <option value="price">Price</option>
                <option value="name">Name</option>
                <option value="category">Category</option>
                <option value="recent">Recently added</option>
              </select>
            </label>
          </div>

          <p className="privacy-banner">
            Recipient responses intentionally omit considering and claimed states to preserve surprise.
          </p>

          <div className="gift-grid">
            {recipientView.gifts.map((gift) => (
              <article className="gift-card" key={gift.id}>
                <img alt={gift.title} className="gift-image" src={gift.imageUrl} />
                <div className="gift-copy">
                  <div className="gift-title-row">
                    <div>
                      <h3>{gift.title}</h3>
                      <p>{gift.description}</p>
                    </div>
                    <span className={`priority-tag priority-${gift.priority}`}>{gift.priority}</span>
                  </div>
                  <dl className="gift-meta">
                    <div>
                      <dt>Category</dt>
                      <dd>{gift.categoryName}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{gift.status}</dd>
                    </div>
                    <div>
                      <dt>Price</dt>
                      <dd>{gift.priceLabel}</dd>
                    </div>
                    <div>
                      <dt>Needs</dt>
                      <dd>{gift.dependenciesLabel}</dd>
                    </div>
                  </dl>
                  <a className="gift-link" href={gift.linkUrl} rel="noreferrer" target="_blank">
                    View gift inspiration
                    <ArrowRight size={16} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="card workspace-card">
          <div className="workspace-header">
            <div>
              <span className="eyebrow">Gift giver workspace</span>
              <h2>Open a registry with an access code</h2>
            </div>
          </div>

          <form className="access-form" onSubmit={handleAccessSubmit}>
            <label>
              Access code
              <input
                aria-describedby={accessError ? 'access-code-error' : undefined}
                aria-invalid={Boolean(accessError)}
                onChange={(event) => setAccessCode(event.target.value)}
                placeholder="Enter code"
                value={accessCode}
              />
            </label>
            <label>
              Giver mode
              <select
                value={giftGiverProfile.mode}
                onChange={(event) =>
                  setGiftGiverProfile((currentProfile) => ({
                    ...currentProfile,
                    mode: event.target.value as GiftGiverProfile['mode'],
                  }))
                }
              >
                <option value="guest">Guest</option>
                <option value="account">Account</option>
              </select>
            </label>
            <label>
              Display name
              <input
                onChange={(event) =>
                  setGiftGiverProfile((currentProfile) => ({
                    ...currentProfile,
                    displayName: event.target.value,
                  }))
                }
                value={giftGiverProfile.displayName}
              />
            </label>
            <button type="submit">Unlock registry</button>
          </form>

          {accessError ? (
            <p className="error-message" id="access-code-error">
              {accessError}
            </p>
          ) : null}

          {giftGiverView ? (
            <>
              <div className="toolbar">
                <label>
                  Category
                  <select value={giverCategory} onChange={(event) => setGiverCategory(event.target.value)}>
                    <option value="all">All</option>
                    {giftGiverView.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Sort by
                  <select
                    value={giverSort}
                    onChange={(event) => setGiverSort(event.target.value as GiftGiverSortOption)}
                  >
                    <option value="claim-state">Claim status</option>
                    <option value="priority">Priority</option>
                    <option value="price">Price</option>
                    <option value="name">Name</option>
                    <option value="category">Category</option>
                  </select>
                </label>
                <label>
                  Claim filter
                  <select
                    value={giverClaimFilter}
                    onChange={(event) => setGiverClaimFilter(event.target.value as ClaimFilter)}
                  >
                    <option value="all">All gifts</option>
                    <option value="available">Available</option>
                    <option value="considering">Considering</option>
                    <option value="claimed">Claimed</option>
                  </select>
                </label>
                <label className="checkbox-field">
                  <input
                    checked={giverDependenciesOnly}
                    onChange={(event) => setGiverDependenciesOnly(event.target.checked)}
                    type="checkbox"
                  />
                  Only gifts with dependencies
                </label>
              </div>

              <div className="giver-summary">
                <p>
                  Viewing <strong>{giftGiverView.listName}</strong> for {activeDisplayName}. Claim details are visible
                  here because this projection is designed for gift givers.
                </p>
              </div>

              <div className="gift-grid">
                {giftGiverView.gifts.map((gift) => (
                  <article className="gift-card" key={gift.id}>
                    <img alt={gift.title} className="gift-image" src={gift.imageUrl} />
                    <div className="gift-copy">
                      <div className="gift-title-row">
                        <div>
                          <h3>{gift.title}</h3>
                          <p>{gift.description}</p>
                        </div>
                        <span className={`claim-tag claim-${gift.claimState}`}>{gift.claimLabel}</span>
                      </div>
                      <dl className="gift-meta">
                        <div>
                          <dt>Category</dt>
                          <dd>{gift.categoryName}</dd>
                        </div>
                        <div>
                          <dt>Priority</dt>
                          <dd>{gift.priority}</dd>
                        </div>
                        <div>
                          <dt>Price</dt>
                          <dd>{gift.priceLabel}</dd>
                        </div>
                        <div>
                          <dt>Dependencies</dt>
                          <dd>{gift.dependenciesLabel}</dd>
                        </div>
                      </dl>
                      <p className="claim-details">{gift.claimDetail}</p>
                      <div className="gift-actions">
                        <button
                          disabled={gift.claimState === 'claimed'}
                          onClick={() => updateClaim(gift.id, 'considering')}
                          type="button"
                        >
                          Mark considering
                        </button>
                        <button
                          className="secondary-button"
                          disabled={Boolean(gift.claimOwnerId && gift.claimOwnerId !== giftGiverProfile.id)}
                          onClick={() => updateClaim(gift.id, 'claimed')}
                          type="button"
                        >
                          Claim gift
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Use the demo code <strong>{registry.accessCode}</strong> to preview the gift-giver experience.</p>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

export default App;
