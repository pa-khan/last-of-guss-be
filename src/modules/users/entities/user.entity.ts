import { User as PrismaUser, UserRole } from '@prisma/client';

export class UserEntity implements PrismaUser {
  id!: string;
  username!: string;
  passwordHash!: string;
  role!: UserRole;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  toSafeObject(): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = this;
    return safeUser as SafeUser;
  }
}

export type SafeUser = Omit<UserEntity, 'passwordHash' | 'toSafeObject'>;
