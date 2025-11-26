import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerStats } from './player-stats.entity';
import { Leaderboard, LeaderboardType } from './leaderboard.entity';
import { LeaderboardEntry } from './leaderboard-entry.entity';
import { User } from '../users/user.entity';
import { Match, MatchStatus } from '../tournaments/entities/match.entity';
import { Team } from '../teams/team.entity';

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
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,
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

    try {
      // Obtener el torneo para saber el juego
      const tournament = await this.getTournamentFromMatch(match);
      const game = tournament?.game || 'Valorant';

      // Actualizar stats para team1 (usando el capitán)
      if (match.team1) {
        const captain = await this.getTeamCaptain(match.team1.id);
        if (captain) {
          await this.updateUserStats(
            captain.id,
            match.winner.id === match.team1.id,
            game,
          );
        }
      }

      // Actualizar stats para team2 (usando el capitán)
      if (match.team2) {
        const captain = await this.getTeamCaptain(match.team2.id);
        if (captain) {
          await this.updateUserStats(
            captain.id,
            match.winner.id === match.team2.id,
            game,
          );
        }
      }
    } catch (error) {
      console.error('Error actualizando stats:', error);
      throw error;
    }
  }

  private async getTournamentFromMatch(match: Match): Promise<any> {
    // Obtener el torneo a través del bracket
    const matchWithBracket = await this.matchRepo.findOne({
      where: { id: match.id },
      relations: ['bracket', 'bracket.tournament'],
    });

    return matchWithBracket?.bracket?.tournament;
  }

  private async getTeamCaptain(teamId: number): Promise<User | null> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['captain'],
    });

    return team?.captain || null;
  }

  private async updateUserStats(
    userId: number,
    isWinner: boolean,
    game: string,
  ): Promise<void> {
    let stats = await this.getPlayerStats(userId, game);

    stats.totalMatches += 1;

    if (isWinner) {
      stats.wins += 1;
      stats.eloRating += 25;
    } else {
      stats.losses += 1;
      stats.eloRating = Math.max(800, stats.eloRating - 15);
    }

    stats.winRate = (stats.wins / stats.totalMatches) * 100;

    stats.kills += Math.floor(Math.random() * 20) + 10;
    stats.deaths += Math.floor(Math.random() * 15) + 5;
    stats.kdRatio = stats.kills / Math.max(stats.deaths, 1);

    await this.playerStatsRepo.save(stats);
    await this.updateLeaderboards(stats);
  }

  async updateLeaderboards(playerStats: PlayerStats): Promise<void> {
    const leaderboard = await this.ensureLeaderboardExists(playerStats.game);

    let entry = await this.leaderboardEntryRepo.findOne({
      where: {
        leaderboard: { id: leaderboard.id },
        player: { id: playerStats.player.id },
      },
      relations: ['player'],
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

  private async ensureLeaderboardExists(game: string): Promise<Leaderboard> {
    let leaderboard = await this.leaderboardRepo.findOne({
      where: { game, type: LeaderboardType.GLOBAL },
    });

    if (!leaderboard) {
      leaderboard = this.leaderboardRepo.create({
        game: game,
        type: LeaderboardType.GLOBAL,
        isActive: true,
      });
      leaderboard = await this.leaderboardRepo.save(leaderboard);
    }

    return leaderboard;
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
      take: 100,
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
