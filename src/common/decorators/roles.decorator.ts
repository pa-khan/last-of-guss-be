import { SetMetadata as NestSetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) =>
  NestSetMetadata(ROLES_KEY, roles);
