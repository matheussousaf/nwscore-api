import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SessionAuthGuard } from '@modules/auth/presentation/guards/session-auth.guard';
import { CompanyRepository } from '@modules/company/domain/repositories/company.repository';

@Injectable()
export class CompanyLeaderGuard implements CanActivate {
  constructor(
    private readonly sessionAuthGuard: SessionAuthGuard,
    private readonly companyRepository: CompanyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First, ensure the user is authenticated
    const isAuthenticated = await this.sessionAuthGuard.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const companyId = request.params.id;
    const userId = request.user?.id;

    if (!companyId || !userId) {
      throw new ForbiddenException('Invalid request parameters');
    }

    // Check if the user is the leader of the company
    const company = await this.companyRepository.findCompanyById(companyId);
    if (!company) {
      throw new ForbiddenException('Company not found');
    }

    if (company.leaderId !== userId) {
      throw new ForbiddenException('Only the company leader can access this information');
    }

    return true;
  }
}

