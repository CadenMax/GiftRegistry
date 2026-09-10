export type ClaimState = 'considering' | 'claimed';
export type ClaimFilter = 'all' | 'available' | 'considering' | 'claimed';
export type SortOption = 'price' | 'name' | 'category' | 'recent';
export type GiftGiverSortOption = SortOption | 'claim-state';

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
  dependencyText?: string;
  addedAt: string;
};

export type ClaimRecord = {
  giftId: string;
  giverId: string;
  state: ClaimState;
  giverName: string;
  giverMode: 'guest' | 'account';
  giverAvatarUrl?: string;
};

export type Registry = {
  id: string;
  listName: string;
  occasion: string;
  ownerName: string;
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
