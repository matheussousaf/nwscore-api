import { CreateWarDto } from '@modules/war/application/dtos/create-war.dto';
import { UploadWarDto } from '@modules/war/application/dtos/upload-war.dto';
import { War } from '@prisma/client';

export interface IWarRepository {
  createWarWithAttachedSide(warData: UploadWarDto): Promise<War>;
  findWarByTerritoryAndDateTime(
    territory: string,
    startTime: Date,
  ): Promise<War | null>;
  attachSideToWar(warData: UploadWarDto, existingWar: War): Promise<War>;
}
