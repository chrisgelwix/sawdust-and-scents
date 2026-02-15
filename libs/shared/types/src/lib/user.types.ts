export interface User {
  id: string;
  keycloakId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
}
