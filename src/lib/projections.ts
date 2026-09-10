import type {
  ClaimFilter,
  ClaimRecord,
  ClaimState,
  Gift,
  GiftGiverSortOption,
  GiftGiverProfile,
  GiftGiverView,
  RecipientView,
  Registry,
  SortOption,
} from '../types';

const priorityOrder = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

const claimStateOrder: Record<ClaimState | 'available', number> = {
  available: 0,
  considering: 1,
  claimed: 2,
};

function sortGifts(gifts: Gift[], sort: SortOption) {
  return [...gifts].sort((left, right) => {
    switch (sort) {
      case 'price':
        return left.price - right.price;
      case 'name':
        return left.title.localeCompare(right.title);
      case 'category':
        return left.categoryId.localeCompare(right.categoryId);
      case 'recent':
        return right.addedAt.localeCompare(left.addedAt);
      case 'priority':
      default:
        return priorityOrder[left.priority] - priorityOrder[right.priority];
    }
  });
}

function getDependenciesLabel(allGifts: Gift[], dependencyIds: string[]) {
  if (dependencyIds.length === 0) {
    return 'Independent gift';
  }

  return dependencyIds
    .map((dependencyId) => allGifts.find((gift) => gift.id === dependencyId)?.title ?? 'Another gift')
    .join(', ');
}

function getGiftClaims(claims: ClaimRecord[], giftId: string) {
  return claims.filter((claim) => claim.giftId === giftId);
}

function getGiftClaimSummary(claims: ClaimRecord[], giftId: string) {
  const giftClaims = getGiftClaims(claims, giftId);
  const claimedGift = giftClaims.find((claim) => claim.state === 'claimed');

  if (claimedGift) {
    return {
      state: 'claimed' as const,
      label: 'Claimed',
      detail: `${claimedGift.giverName} is buying this gift.`,
      owner: claimedGift.giverName,
    };
  }

  if (giftClaims.length > 0) {
    const giverNames = giftClaims.map((claim) => claim.giverName).join(', ');

    return {
      state: 'considering' as const,
      label: `${giftClaims.length} considering`,
      detail: `${giverNames} ${giftClaims.length === 1 ? 'is' : 'are'} considering this gift.`,
      owner: undefined,
    };
  }

  return {
    state: 'available' as const,
    label: 'Available',
    detail: 'Nobody has marked this yet.',
    owner: undefined,
  };
}

export function createRecipientView(
  registry: Registry,
  filters: { category: string; sort: SortOption },
): RecipientView {
  const visibleGifts = sortGifts(
    registry.gifts.filter((gift) => filters.category === 'all' || gift.categoryId === filters.category),
    filters.sort,
  );

  return {
    listName: registry.listName,
    ownerName: registry.ownerName,
    accessCode: registry.accessCode,
    categories: registry.categories,
    gifts: visibleGifts.map((gift) => ({
      id: gift.id,
      title: gift.title,
      description: gift.description,
      imageUrl: gift.imageUrl,
      linkUrl: gift.linkUrl,
      priceLabel: `£${gift.price}`,
      categoryName: registry.categories.find((category) => category.id === gift.categoryId)?.name ?? 'Other',
      priority: gift.priority,
      status: gift.status,
      dependenciesLabel: getDependenciesLabel(registry.gifts, gift.dependsOn),
    })),
  };
}

export function createGiftGiverView(
  registry: Registry,
  claims: ClaimRecord[],
  filters: {
    category: string;
    sort: GiftGiverSortOption;
    claimFilter: ClaimFilter;
    dependenciesOnly: boolean;
  },
): GiftGiverView {
  const filteredGifts = registry.gifts
    .filter((gift) => filters.category === 'all' || gift.categoryId === filters.category)
    .filter((gift) => !filters.dependenciesOnly || gift.dependsOn.length > 0)
    .filter((gift) => {
      const claimState = getGiftClaimSummary(claims, gift.id).state;

      switch (filters.claimFilter) {
        case 'available':
          return claimState === 'available';
        case 'considering':
          return claimState === 'considering';
        case 'claimed':
          return claimState === 'claimed';
        default:
          return true;
      }
    });

  const sortedGifts =
    filters.sort === 'claim-state'
      ? [...filteredGifts].sort((left, right) => {
          const leftState = getGiftClaimSummary(claims, left.id).state;
          const rightState = getGiftClaimSummary(claims, right.id).state;

          return claimStateOrder[leftState] - claimStateOrder[rightState];
        })
      : sortGifts(filteredGifts, filters.sort);

  return {
    listName: registry.listName,
    categories: registry.categories,
    gifts: sortedGifts.map((gift) => {
      const claimSummary = getGiftClaimSummary(claims, gift.id);

      return {
        id: gift.id,
        title: gift.title,
        description: gift.description,
        imageUrl: gift.imageUrl,
        priceLabel: `£${gift.price}`,
        categoryName: registry.categories.find((category) => category.id === gift.categoryId)?.name ?? 'Other',
        priority: gift.priority,
        dependenciesLabel: getDependenciesLabel(registry.gifts, gift.dependsOn),
        claimState: claimSummary.state,
        claimLabel: claimSummary.label,
        claimDetail: claimSummary.detail,
        claimOwner: claimSummary.owner,
      };
    }),
  };
}

export function updateGiftClaim(
  claims: ClaimRecord[],
  giftId: string,
  profile: GiftGiverProfile,
  state: ClaimState,
) {
  const displayName = profile.displayName.trim() || 'Taylor';
  const thisGiftClaims = claims.filter((claim) => claim.giftId === giftId);
  const remainingClaims = claims.filter(
    (claim) => !(claim.giftId === giftId && claim.giverName === displayName),
  );
  const nextClaim = {
    giftId,
    state,
    giverName: displayName,
    giverMode: profile.mode,
  } satisfies ClaimRecord;

  const claimedByAnotherGiver = thisGiftClaims.some(
    (claim) => claim.state === 'claimed' && claim.giverName !== displayName,
  );

  if (claimedByAnotherGiver) {
    return claims;
  }

  return [...remainingClaims, nextClaim];
}
