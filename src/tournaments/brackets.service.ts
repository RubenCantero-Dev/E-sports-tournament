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
    // Verificar si ya existe un bracket para este torneo
    const existingBrackets = await this.bracketRepo.find({
      where: { tournament: { id: tournamentId } },
      relations: ['matches', 'matches.team1', 'matches.team2'],
    });

    // Si ya existe un bracket con partidas, retornarlo
    if (
      existingBrackets.length > 0 &&
      existingBrackets.some((b) => b.matches.length > 0)
    ) {
      return existingBrackets;
    }

    // Si existe un bracket vacío, eliminarlo
    if (existingBrackets.length > 0) {
      await this.bracketRepo.remove(existingBrackets);
    }

    const tournament = await this.tournamentRepo.findOne({
      where: { id: tournamentId },
      relations: [
        'registrations',
        'registrations.team',
        'registrations.team.captain',
      ],
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

    // Generar bracket principal
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

    // Mezclar equipos aleatoriamente
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
      relations: ['bracket', 'team1', 'team2', 'bracket.tournament'],
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

    // Actualizar estadísticas
    await this.statsService.updatePlayerStatsFromMatch(updatedMatch);

    // Generar siguiente ronda si es necesario
    await this.generateNextRoundIfNeeded(match.bracket.id);

    return updatedMatch;
  }

  private async generateNextRoundIfNeeded(bracketId: number): Promise<void> {
    const bracket = await this.bracketRepo.findOne({
      where: { id: bracketId },
      relations: [
        'matches',
        'matches.team1',
        'matches.team2',
        'matches.winner',
        'tournament',
      ],
    });

    if (!bracket || !bracket.tournament) {
      console.log('Bracket o tournament no encontrado');
      return;
    }

    // Obtener todas las partidas de esta ronda
    const currentRoundMatches = bracket.matches.filter(
      (match) => match.bracket?.id === bracketId,
    );

    // Verificar si todas las partidas de esta ronda están completas
    const allMatchesCompleted = currentRoundMatches.every(
      (match) => match.status === MatchStatus.COMPLETED,
    );

    if (!allMatchesCompleted) {
      return;
    }

    // Obtener ganadores de esta ronda
    const winners = currentRoundMatches
      .map((match) => match.winner)
      .filter((winner) => winner !== null);

    if (winners.length <= 1) {
      if (winners.length === 1) {
        await this.finalizeTournament(bracket.tournament.id, winners[0]);
      }
      return;
    }

    // Crear siguiente ronda
    const nextRoundNumber = bracket.round + 1;

    let nextBracket = await this.bracketRepo.findOne({
      where: {
        tournament: { id: bracket.tournament.id },
        round: nextRoundNumber,
      },
    });

    if (!nextBracket) {
      nextBracket = this.bracketRepo.create({
        tournament: { id: bracket.tournament.id },
        name: `Round ${nextRoundNumber}`,
        round: nextRoundNumber,
        status: 'upcoming',
      });
      nextBracket = await this.bracketRepo.save(nextBracket);
    }

    await this.generateMatchesForRound(
      nextBracket.id,
      winners,
      nextRoundNumber,
    );
  }

  private async generateMatchesForRound(
    bracketId: number,
    teams: any[],
    roundNumber: number,
  ): Promise<void> {
    const matches: Match[] = [];
    let matchNumber = 1;

    // Para semifinales y finales, emparejar equipos en orden
    for (let i = 0; i < teams.length; i += 2) {
      if (i + 1 < teams.length) {
        const match = this.matchRepo.create({
          bracket: { id: bracketId },
          matchNumber: matchNumber++,
          team1: teams[i],
          team2: teams[i + 1],
          status: MatchStatus.SCHEDULED,
        });
        matches.push(match);
      } else {
        // En caso de número impar, el último equipo pasa directo
        const match = this.matchRepo.create({
          bracket: { id: bracketId },
          matchNumber: matchNumber++,
          team1: teams[i],
          status: MatchStatus.SCHEDULED,
        });
        matches.push(match);
      }
    }

    await this.matchRepo.save(matches);
  }

  private async finalizeTournament(
    tournamentId: number,
    champion: any,
  ): Promise<void> {
    await this.tournamentRepo.update(tournamentId, {
      status: 'completed',
    });

    console.log(
      `🎉 ¡Torneo ${tournamentId} completado! Campeón: ${champion.name}`,
    );
  }

  async getAllMatches(): Promise<Match[]> {
    return await this.matchRepo.find({
      relations: ['bracket', 'bracket.tournament', 'team1', 'team2', 'winner'],
      order: { bracket: { tournament: { id: 'ASC' } }, matchNumber: 'ASC' },
    });
  }

  // Método para limpiar brackets duplicados (solo para administración)
  async cleanupDuplicateBrackets(tournamentId: number): Promise<void> {
    const brackets = await this.bracketRepo.find({
      where: { tournament: { id: tournamentId } },
      relations: ['matches'],
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    if (brackets.length > 1) {
      // Mantener el bracket más reciente, eliminar los demás
      const [bracketToKeep, ...bracketsToDelete] = brackets;

      if (bracketsToDelete.length > 0) {
        await this.bracketRepo.remove(bracketsToDelete);
      }
    }
  }
}
