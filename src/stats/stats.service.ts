import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerStats } from './player-stats.entity';
import { Leaderboard, LeaderboardType } from './leaderboard.entity';
import { LeaderboardEntry } from './leaderboard-entry.entity';
import { User } from '../users/user.entity';
import { Match, MatchStatus } from '../tournaments/entities/match.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(PlayerStats)
    private playerStatsRepo: Repository<PlayerStats>,
    @InjectRepository(Leaderboard)
    private leaderboardRepo: Repository<Leaderboard>,
    @InjectRepository(LeaderboardEntry)
    private leaderboardEntryRepo: Repository<LeaderboardEntry>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Match)
    private matchRepo: Repository<Match>,
  ) {}

  async getPlayerStats(playerId: number, game?: string): Promise<PlayerStats> {
    const where: any = { player: { id: playerId } };
    if (game) {
      where.game = game;
    }

    let stats = await this.playerStatsRepo.findOne({
      where,
      relations: ['player'],
    });

    if (!stats) {
      // Crear stats por defecto si no existen
      stats = this.playerStatsRepo.create({
        player: { id: playerId },
        game: game || 'general',
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        eloRating: 1200,
        kills: 0,
        deaths: 0,
        kdRatio: 0,
      });
      stats = await this.playerStatsRepo.save(stats);
    }

    return stats;
  }

  async updatePlayerStatsFromMatch(match: Match): Promise<void> {
    if (match.status !== MatchStatus.COMPLETED || !match.winner) {
      return;
    }

    // Actualizar stats para team1
    if (match.team1) {
      await this.updateTeamStats(
        match.team1.id,
        match.winner.id === match.team1.id,
      );
    }

    // Actualizar stats para team2
    if (match.team2) {
      await this.updateTeamStats(
        match.team2.id,
        match.winner.id === match.team2.id,
      );
    }
  }

  private async updateTeamStats(
    teamId: number,
    isWinner: boolean,
  ): Promise<void> {
    // Por simplicidad, actualizamos stats del capitán
    // En un sistema real, actualizaríamos todos los miembros del equipo
    const team = await this.userRepo.findOne({
      where: { id: teamId },
      relations: ['teams'],
    });

    if (!team) return;

    const game = 'valorant'; // Por ahora hardcodeado
    let stats = await this.getPlayerStats(team.id, game);

    stats.totalMatches += 1;

    if (isWinner) {
      stats.wins += 1;
      stats.eloRating += 25; // Ganar ELO
    } else {
      stats.losses += 1;
      stats.eloRating = Math.max(800, stats.eloRating - 15); // Perder ELO (mínimo 800)
    }

    stats.winRate = (stats.wins / stats.totalMatches) * 100;

    // Simular algunas kills/deaths para el ejemplo
    stats.kills += Math.floor(Math.random() * 30) + 10;
    stats.deaths += Math.floor(Math.random() * 20) + 5;
    stats.kdRatio = stats.kills / Math.max(stats.deaths, 1);

    await this.playerStatsRepo.save(stats);

    // Actualizar leaderboards
    await this.updateLeaderboards(stats);
  }

  async updateLeaderboards(playerStats: PlayerStats): Promise<void> {
    let leaderboard = await this.leaderboardRepo.findOne({
      where: { game: playerStats.game, type: LeaderboardType.GLOBAL },
    });

    if (!leaderboard) {
      leaderboard = this.leaderboardRepo.create({
        game: playerStats.game,
        type: LeaderboardType.GLOBAL,
        isActive: true,
      });
      leaderboard = await this.leaderboardRepo.save(leaderboard);
    }

    // Actualizar o crear entrada en leaderboard
    let entry = await this.leaderboardEntryRepo.findOne({
      where: {
        leaderboard: { id: leaderboard.id },
        player: { id: playerStats.player.id },
      },
    });

    if (!entry) {
      entry = this.leaderboardEntryRepo.create({
        leaderboard,
        player: playerStats.player,
        rating: playerStats.eloRating,
        wins: playerStats.wins,
        losses: playerStats.losses,
        position: 0,
      });
    } else {
      entry.rating = playerStats.eloRating;
      entry.wins = playerStats.wins;
      entry.losses = playerStats.losses;
    }

    await this.leaderboardEntryRepo.save(entry);

    // Recalcular posiciones
    await this.recalculateLeaderboardPositions(leaderboard.id);
  }

  async recalculateLeaderboardPositions(leaderboardId: number): Promise<void> {
    const entries = await this.leaderboardEntryRepo.find({
      where: { leaderboard: { id: leaderboardId } },
      relations: ['player'],
      order: { rating: 'DESC' },
    });

    for (let i = 0; i < entries.length; i++) {
      entries[i].position = i + 1;
      await this.leaderboardEntryRepo.save(entries[i]);
    }
  }

  async getLeaderboard(
    game: string,
    type: string = LeaderboardType.GLOBAL,
  ): Promise<LeaderboardEntry[]> {
    const leaderboard = await this.leaderboardRepo.findOne({
      where: { game, type },
    });

    if (!leaderboard) {
      throw new NotFoundException('Leaderboard no encontrado');
    }

    return await this.leaderboardEntryRepo.find({
      where: { leaderboard: { id: leaderboard.id } },
      relations: ['player'],
      order: { position: 'ASC' },
      take: 100, // Top 100
    });
  }

  async getTopPlayers(
    game: string,
    limit: number = 10,
  ): Promise<PlayerStats[]> {
    return await this.playerStatsRepo.find({
      where: { game },
      relations: ['player'],
      order: { eloRating: 'DESC' },
      take: limit,
    });
  }
}
