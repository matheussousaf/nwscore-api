import { Faction } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsString, ValidateNested } from 'class-validator';

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

  @ValidateNested()
  @Type(() => AdminCompanyDto)
  admin: AdminCompanyDto;
}
