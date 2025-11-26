import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './team.entity';
import { User } from '../users/user.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamsRepo: Repository<Team>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async create(teamData: Partial<Team> & { captainId: number }): Promise<Team> {
    const captain = await this.usersRepo.findOne({
      where: { id: teamData.captainId },
    });

    if (!captain) {
      throw new NotFoundException('Capitán no encontrado');
    }

    const team = this.teamsRepo.create({
      ...teamData,
      captain: captain,
    });

    return await this.teamsRepo.save(team);
  }

  async findAll(): Promise<Team[]> {
    return await this.teamsRepo.find({
      relations: ['captain'],
    });
  }

  async findOne(id: number): Promise<Team> {
    const team = await this.teamsRepo.findOne({
      where: { id },
      relations: ['captain'],
    });
    if (!team) {
      throw new NotFoundException('Equipo no encontrado');
    }
    return team;
  }
}
