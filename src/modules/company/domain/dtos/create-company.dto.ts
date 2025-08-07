import { Faction } from '@prisma/client';
import { IsObject, IsString, IsOptional } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsString()
  faction: Faction;

  @IsObject()
  leaderId: string;

  @IsString()
  @IsOptional()
  world?: string;
}
