import { Faction } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsString, ValidateNested, IsOptional } from 'class-validator';

class AdminCompanyDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}

export class CreateCompanyAndLeaderDto {
  @IsString()
  name: string;

  @IsEnum(Faction)
  faction: Faction;

  @IsString()
  @IsOptional()
  world?: string;

  @ValidateNested()
  @Type(() => AdminCompanyDto)
  admin: AdminCompanyDto;
}
