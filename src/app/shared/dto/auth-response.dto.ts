export type UserRole = 'player' | 'admin' | 'referee';

export interface PublicUserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

// GET /auth/users/:id/name — any authenticated user, no email/role/createdAt.
export interface PublicNameDto {
  id: string;
  name: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: PublicUserDto;
}
