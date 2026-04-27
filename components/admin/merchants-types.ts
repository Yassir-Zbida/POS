export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "SUSPENDED";
export type UserStatus = "ACTIVE" | "BANNED" | "SUSPENDED";

export type Subscription = {
  id: string;
  status: SubscriptionStatus;
  startedAt: string;
  endedAt: string | null;
};

export type Merchant = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: UserStatus;
  createdAt: string;
  subscription: Subscription | null;
  _count: { cashiers: number; managedLocations: number };
};

export type MerchantsStats = {
  total: number;
  active: number;
  subActive: number;
  subPastDue: number;
};

export type MerchantsPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};
