export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "SUSPENDED";
export type UserStatus = "ACTIVE" | "BANNED" | "SUSPENDED";

export type SubscriptionMerchant = {
  id: string;
  email: string;
  name: string | null;
  status: UserStatus;
};

export type SubscriptionItem = {
  id: string;
  managerId: string;
  status: SubscriptionStatus;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  merchant: SubscriptionMerchant;
};

export type SubscriptionStats = {
  total: number;
  active: number;
  pastDue: number;
  suspended: number;
  canceled: number;
  expiringSoon: number;
};

export type SubscriptionPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};
