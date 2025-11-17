import {
  Round as PrismaRound,
  RoundStatus,
  RoundParticipant,
  User,
} from '@prisma/client';

interface RoundBase {
  id: string;
  startAt: Date;
  endAt: Date;
  status: RoundStatus;
  totalScore: number;
  bossImage: string | null;
  createdAt: Date;
}

export class RoundParticipantDto {
  id: string;
  userId: string;
  username: string;
  taps: number;
  score: number;

  constructor(participant: RoundParticipant & { user: User }) {
    this.id = participant.id;
    this.userId = participant.userId;
    this.username = participant.user.username;
    this.taps = participant.taps;
    this.score = participant.score;
  }
}

export class RoundListItemDto {
  id: string;
  startAt: Date;
  endAt: Date;
  status: RoundStatus;
  totalScore: number;
  bossImage: string | null;
  createdAt: Date;

  constructor(round: RoundBase) {
    this.id = round.id;
    this.startAt = round.startAt;
    this.endAt = round.endAt;
    this.status = round.status;
    this.totalScore = round.totalScore;
    this.bossImage = round.bossImage;
    this.createdAt = round.createdAt;
  }
}

export class RoundDetailDto {
  id: string;
  startAt: Date;
  endAt: Date;
  status: RoundStatus;
  totalScore: number;
  bossImage: string | null;
  createdAt: Date;
  participants: RoundParticipantDto[];
  winner: RoundParticipantDto | null;
  myScore: number | null;
  myTaps: number | null;

  constructor(
    round: PrismaRound & {
      participants: (RoundParticipant & { user: User })[];
    },
    currentUserId?: string,
  ) {
    this.id = round.id;
    this.startAt = round.startAt;
    this.endAt = round.endAt;
    this.status = round.status;
    this.totalScore = round.totalScore;
    this.bossImage = round.bossImage ?? null;
    this.createdAt = round.createdAt;

    this.participants = round.participants.map(
      (p) => new RoundParticipantDto(p),
    );

    if (round.status === RoundStatus.FINISHED && this.participants.length > 0) {
      const sortedParticipants = [...this.participants].sort(
        (a, b) => b.score - a.score,
      );
      this.winner =
        sortedParticipants[0].score > 0 ? sortedParticipants[0] : null;
    } else {
      this.winner = null;
    }

    if (currentUserId) {
      const myParticipation = this.participants.find(
        (p) => p.userId === currentUserId,
      );
      this.myScore = myParticipation?.score ?? null;
      this.myTaps = myParticipation?.taps ?? null;
    } else {
      this.myScore = null;
      this.myTaps = null;
    }
  }
}

export class TapResponseDto {
  score: number;
  taps: number;
  pointsEarned: number;
  isEleventhTap: boolean;
  roundTotalScore: number;

  constructor(
    score: number,
    taps: number,
    pointsEarned: number,
    isEleventhTap: boolean,
    roundTotalScore: number,
  ) {
    this.score = score;
    this.taps = taps;
    this.pointsEarned = pointsEarned;
    this.isEleventhTap = isEleventhTap;
    this.roundTotalScore = roundTotalScore;
  }
}
