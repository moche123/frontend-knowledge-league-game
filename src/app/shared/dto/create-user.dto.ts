export type CreatableRole = 'player' | 'referee';

export interface CreateUserByAdminDto {
  name: string;
  email: string;
  password: string;
  role: CreatableRole;
}
