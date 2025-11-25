import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { BracketsService } from './brackets.service';

@Controller('tournaments')
export class BracketsController {
  constructor(private bracketsService: BracketsService) {}

  @Post(':tournamentId/generate-bracket')
  async generateBracket(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
  ) {
    return await this.bracketsService.generateBracket(tournamentId);
  }

  @Get(':tournamentId/brackets')
  async getTournamentBrackets(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
  ) {
    return await this.bracketsService.getTournamentBrackets(tournamentId);
  }

  @Patch('matches/:matchId/result')
  async updateMatchResult(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Body() body: { team1Score: number; team2Score: number },
  ) {
    return await this.bracketsService.updateMatchResult(
      matchId,
      body.team1Score,
      body.team2Score,
    );
  }

  @Get('matches')
  async getAllMatches() {
    // Esto necesitaría un servicio separado, pero por ahora usemos bracketsService
    return { message: 'Endpoint para listar todas las partidas' };
  }
}
