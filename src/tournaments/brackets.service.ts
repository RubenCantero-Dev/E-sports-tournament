import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bracket } from './entities/bracket.entity';
import { Match, MatchStatus } from './entities/match.entity';
import { Tournament } from './tournament.entity';
import {
  TournamentRegistration,
  RegistrationStatus,
} from './entities/tournament-registration.entity';
import { StatsService } from '../stats/stats.service';

@Injectable()
export class BracketsService {
  constructor(
    @InjectRepository(Bracket)
    private bracketRepo: Repository<Bracket>,
    @InjectRepository(Match)
    private matchRepo: Repository<Match>,
    @InjectRepository(Tournament)
    private tournamentRepo: Repository<Tournament>,
    @InjectRepository(TournamentRegistration)
    private registrationRepo: Repository<TournamentRegistration>,
    private statsService: StatsService,
  ) {}

  async generateBracket(tournamentId: number): Promise<Bracket[]> {
    const tournament = await this.tournamentRepo.findOne({
      where: { id: tournamentId },
      relations: ['registrations', 'registrations.team'],
    });

    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado');
    }

    // Obtener equipos aprobados
    const approvedTeams = tournament.registrations
      .filter((reg) => reg.status === RegistrationStatus.APPROVED)
      .map((reg) => reg.team);

    if (approvedTeams.length < 2) {
      throw new Error(
        'Se necesitan al menos 2 equipos aprobados para generar el bracket',
      );
    }

    const brackets: Bracket[] = [];

    // Generar bracket principal (eliminación simple)
    const mainBracket = this.bracketRepo.create({
      tournament: { id: tournamentId },
      name: 'Main Bracket',
      round: 1,
      status: 'upcoming',
    });

    const savedBracket = await this.bracketRepo.save(mainBracket);
    brackets.push(savedBracket);

    // Generar partidas para la primera ronda
    await this.generateFirstRoundMatches(savedBracket.id, approvedTeams);

    return brackets;
  }

  private async generateFirstRoundMatches(
    bracketId: number,
    teams: any[],
  ): Promise<void> {
    const matches: Match[] = [];
    let matchNumber = 1;

    // Mezclar equipos aleatoriamente para el emparejamiento
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (i + 1 < shuffledTeams.length) {
        const match = this.matchRepo.create({
          bracket: { id: bracketId },
          matchNumber: matchNumber++,
          team1: shuffledTeams[i],
          team2: shuffledTeams[i + 1],
          status: MatchStatus.SCHEDULED,
        });
        matches.push(match);
      } else {
        // Equipo que pasa directo (bye)
        const match = this.matchRepo.create({
          bracket: { id: bracketId },
          matchNumber: matchNumber++,
          team1: shuffledTeams[i],
          status: MatchStatus.SCHEDULED,
        });
        matches.push(match);
      }
    }

    await this.matchRepo.save(matches);
  }

  async getTournamentBrackets(tournamentId: number): Promise<Bracket[]> {
    return await this.bracketRepo.find({
      where: { tournament: { id: tournamentId } },
      relations: [
        'matches',
        'matches.team1',
        'matches.team2',
        'matches.winner',
      ],
      order: { round: 'ASC', matches: { matchNumber: 'ASC' } },
    });
  }

  async updateMatchResult(
    matchId: number,
    team1Score: number,
    team2Score: number,
  ): Promise<Match> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: ['bracket', 'team1', 'team2'],
    });

    if (!match) {
      throw new NotFoundException('Partida no encontrada');
    }

    match.team1Score = team1Score;
    match.team2Score = team2Score;
    match.status = MatchStatus.COMPLETED;

    // Determinar ganador
    if (team1Score > team2Score) {
      match.winner = match.team1;
    } else if (team2Score > team1Score) {
      match.winner = match.team2;
    } else {
      throw new Error('No puede haber empate en torneos de eliminación');
    }

    const updatedMatch = await this.matchRepo.save(match);

    // Actualizar estadísticas basadas en el resultado
    await this.statsService.updatePlayerStatsFromMatch(updatedMatch);

    // Generar siguiente ronda si es necesario
    await this.generateNextRound(match.bracket.id, updatedMatch);

    return updatedMatch;
  }

  private async generateNextRound(
    bracketId: number,
    completedMatch: Match,
  ): Promise<void> {
    const bracket = await this.bracketRepo.findOne({
      where: { id: bracketId },
      relations: [
        'matches',
        'matches.team1',
        'matches.team2',
        'matches.winner',
      ],
    });

    if (!bracket) return;

    // Verificar si todas las partidas de esta ronda están completas
    const currentRoundMatches = bracket.matches.filter(
      (m) =>
        m.matchNumber === completedMatch.matchNumber ||
        Math.ceil(m.matchNumber / 2) ===
          Math.ceil(completedMatch.matchNumber / 2),
    );

    const allMatchesCompleted = currentRoundMatches.every(
      (m) => m.status === MatchStatus.COMPLETED,
    );

    if (allMatchesCompleted && currentRoundMatches.length > 1) {
      await this.createNextRoundMatches(bracketId, currentRoundMatches);
    }
  }

  private async createNextRoundMatches(
    bracketId: number,
    completedMatches: Match[],
  ): Promise<void> {
    const winners = completedMatches
      .map((match) => match.winner)
      .filter((winner) => winner);

    if (winners.length >= 2) {
      const nextRoundMatch = this.matchRepo.create({
        bracket: { id: bracketId },
        matchNumber: Math.ceil(completedMatches[0].matchNumber / 2),
        team1: winners[0],
        team2: winners[1],
        status: MatchStatus.SCHEDULED,
      });

      await this.matchRepo.save(nextRoundMatch);
    }
  }
}
