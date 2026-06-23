export interface SiteConfig {
  eventTitle: string;
  eventSubtitle: string;
  closeTime: string;
  isVotingOpen: boolean;
  actualGender: string;
  winnerCount: number;
}

export interface Guess {
  id?: string;
  gender: string;
  name: string;
  contact: string;
  wish: string;
  giftWish: string;
  relation: string;
  createdAt: any; // Firestore timestamp
}
