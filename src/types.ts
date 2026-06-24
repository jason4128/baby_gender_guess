export interface SiteConfig {
  closeTime: string;
  isVotingOpen: boolean;
  actualGender: string;
  winnerCount: number;
  winners?: Guess[];
}

export interface InviteCode {
  id: string; // The code itself
  used: boolean;
  usedBy?: string; // name of the user who used it
  createdAt: any;
}

export interface Guess {
  id?: string;
  gender: string;
  name: string;
  contact: string;
  wish: string;
  giftWish: string;
  relation: string;
  inviteCode?: string;
  createdAt: any; // Firestore timestamp
}

export const ADMIN_EMAILS = ['user@gmail.com', 'jason2134@gmail.com'];

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase());
}

