import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { RoundsService } from './rounds.service';
import { CreateRoundDto } from './dto/create-round.dto';
import {
  RoundDetailDto,
  RoundListItemDto,
  TapResponseDto,
} from './dto/round-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, RoundStatus } from '@prisma/client';

@Controller('rounds')
@UseGuards(JwtAuthGuard)
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createRound(
    @Body() createRoundDto: CreateRoundDto,
  ): Promise<RoundDetailDto> {
    return this.roundsService.createRound(createRoundDto);
  }

  @Get()
  async getRounds(
    @Query('status') status?: RoundStatus,
  ): Promise<RoundListItemDto[]> {
    return this.roundsService.getRounds(status);
  }

  @Get(':id')
  async getRoundDetails(
    @Param('id') roundId: string,
    @CurrentUser('id') userId: string,
  ): Promise<RoundDetailDto> {
    return this.roundsService.getRoundDetails(roundId, userId);
  }

  @Post(':id/tap')
  @HttpCode(HttpStatus.OK)
  async tapGoose(
    @Param('id') roundId: string,
    @CurrentUser('id') userId: string,
  ): Promise<TapResponseDto> {
    return this.roundsService.processTap(roundId, userId);
  }

  @Post('update-statuses')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateStatuses(): Promise<{ message: string }> {
    await this.roundsService.updateRoundStatuses();
    return { message: 'Round statuses updated successfully' };
  }
}
