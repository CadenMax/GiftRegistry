import type {
  ClaimFilter,
  ClaimRecord,
  ClaimState,
  Gift,
  GiftGiverProfile,
  GiftGiverView,
  RecipientView,
  Registry,
  GiftFilters,
} from '../types';

function sortGifts(gifts: Gift[], sort: GiftFilters['sort'], categoryNames: Record<string, string>, statusNames: Record<string, string>) {
  return [...gifts].sort((left, right) => {
    const direction = sort.endsWith('-desc') ? -1 : 1;
    switch (sort) {
      case 'price-asc':
      case 'price-desc':
        return direction * ((left.price ?? 0) - (right.price ?? 0));
      case 'name-asc':
      case 'name-desc':
        return direction * left.title.localeCompare(right.title);
      case 'category-asc':
      case 'category-desc':
        {
          const leftCategory = categoryNames[left.categoryId ?? ''];
          const rightCategory = categoryNames[right.categoryId ?? ''];
          if (!leftCategory && rightCategory) return 1;
          if (leftCategory && !rightCategory) return -1;
          if (!leftCategory && !rightCategory) return 0;
          return direction * leftCategory.localeCompare(rightCategory);
        }
      case 'status-asc':
      case 'status-desc':
        {
          const leftStatus = statusNames[left.status ?? ''];
          const rightStatus = statusNames[right.status ?? ''];
          if (!leftStatus && rightStatus) return 1;
          if (leftStatus && !rightStatus) return -1;
          if (!leftStatus && !rightStatus) return 0;
          return direction * leftStatus.localeCompare(rightStatus);
        }
      default:
        return left.title.localeCompare(right.title);
    }
  });
}

function filterGifts(gifts: Gift[], filters: GiftFilters) {
  return gifts
    .filter((gift) => filters.categoryIds.length === 0 || filters.categoryIds.includes(gift.categoryId ?? ''))
    .filter((gift) => filters.statusIds.length === 0 || filters.statusIds.includes(gift.status ?? ''))
    .filter((gift) => filters.minPrice === undefined || (gift.price ?? 0) >= filters.minPrice)
    .filter((gift) => filters.maxPrice === undefined || (gift.price ?? 0) <= filters.maxPrice)
    .filter((gift) => {
      const hasDependency = gift.dependsOn.length > 0;
      return filters.dependency === 'all' || (filters.dependency === 'yes' ? hasDependency : !hasDependency);
    })
    .filter((gift) => !filters.dependentOnGiftId || gift.dependsOn.includes(filters.dependentOnGiftId));
}

function getDependenciesLabel(giftTitles: Record<string, string>, dependencyIds: string[]) {
  const dependencies = dependencyIds.map((dependencyId) => giftTitles[dependencyId] ?? 'Another gift');

  if (dependencies.length === 0) {
    return '';
  }

  return dependencies.join(', ');
}

function getGiftClaims(claims: ClaimRecord[], giftId: string) {
  return claims.filter((claim) => claim.giftId === giftId);
}

function claimNameKey(name: string) {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
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
      ownerId: claimedGift.giverId,
      ownerAvatarUrl: claimedGift.giverAvatarUrl,
    };
  }

  if (giftClaims.length > 0) {
    const giverNames = giftClaims.map((claim) => claim.giverName).join(', ');

    return {
      state: 'considering' as const,
      label: `${giftClaims.length} considering`,
      detail: `${giverNames} ${giftClaims.length === 1 ? 'is' : 'are'} considering this gift.`,
      owner: undefined,
      ownerId: undefined,
      ownerAvatarUrl: undefined,
    };
  }

  return {
    state: 'available' as const,
    label: 'Available',
    detail: 'Nobody has marked this yet.',
    owner: undefined,
    ownerId: undefined,
    ownerAvatarUrl: undefined,
  };
}

