import { Module } from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { RoundsController } from './rounds.controller';
import { PrismaService } from '../../config/prisma.service';
import { RedisService } from '../../config/redis.service';
import { LeaderElectionService } from '../../config/leader-election.service';

@Module({
  controllers: [RoundsController],
  providers: [
    RoundsService,
    PrismaService,
    RedisService,
    LeaderElectionService,
  ],
  exports: [RoundsService],
})
export class RoundsModule {}
