export interface SiteConfig {
  closeTime: string;
  isVotingOpen: boolean;
  actualGender: string;
  winnerCount: number;
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
