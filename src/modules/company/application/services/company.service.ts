import { Injectable } from '@nestjs/common';
import { CreateCompanyAndLeaderDto } from '../dtos/create-company-and-leader.dto';
import { CreateCompanyAndLeaderResponseDto } from '../dtos/create-company-and-leader-response.dto';
import { CompanyRepository } from '@modules/company/domain/repositories/company.repository';
import { CompanyInformationDto } from '../dtos/company-information.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async createCompanyAndLeader(
    createCompanyDto: CreateCompanyAndLeaderDto,
  ): Promise<CreateCompanyAndLeaderResponseDto> {
    return await this.companyRepository.createCompanyAndLeader(
      createCompanyDto,
    );
  }

  async getCompanyInformation(companyId: string): Promise<CompanyInformationDto> {
    return await this.companyRepository.getCompanyInformation(companyId);
  }
}
