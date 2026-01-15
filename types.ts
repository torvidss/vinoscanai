
export interface WineData {
  id: string;
  name: string;
  producer: string;
  vintage: string;
  region: string;
  country: string;
  type: 'Red' | 'White' | 'Rosé' | 'Sparkling' | 'Dessert';
  grapes: string[];
  alcoholContent: string;
  score: number;
  scoreSource: string;
  flavorProfile: string;
  pairing: string;
  about: string;
  estimatedPrice: string;
  timestamp: number;
  image?: string;
  confidenceLevel?: 'Alta' | 'Média' | 'Baixa';
  searchSources?: { title: string, uri: string }[];
}

export type SubscriptionStatus = 'active' | 'inactive' | 'canceled' | 'past_due';

export interface CellarPreferences {
  preferredTypes: string[];
  favoriteGrapes: string[];
  preferredRegions: string[];
  priceRange: 'Economical' | 'Standard' | 'Premium' | 'Luxury';
}

export interface UserProfile {
  name: string;
  email: string;
  isPro: boolean;
  scanCount: number;
  scanLimit: number;
  favorites: string[];
  preferences?: CellarPreferences;
  subscription?: {
    status: SubscriptionStatus;
    startDate: number;
    renewalDate: number;
    stripeId: string;
  };
}

export enum Screen {
  SPLASH = 'splash',
  LOGIN = 'login',
  HOME = 'home',
  CAMERA = 'camera',
  LOADING = 'loading',
  RESULT = 'result',
  HISTORY = 'history',
  FAVORITES = 'favorites',
  PROFILE = 'profile',
  PREMIUM = 'premium',
  GUIDE_DETAIL = 'guide_detail',
  SUBSCRIPTION = 'subscription',
  PAYMENT_PENDING = 'payment_pending',
  CELLAR_PREFERENCES = 'cellar_preferences'
}

export interface GuideItem {
  id: string;
  type: string;
  title: string;
  content: string;
  icon: string;
  image: string;
}
