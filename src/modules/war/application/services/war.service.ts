import { War } from '@prisma/client';
import { UploadWarDto } from '../dtos/upload-war.dto';
import { Injectable } from '@nestjs/common';
import { WarRepository } from '@modules/war/domain/repositories/war.repository';

@Injectable()
export class WarService {
  constructor(private readonly warRepository: WarRepository) {}

  async uploadWar(war: UploadWarDto): Promise<War> {
    if (war.opponentId === war.companyId) {
      throw new Error('Attacker and defender cannot be the same company');
    }

    const existingWar = await this.warRepository.findWarByTerritoryAndDateTime(
      war.territory,
      war.startTime,
    );

    if (existingWar) {
      if (!this.isBySameCompany(war, existingWar)) {
        throw new Error('A war for this time and territory already exists');
      }

      const isSameCompanyAsOpponent =
        (war.warType === 'Attacker' &&
          war.companyId === existingWar.defenderId) ||
        (war.warType === 'Defender' &&
          war.companyId === existingWar.attackerId);

      if (isSameCompanyAsOpponent) {
        throw new Error(
          'A company cannot be both attacker and defender in the same war',
        );
      }

      const existingSides = await this.warRepository.findSidesByWarId(
        existingWar.id,
      );
      const sideExists = existingSides.some(
        (side) => side.companyId === war.companyId && side.type === war.warType,
      );

      if (sideExists) {
        throw new Error(
          `This company has already registered as ${war.warType.toLowerCase()} for this war`,
        );
      }

      return await this.warRepository.attachSideToWar(war, existingWar);
    }

    return await this.warRepository.createWarWithAttachedSide(war);
  }

  async rollbackWar(id: string): Promise<void> {
    const war = await this.warRepository.findWarById(id);
    if (!war) throw new Error('War not found');

    await this.warRepository.rollbackWar(id);
  }

  private isBySameCompany(warDto: UploadWarDto, war: War): boolean {
    return (
      warDto.companyId === war.attackerId || warDto.companyId === war.defenderId
    );
  }
}
