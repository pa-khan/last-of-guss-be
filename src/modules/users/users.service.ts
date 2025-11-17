import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../config/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity, SafeUser } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(private readonly prisma: PrismaService) {}

  private determineUserRole(username: string): UserRole {
    const normalizedUsername = username.trim();

    if (normalizedUsername === 'admin') {
      return UserRole.ADMIN;
    }

    if (normalizedUsername === 'Никита') {
      return UserRole.NIKITA;
    }

    return UserRole.SURVIVOR;
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async create(createUserDto: CreateUserDto): Promise<SafeUser> {
    const { username, password } = createUserDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      this.logger.warn(`Attempt to create duplicate user: ${username}`);
      throw new ConflictException('User with this username already exists');
    }

    const role = this.determineUserRole(username);
    const passwordHash = await this.hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
      },
    });

    this.logger.log(`New user created: ${username} with role ${role}`);

    const userEntity = new UserEntity(user);
    return userEntity.toSafeObject();
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return null;
    }

    return new UserEntity(user);
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const userEntity = new UserEntity(user);
    return userEntity.toSafeObject();
  }

  async getUserProfile(userId: string): Promise<SafeUser> {
    return this.findById(userId);
  }

  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === UserRole.ADMIN;
  }

  async isNikita(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === UserRole.NIKITA;
  }
}
