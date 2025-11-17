import { Round as PrismaRound, RoundStatus } from '@prisma/client';

export class RoundEntity implements PrismaRound {
  id!: string;
  startAt!: Date;
  endAt!: Date;
  totalScore!: number;
  status!: RoundStatus;
  bossImage!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<RoundEntity>) {
    Object.assign(this, partial);
  }

  static determineStatus(startAt: Date, endAt: Date): RoundStatus {
    const now = new Date();
    const startTime = new Date(startAt);
    const endTime = new Date(endAt);

    if (now < startTime) {
      return RoundStatus.COOLDOWN;
    }

    if (now >= startTime && now <= endTime) {
      return RoundStatus.ACTIVE;
    }

    return RoundStatus.FINISHED;
  }

  getCurrentStatus(): RoundStatus {
    return RoundEntity.determineStatus(this.startAt, this.endAt);
  }

  isActive(): boolean {
    return this.getCurrentStatus() === RoundStatus.ACTIVE;
  }

  isCooldown(): boolean {
    return this.getCurrentStatus() === RoundStatus.COOLDOWN;
  }

  isFinished(): boolean {
    return this.getCurrentStatus() === RoundStatus.FINISHED;
  }

  getTimeRemaining(): number {
    const now = new Date();
    const status = this.getCurrentStatus();

    if (status === RoundStatus.COOLDOWN) {
      return Math.max(
        0,
        Math.floor((this.startAt.getTime() - now.getTime()) / 1000),
      );
    }

    if (status === RoundStatus.ACTIVE) {
      return Math.max(
        0,
        Math.floor((this.endAt.getTime() - now.getTime()) / 1000),
      );
    }

    return 0;
  }
}
