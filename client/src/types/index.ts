export interface User {
  id: string;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

export interface Pair {
  id: string;
  partner: User;
  status: 'pending' | 'active' | 'declined';
  createdAt: string;
}

export interface PendingRequest {
  id: string;
  from: User;
  inviteMethod: 'link' | 'username';
  createdAt: string;
}

export interface PendingSent {
  id: string;
  inviteMethod: 'link' | 'username';
  inviteCode?: string;
  createdAt: string;
}

export type WishPriority = 'high' | 'medium' | 'low';
export type WishStatus = 'active' | 'received';

export interface WishOption {
  label: string;
  link?: string;
  price?: string;
}

export interface Wish {
  _id: string;
  owner: string | User;
  description: string;
  link?: string;
  photoPath?: string;
  priority: WishPriority;
  tags: string[];
  options?: WishOption[];
  status: WishStatus;
  receivedAt?: string;
  receivedBy?: string | User;
  createdAt: string;
  updatedAt: string;
}
