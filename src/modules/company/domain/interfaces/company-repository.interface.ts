import { CreateCompanyDto } from '@modules/company/domain/dtos/create-company.dto';
import { Company } from '@prisma/client';
import { CompanyInformationDto } from '@modules/company/application/dtos/company-information.dto';

export interface ICompanyRepository {
  createCompany(company: CreateCompanyDto): Promise<Company>;
  getCompanyInformation(companyId: string): Promise<CompanyInformationDto>;
  findCompanyById(companyId: string): Promise<Company | null>;
}
