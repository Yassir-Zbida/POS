export type AuthUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  name?: string | null;
  ownerManagerId?: string | null;
};
