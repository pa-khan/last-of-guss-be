import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoundStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../config/prisma.service';
import { CreateRoundDto } from './dto/create-round.dto';
import {
  RoundDetailDto,
  RoundListItemDto,
  TapResponseDto,
} from './dto/round-response.dto';
import { RoundEntity } from './entities/round.entity';
import {
  RoundNotActiveException,
  RoundNotFoundException,
  RoundTimeInvalidException,
  TapProcessingException,
} from '../../common/exceptions/round.exceptions';
import { AppConfiguration } from '../../config/configuration';

@Injectable()
export class RoundsService {
  private readonly logger = new Logger(RoundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfiguration, true>,
  ) {}

  async createRound(createRoundDto: CreateRoundDto): Promise<RoundDetailDto> {
    const now = new Date();

    const cooldownDuration = this.configService.get('round.cooldownDuration', {
      infer: true,
    });
    const roundDuration = this.configService.get('round.duration', {
      infer: true,
    });

    const startAt = createRoundDto.startAt
      ? new Date(createRoundDto.startAt)
      : new Date(now.getTime() + cooldownDuration * 1000);

    const endAt = createRoundDto.endAt
      ? new Date(createRoundDto.endAt)
      : new Date(startAt.getTime() + roundDuration * 1000);

    const status = RoundEntity.determineStatus(startAt, endAt);

    const round = await this.prisma.round.create({
      data: {
        startAt,
        endAt,
        status,
        totalScore: 0,
        bossImage: createRoundDto.bossImage ?? null,
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
      },
    });

    this.logger.log(
      `Round created: ${round.id}, status: ${status}, start: ${startAt.toISOString()}, end: ${endAt.toISOString()}`,
    );

    return new RoundDetailDto(round);
  }

  async getRounds(statusFilter?: RoundStatus): Promise<RoundListItemDto[]> {
    const where = statusFilter ? { status: statusFilter } : {};

    const rounds = await this.prisma.round.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    const updatedRounds = await Promise.all(
      rounds.map(async (round) => {
        const currentStatus = RoundEntity.determineStatus(
          round.startAt,
          round.endAt,
        );

        if (currentStatus !== round.status) {
          const updated = await this.prisma.round.update({
            where: { id: round.id },
            data: { status: currentStatus },
          });
          return updated;
        }

        return round;
      }),
    );

    return updatedRounds.map((round) => new RoundListItemDto(round));
  }

  async getRoundDetails(
    roundId: string,
    currentUserId: string,
  ): Promise<RoundDetailDto> {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: {
        participants: {
          include: {
            user: true,
          },
          orderBy: {
            score: 'desc',
          },
        },
      },
    });

    if (!round) {
      throw new RoundNotFoundException(roundId);
    }

    const currentStatus = RoundEntity.determineStatus(
      round.startAt,
      round.endAt,
    );
    if (currentStatus !== round.status) {
      await this.prisma.round.update({
        where: { id: roundId },
        data: { status: currentStatus },
      });
      round.status = currentStatus;
    }

    return new RoundDetailDto(round, currentUserId);
  }

  async processTap(roundId: string, userId: string): Promise<TapResponseDto> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const round = await tx.round.findUnique({
            where: { id: roundId },
          });

          if (!round) {
            throw new RoundNotFoundException(roundId);
          }

          const now = new Date();
          const currentStatus = RoundEntity.determineStatus(
            round.startAt,
            round.endAt,
          );

          if (currentStatus !== RoundStatus.ACTIVE) {
            this.logger.warn(
              `Tap attempt on non-active round ${roundId} by user ${userId}. Status: ${currentStatus}`,
            );
            throw new RoundNotActiveException(roundId, currentStatus);
          }

          if (now < round.startAt || now > round.endAt) {
            throw new RoundTimeInvalidException(
              'Round is not within active time boundaries',
            );
          }

          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, role: true },
          });

          if (!user) {
            throw new Error('User not found');
          }

          const participant = await tx.roundParticipant.upsert({
            where: {
              roundId_userId: {
                roundId,
                userId,
              },
            },
            update: {},
            create: {
              roundId,
              userId,
              taps: 0,
              score: 0,
            },
          });

          const newTaps = participant.taps + 1;
          const isEleventhTap = newTaps % 11 === 0;

          let pointsToAdd = 0;
          if (user.role !== UserRole.NIKITA) {
            pointsToAdd = isEleventhTap ? 10 : 1;
          }

          const newScore = participant.score + pointsToAdd;

          await tx.roundParticipant.update({
            where: { id: participant.id },
            data: {
              taps: newTaps,
              score: newScore,
            },
          });

          let updatedRoundTotalScore = round.totalScore;
          if (user.role !== UserRole.NIKITA) {
            const updatedRound = await tx.round.update({
              where: { id: roundId },
              data: {
                totalScore: {
                  increment: pointsToAdd,
                },
              },
              select: { totalScore: true },
            });
            updatedRoundTotalScore = updatedRound.totalScore;
          }

          this.logger.debug(
            `Tap processed: user=${user.username}, round=${roundId}, taps=${newTaps}, score=${newScore}, points=${pointsToAdd}, isNikita=${user.role === UserRole.NIKITA}`,
          );

          return new TapResponseDto(
            newScore,
            newTaps,
            pointsToAdd,
            isEleventhTap,
            updatedRoundTotalScore,
          );
        },
        {
          isolationLevel: 'Serializable',
          maxWait: 5000,
          timeout: 10000,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Tap processing failed: ${errorMessage}`, errorStack);

      if (
        error instanceof RoundNotFoundException ||
        error instanceof RoundNotActiveException ||
        error instanceof RoundTimeInvalidException
      ) {
        throw error;
      }

      throw new TapProcessingException(
        'Failed to process tap due to concurrent modification. Please try again.',
      );
    }
  }

  async updateRoundStatuses(): Promise<void> {
    const rounds = await this.prisma.round.findMany({
      where: {
        status: {
          in: [RoundStatus.COOLDOWN, RoundStatus.ACTIVE],
        },
      },
    });

    for (const round of rounds) {
      const currentStatus = RoundEntity.determineStatus(
        round.startAt,
        round.endAt,
      );

      if (currentStatus !== round.status) {
        await this.prisma.round.update({
          where: { id: round.id },
          data: { status: currentStatus },
        });

        this.logger.log(
          `Round ${round.id} status updated: ${round.status} -> ${currentStatus}`,
        );
      }
    }
  }

  async canCreateRound(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === UserRole.ADMIN;
  }
}
