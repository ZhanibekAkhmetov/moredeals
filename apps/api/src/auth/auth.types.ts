import type { UserRole } from '@moredeals/database';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};
