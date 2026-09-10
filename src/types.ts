export type Priority = 'low' | 'medium' | 'high';
export type ClaimState = 'considering' | 'claimed';
export type ClaimFilter = 'all' | 'available' | 'considering' | 'claimed';
export type SortOption = 'priority' | 'price' | 'name' | 'category' | 'recent';
export type GiftGiverSortOption = SortOption | 'claim-state';

export type Category = {
  id: string;
  name: string;
};

export type Gift = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  price: number;
  categoryId: string;
  priority: Priority;
  status: string;
  dependsOn: string[];
  addedAt: string;
};

export type ClaimRecord = {
  giftId: string;
  giverId: string;
  state: ClaimState;
  giverName: string;
  giverMode: 'guest' | 'account';
};

export type Registry = {
  id: string;
  listName: string;
  occasion: string;
  ownerName: string;
  accessCode: string;
  categories: Category[];
  gifts: Gift[];
  claims: ClaimRecord[];
};

export type GiftGiverProfile = {
  id: string;
  mode: 'guest' | 'account';
  displayName: string;
};

export type RecipientView = {
  listName: string;
  ownerName: string;
  accessCode: string;
  categories: Category[];
  gifts: Array<{
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    linkUrl: string;
    priceLabel: string;
    categoryName: string;
    priority: Priority;
    status: string;
    dependenciesLabel: string;
  }>;
};

export type GiftGiverView = {
  listName: string;
  categories: Category[];
  gifts: Array<{
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    priceLabel: string;
    categoryName: string;
    priority: Priority;
    dependenciesLabel: string;
    claimState: ClaimState | 'available';
    claimLabel: string;
    claimDetail: string;
    claimOwner?: string;
    claimOwnerId?: string;
  }>;
};