export function createRecipientView(
  registry: Registry,
  filters: GiftFilters,
): RecipientView {
  const categoryNames = Object.fromEntries(registry.categories.map((category) => [category.id, category.name]));
  const statusNames = Object.fromEntries(registry.statuses.map((status) => [status.id, status.name]));
  const giftTitles = Object.fromEntries(registry.gifts.map((gift) => [gift.id, gift.title]));
  const visibleGifts = sortGifts(filterGifts(registry.gifts, filters), filters.sort, categoryNames, statusNames);

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
      priceLabel: `$${(gift.price ?? 0).toFixed(2)}`,
      categoryName: registry.categories.find((category) => category.id === gift.categoryId)?.name ?? 'Uncategorised',
      categoryColor: registry.categories.find((category) => category.id === gift.categoryId)?.color,
      status: gift.status ? statusNames[gift.status] ?? gift.status : undefined,
      statusColor: registry.statuses.find((status) => status.id === gift.status)?.color,
      dependenciesLabel: getDependenciesLabel(giftTitles, gift.dependsOn),
    })),
  };
}

export function createGiftGiverView(
  registry: Registry,
  claims: ClaimRecord[],
  filters: {
    categoryIds: string[];
    sort: GiftFilters['sort'];
    claimFilter: ClaimFilter;
    statusIds: string[];
    minPrice: number | undefined;
    maxPrice: number | undefined;
    dependency: GiftFilters['dependency'];
    dependentOnGiftId: string;
  },
): GiftGiverView {
  const categoryNames = Object.fromEntries(registry.categories.map((category) => [category.id, category.name]));
  const statusNames = Object.fromEntries(registry.statuses.map((status) => [status.id, status.name]));
  const giftTitles = Object.fromEntries(registry.gifts.map((gift) => [gift.id, gift.title]));
  const filteredGifts = filterGifts(registry.gifts, filters)
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

  const sortedGifts = sortGifts(filteredGifts, filters.sort, categoryNames, statusNames);

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
        priceLabel: `$${(gift.price ?? 0).toFixed(2)}`,
        categoryName: registry.categories.find((category) => category.id === gift.categoryId)?.name ?? 'Uncategorised',
        categoryColor: registry.categories.find((category) => category.id === gift.categoryId)?.color,
        status: gift.status ? statusNames[gift.status] ?? gift.status : undefined,
        statusColor: registry.statuses.find((status) => status.id === gift.status)?.color,
        dependenciesLabel: getDependenciesLabel(giftTitles, gift.dependsOn),
        claimState: claimSummary.state,
        claimLabel: claimSummary.label,
        claimDetail: claimSummary.detail,
        claimOwner: claimSummary.owner,
        claimOwnerId: claimSummary.ownerId,
        claimOwnerAvatarUrl: claimSummary.ownerAvatarUrl,
        claimPeople: getGiftClaims(claims, gift.id).map((claim) => ({
          id: claim.giverId,
          name: claim.giverName,
          state: claim.state,
          avatarUrl: claim.giverAvatarUrl,
        })),
      };
    }),
  };
}

export function updateGiftClaim(
  claims: ClaimRecord[],
  giftId: string,
  profile: GiftGiverProfile,
  state: ClaimState | null,
) {
  const thisGiftClaims = claims.filter((claim) => claim.giftId === giftId);
  const nonTargetGiftClaims = claims.filter((claim) => claim.giftId !== giftId);
  const profileNameKey = claimNameKey(profile.displayName.trim() || 'Taylor');
  if (state === null) {
    const ownClaims = thisGiftClaims.filter((claim) => claimNameKey(claim.giverName) === profileNameKey);
    const ownClaim = ownClaims.find((claim) => claim.state === 'claimed') ?? ownClaims[0];
    return ownClaim
      ? [...nonTargetGiftClaims, ...thisGiftClaims.filter((claim) => claim !== ownClaim)]
      : claims;
  }

  const displayName = profile.displayName.trim() || 'Taylor';
  const nextClaim: ClaimRecord = {
    giftId,
    giverId: profile.id,
    state,
    giverName: displayName,
    giverMode: profile.mode,
    giverAvatarUrl: profile.avatarUrl,
  };

  const claimedByAnotherGiver = thisGiftClaims.some(
    (claim) => claim.state === 'claimed' && claim.giverId !== profile.id,
  );

  if (claimedByAnotherGiver) {
    return claims;
  }

  const retainedGiftClaims = state === 'considering'
    ? thisGiftClaims.filter((claim) => claimNameKey(claim.giverName) !== profileNameKey)
    : thisGiftClaims.filter((claim) => claim.state === 'considering');

  return [...nonTargetGiftClaims, ...retainedGiftClaims, nextClaim];
}
