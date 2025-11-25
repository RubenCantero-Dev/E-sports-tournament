import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { Tournament } from './tournament.entity';
import { TournamentRegistration } from './entities/tournament-registration.entity';
import { TournamentRegistrationService } from './tournament-registration.service';
import { TournamentRegistrationController } from './tournament-registration.controller';
import { Team } from '../teams/team.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Bracket } from './entities/bracket.entity';
import { Match } from './entities/match.entity';
import { BracketsService } from './brackets.service';
import { BracketsController } from './brackets.controller';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tournament,
      TournamentRegistration,
      Team,
      Bracket,
      Match,
    ]),
    NotificationsModule,
    StatsModule,
  ],
  providers: [
    TournamentsService,
    TournamentRegistrationService,
    BracketsService,
  ],
  controllers: [
    TournamentsController,
    TournamentRegistrationController,
    BracketsController,
  ],
})
export class TournamentsModule {}
