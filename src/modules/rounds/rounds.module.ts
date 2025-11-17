import { Module } from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { RoundsController } from './rounds.controller';
import { PrismaService } from '../../config/prisma.service';

@Module({
  controllers: [RoundsController],
  providers: [RoundsService, PrismaService],
  exports: [RoundsService],
})
export class RoundsModule {}
