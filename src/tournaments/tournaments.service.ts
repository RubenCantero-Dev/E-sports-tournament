import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from './tournament.entity';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentsRepo: Repository<Tournament>,
  ) {}

  async create(tournamentData: Partial<Tournament>): Promise<Tournament> {
    const tournament = this.tournamentsRepo.create(tournamentData);
    return await this.tournamentsRepo.save(tournament);
  }

  async findAll(): Promise<Tournament[]> {
    return await this.tournamentsRepo.find({ relations: ['createdBy'] });
  }

  async findOne(id: number): Promise<Tournament> {
    const tournament = await this.tournamentsRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });
    if (!tournament) {
      throw new Error('Torneo no encontrado');
    }
    return tournament;
  }
}
