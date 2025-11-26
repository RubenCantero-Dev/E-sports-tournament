import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from './tournament.entity';
import { User } from '../users/user.entity';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentsRepo: Repository<Tournament>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async create(
    tournamentData: Partial<Tournament> & { createdByUserId: number },
  ): Promise<Tournament> {
    const user = await this.usersRepo.findOne({
      where: { id: tournamentData.createdByUserId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const tournament = this.tournamentsRepo.create({
      ...tournamentData,
      createdBy: user,
    });

    return await this.tournamentsRepo.save(tournament);
  }

  async findAll(): Promise<Tournament[]> {
    return await this.tournamentsRepo.find({
      relations: ['createdBy'],
    });
  }

  async findOne(id: number): Promise<Tournament> {
    const tournament = await this.tournamentsRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });
    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado');
    }
    return tournament;
  }
}
