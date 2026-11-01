export type Algorithm = 'SHA1' | 'SHA256' | 'SHA512';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
}

export interface ActiveAccount {
  id: string;
  issuer: string;
  label: string;
  current_code: string;
  remaining_seconds: number;
  period: number;
  digits: number;
  algorithm: Algorithm;
  is_favorite: boolean;
  group_id?: string | null;
}

export interface VaultStatus {
  exists: boolean;
  is_unlocked: boolean;
  user?: UserProfile | null;
}

export type ViewMode = 'all' | 'favorites' | 'groups' | 'settings';

export const DEFAULT_GROUPS = ['Personal', 'Work', 'Finance', 'Gaming', 'Social', 'Crypto'] as const;
