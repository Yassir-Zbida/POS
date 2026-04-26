export type UserRole = "ADMIN" | "MANAGER" | "CASHIER";
export type UserStatus = "ACTIVE" | "BANNED" | "SUSPENDED";

export type PlatformUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  otpEnabled: boolean;
  failedLoginAttempts: number;
  createdAt: string;
  ownerManager: { id: string; name: string | null; email: string } | null;
  location: { id: string; name: string; city: string | null } | null;
  _count: { cashiers: number; managedLocations: number };
};

export type UsersStats = {
  total: number;
  active: number;
  banned: number;
  suspended: number;
  admins: number;
  managers: number;
  cashiers: number;
};

export type UsersPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};
