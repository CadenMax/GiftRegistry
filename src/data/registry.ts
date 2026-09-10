import type { Registry } from '../types';

export const registry: Registry = {
  id: 'new-registry',
  listName: 'My gift list',
  occasion: 'Wishlist',
  ownerName: 'You',
  accessCode: 'START-HERE',
  categories: [
    { id: 'home', name: 'Home' },
    { id: 'books', name: 'Books' },
    { id: 'hobbies', name: 'Hobbies' },
    { id: 'experiences', name: 'Experiences' },
  ],
  gifts: [],
  claims: [],
};
