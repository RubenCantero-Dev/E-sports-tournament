import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './team.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamsRepo: Repository<Team>,
  ) {}

  async create(teamData: Partial<Team>): Promise<Team> {
    const team = this.teamsRepo.create(teamData);
    return await this.teamsRepo.save(team);
  }

  async findAll(): Promise<Team[]> {
    return await this.teamsRepo.find({ relations: ['captain'] });
  }

  async findOne(id: number): Promise<Team> {
    const team = await this.teamsRepo.findOne({
      where: { id },
      relations: ['captain'],
    });
    if (!team) {
      throw new Error('Equipo no encontrado');
    }
    return team;
  }
}
