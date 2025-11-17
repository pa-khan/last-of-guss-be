import { IsOptional, IsDateString, IsString } from 'class-validator';

export class CreateRoundDto {
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  bossImage?: string;
}
