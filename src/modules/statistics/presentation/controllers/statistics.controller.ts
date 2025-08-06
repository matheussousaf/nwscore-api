import { StatisticsService } from '@modules/statistics/application/services/statistics.service';
import { Controller, Get } from '@nestjs/common';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('home')
  async getHomeStatistics() {
    return {
      recentWars: await this.statisticsService.getRecentWars(),
      trendingPlayers: await this.statisticsService.getTrendingPlayers(),
      bestPerformances: await this.statisticsService.getBestPerformances(),
      topPerformers: await this.statisticsService.getTopPerformers(),
    };
  }
}
