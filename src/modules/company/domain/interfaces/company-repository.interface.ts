import { CreateCompanyDto } from '@modules/company/domain/dtos/create-company.dto';
import { Company } from '@prisma/client';

export interface ICompanyRepository {
  createCompany(company: CreateCompanyDto): Promise<Company>;
}
