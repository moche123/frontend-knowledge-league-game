import { PublicUserDto } from '../../shared/dto/auth-response.dto';

export const HOME_BY_ROLE: Record<PublicUserDto['role'], string> = {
  admin: '/events',
  referee: '/judge-panel',
  player: '/dashboard',
};
