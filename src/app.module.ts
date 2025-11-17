import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './config/prisma.service';
import { RedisService } from './config/redis.service';
import { LeaderElectionService } from './config/leader-election.service';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoundsModule } from './modules/rounds/rounds.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    RoundsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, RedisService, LeaderElectionService],
  exports: [PrismaService, RedisService, LeaderElectionService],
})
export class AppModule {}
