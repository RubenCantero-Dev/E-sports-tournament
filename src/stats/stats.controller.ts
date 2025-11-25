import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('players/:playerId')
  async getPlayerStats(@Param('playerId', ParseIntPipe) playerId: number) {
    return await this.statsService.getPlayerStats(playerId);
  }

  @Get('players/:playerId/:game')
  async getPlayerStatsByGame(
    @Param('playerId', ParseIntPipe) playerId: number,
    @Param('game') game: string,
  ) {
    return await this.statsService.getPlayerStats(playerId, game);
  }

  @Get('leaderboards/:game')
  async getLeaderboard(@Param('game') game: string) {
    return await this.statsService.getLeaderboard(game);
  }

  @Get('top-players/:game')
  async getTopPlayers(@Param('game') game: string) {
    return await this.statsService.getTopPlayers(game, 10);
  }

  @Get('top-players/:game/:limit')
  async getTopPlayersWithLimit(
    @Param('game') game: string,
    @Param('limit', ParseIntPipe) limit: number,
  ) {
    return await this.statsService.getTopPlayers(game, limit);
  }
}
