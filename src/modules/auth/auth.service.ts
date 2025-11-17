import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './dto/auth-response.dto';
import { SafeUser } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: SafeUser; accessToken: string }> {
    const { username, password } = loginDto;

    const existingUser = await this.usersService.findByUsername(username);

    if (existingUser) {
      const isPasswordValid = await this.usersService.comparePasswords(
        password,
        existingUser.passwordHash,
      );

      if (!isPasswordValid) {
        this.logger.warn(`Failed login attempt for user: ${username}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.log(`User logged in: ${username}`);
      const safeUser = existingUser.toSafeObject();
      const accessToken = this.generateAccessToken(safeUser);

      return { user: safeUser, accessToken };
    }

    this.logger.log(`Creating new user: ${username}`);
    const newUser = await this.usersService.create({
      username,
      password,
    });

    const accessToken = this.generateAccessToken(newUser);

    return { user: newUser, accessToken };
  }

  private generateAccessToken(user: SafeUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  async validateUser(
    username: string,
    password: string,
  ): Promise<SafeUser | null> {
    const user = await this.usersService.findByUsername(username);

    if (!user) {
      return null;
    }

    const isPasswordValid = await this.usersService.comparePasswords(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return null;
    }

    return user.toSafeObject();
  }

  async getProfile(userId: string): Promise<SafeUser> {
    return this.usersService.getUserProfile(userId);
  }
}
