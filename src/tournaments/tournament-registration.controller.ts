import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { TournamentRegistrationService } from './tournament-registration.service';
import { RegistrationStatus } from './entities/tournament-registration.entity';

@Controller('tournaments')
export class TournamentRegistrationController {
  constructor(private registrationService: TournamentRegistrationService) {}

  @Post(':tournamentId/register/:teamId')
  async registerTeam(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('teamId', ParseIntPipe) teamId: number,
  ) {
    return await this.registrationService.registerTeam(tournamentId, teamId);
  }

  @Get(':tournamentId/registrations')
  async getTournamentRegistrations(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
  ) {
    return await this.registrationService.getTournamentRegistrations(
      tournamentId,
    );
  }

  @Patch('registrations/:registrationId/status')
  async updateRegistrationStatus(
    @Param('registrationId', ParseIntPipe) registrationId: number,
    @Body() body: { status: RegistrationStatus; rejectionReason?: string },
  ) {
    return await this.registrationService.updateRegistrationStatus(
      registrationId,
      body.status,
      body.rejectionReason,
    );
  }

  @Get('teams/:teamId/registrations')
  async getTeamRegistrations(@Param('teamId', ParseIntPipe) teamId: number) {
    return await this.registrationService.getTeamRegistrations(teamId);
  }
}
