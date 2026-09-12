export type ClaimState = 'considering' | 'claimed';
export type ClaimFilter = 'all' | 'available' | 'considering' | 'claimed';
export type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'category-asc' | 'category-desc' | 'status-asc' | 'status-desc';
export type GiftGiverSortOption = SortOption | 'claim-state';
export type DependencyFilter = 'all' | 'yes' | 'no';
export type GiftFilters = {
  sort: SortOption;
  categoryIds: string[];
  statusIds: string[];
  minPrice: number | undefined;
  maxPrice: number | undefined;
  dependency: DependencyFilter;
  dependentOnGiftId: string;
};

export type Category = {
  id: string;
  name: string;
  color?: string;
};

export type Status = {
  id: string;
  name: string;
  color?: string;
};

export type Gift = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  price?: number;
  categoryId?: string;
  status?: string;
  dependsOn: string[];
  addedAt: string;
};

export type ClaimRecord = {
  giftId: string;
  giverId: string;
  state: ClaimState;
  giverName: string;
  giverMode: 'guest' | 'account';
  giverAvatarUrl?: string;
  giverToken?: string;
};

export type Registry = {
  id: string;
  listName: string;
  occasion: string;
  ownerName: string;
  ownerId?: string;
  ownerAvatarUrl?: string;
  accessCode: string;
  categories: Category[];
  statuses: Status[];
  gifts: Gift[];
  claims: ClaimRecord[];
};

export type GiftGiverProfile = {
  id: string;
  mode: 'guest' | 'account';
  displayName: string;
  avatarUrl?: string;
  claimToken?: string;
};

export type RecipientView = {
  listName: string;
  ownerName: string;
  accessCode: string;
  categories: Category[];
  gifts: Array<{
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    linkUrl?: string;
    priceLabel: string;
    categoryName: string;
    categoryColor?: string;
    status?: string;
    statusColor?: string;
    dependenciesLabel: string;
  }>;
};

export type GiftGiverView = {
  listName: string;
  categories: Category[];
  gifts: Array<{
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    priceLabel: string;
    categoryName: string;
    categoryColor?: string;
    status?: string;
    statusColor?: string;
    dependenciesLabel: string;
    claimState: ClaimState | 'available';
    claimLabel: string;
    claimDetail: string;
    claimOwner?: string;
    claimOwnerId?: string;
    claimOwnerAvatarUrl?: string;
    claimPeople: Array<{
      id: string;
      name: string;
      state: ClaimState;
      avatarUrl?: string;
    }>;
  }>;
};
