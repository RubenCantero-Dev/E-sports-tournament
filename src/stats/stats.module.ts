import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { PlayerStats } from './player-stats.entity';
import { Leaderboard } from './leaderboard.entity';
import { LeaderboardEntry } from './leaderboard-entry.entity';
import { User } from '../users/user.entity';
import { Match } from '../tournaments/entities/match.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlayerStats,
      Leaderboard,
      LeaderboardEntry,
      User,
      Match,
    ]),
  ],
  providers: [StatsService],
  controllers: [StatsController],
  exports: [StatsService],
})
export class StatsModule {}
