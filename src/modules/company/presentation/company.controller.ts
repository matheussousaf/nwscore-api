import { Body, Controller, Post } from '@nestjs/common';
import { CompanyService } from '../application/services/company.service';
import { CreateCompanyAndLeaderDto } from '../application/dtos/create-company-and-leader.dto';
import { CreateCompanyAndLeaderResponseDto } from '../application/dtos/create-company-and-leader-response.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  createCompanyAndLeader(
    @Body() createCompanyDto: CreateCompanyAndLeaderDto,
  ): Promise<CreateCompanyAndLeaderResponseDto> {
    return this.companyService.createCompanyAndLeader(createCompanyDto);
  }
}
