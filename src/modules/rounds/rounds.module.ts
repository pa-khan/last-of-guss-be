import { Module } from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { RoundsController } from './rounds.controller';
import { PrismaService } from '../../config/prisma.service';
import { RedisService } from '../../config/redis.service';

@Module({
  controllers: [RoundsController],
  providers: [RoundsService, PrismaService, RedisService],
  exports: [RoundsService],
})
export class RoundsModule {}
