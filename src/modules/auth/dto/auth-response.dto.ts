import { SafeUser } from '../../users/entities/user.entity';

export class AuthResponseDto {
  user: SafeUser;
  message: string;

  constructor(user: SafeUser, message: string = 'Authentication successful') {
    this.user = user;
    this.message = message;
  }
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}
