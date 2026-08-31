export type UserRole = 'player' | 'admin' | 'referee';

export interface PublicUserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: PublicUserDto;
}
