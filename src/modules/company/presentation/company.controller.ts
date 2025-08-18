import { Body, Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CompanyService } from '../application/services/company.service';
import { CreateCompanyAndLeaderDto } from '../application/dtos/create-company-and-leader.dto';
import { CreateCompanyAndLeaderResponseDto } from '../application/dtos/create-company-and-leader-response.dto';
import { CompanyInformationDto } from '../application/dtos/company-information.dto';
import { CompanyLeaderGuard } from './guards/company-leader.guard';
import { CurrentUser } from '@modules/auth/presentation/decorators/current-user.decorator';

@ApiTags('Company')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  createCompanyAndLeader(
    @Body() createCompanyDto: CreateCompanyAndLeaderDto,
  ): Promise<CreateCompanyAndLeaderResponseDto> {
    return this.companyService.createCompanyAndLeader(createCompanyDto);
  }

  @Get(':id/information')
  @UseGuards(CompanyLeaderGuard)
  @ApiOperation({ 
    summary: 'Get company information',
    description: 'Retrieve detailed statistics and information about a company. Only accessible by the company leader.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Company ID',
    example: 'company-123'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Company information retrieved successfully',
    type: CompanyInformationDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing session token'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - User is not the company leader'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Company not found'
  })
  getCompanyInformation(
    @Param('id') companyId: string,
    @CurrentUser() user: any,
  ): Promise<CompanyInformationDto> {
    return this.companyService.getCompanyInformation(companyId);
  }
}
