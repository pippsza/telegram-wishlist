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

export interface PairRef {
  _id: string;
  userA: string | User;
  userB?: string | User;
}

export interface CalendarEvent {
  _id: string;
  owner: string | User;
  pair: PairRef | string | null;
  title: string;
  date: string;
  isRecurringYearly: boolean;
  remindDaysBefore: number[];
  note?: string;
  createdAt: string;
  updatedAt: string;
  occurrence?: string;
}

export type GiftIdeaStatus = 'idea' | 'bought' | 'gifted';

export interface GiftIdea {
  _id: string;
  owner: string;
  forPair: PairRef | string;
  title: string;
  body?: string;
  link?: string;
  price?: string;
  status: GiftIdeaStatus;
  photoPath?: string;
  createdAt: string;
  updatedAt: string;
}

export type NoteType = 'doc' | 'folder';

export interface Note {
  _id: string;
  owner: string | User;
  pair: string | null;
  parent: string | null;
  type: NoteType;
  title: string;
  plainText?: string;
  lastEditedBy?: string | User;
  createdAt: string;
  updatedAt: string;
}

export type AttachmentKind = 'wish' | 'gift' | 'note';

export interface EventAttachment {
  _id: string;
  owner: string;
  event: string;
  kind: AttachmentKind;
  // The hydrated target object. Shape depends on `kind`:
  // kind === 'wish'  -> Wish
  // kind === 'gift'  -> GiftIdea
  // kind === 'note'  -> Note (without yjsState)
  target: Wish | GiftIdea | Note | null;
  createdAt: string;
  updatedAt: string;
}
