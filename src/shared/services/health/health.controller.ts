import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaClient } from '@prisma/client';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly prisma: PrismaHealthIndicator,
    private readonly prismaClient: PrismaClient,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'The service is healthy.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async check() {
    return await this.healthCheckService.check([
      () => this.http.pingCheck('google', 'https://www.google.com'),
      () => this.prisma.pingCheck('database', this.prismaClient),
    ]);
  }
}
