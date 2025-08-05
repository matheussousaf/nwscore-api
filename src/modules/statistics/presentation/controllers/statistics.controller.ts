import { StatisticsService } from '@modules/statistics/application/services/statistics.service';
import { Controller, Get } from '@nestjs/common';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('recent-wars')
  recentWars() {
    return this.statisticsService.recentWars();
  }

  @Get('trending-players')
  trendingPlayers() {
    return this.statisticsService.trendingPlayers();
  }

  @Get('best-performances')
  bestPerformances() {
    return this.statisticsService.bestPerformances();
  }

  @Get('top-players')
  topPlayers() {
    return this.statisticsService.topPlayers();
  }
}
