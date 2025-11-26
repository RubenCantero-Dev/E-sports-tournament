import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TournamentRegistration,
  RegistrationStatus,
} from './entities/tournament-registration.entity';
import { Tournament } from './tournament.entity';
import { Team } from '../teams/team.entity';

@Injectable()
export class TournamentRegistrationService {
  constructor(
    @InjectRepository(TournamentRegistration)
    private registrationRepo: Repository<TournamentRegistration>,
    @InjectRepository(Tournament)
    private tournamentRepo: Repository<Tournament>,
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,
  ) {}

  async registerTeam(
    tournamentId: number,
    teamId: number,
  ): Promise<TournamentRegistration> {
    const tournament = await this.tournamentRepo.findOne({
      where: { id: tournamentId },
      relations: ['registrations'],
    });

    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado');
    }

    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('Equipo no encontrado');
    }

    const existingRegistration = await this.registrationRepo.findOne({
      where: {
        tournament: { id: tournamentId },
        team: { id: teamId },
      },
    });

    if (existingRegistration) {
      throw new ConflictException(
        'El equipo ya está registrado en este torneo',
      );
    }

    const approvedRegistrations =
      tournament.registrations?.filter(
        (reg) => reg.status === RegistrationStatus.APPROVED,
      ).length || 0;

    if (approvedRegistrations >= tournament.maxTeams) {
      throw new BadRequestException('El torneo está lleno');
    }

    const registration = this.registrationRepo.create({
      tournament: { id: tournamentId },
      team: { id: teamId },
      status: RegistrationStatus.PENDING,
    });

    return await this.registrationRepo.save(registration);
  }

  async getTournamentRegistrations(
    tournamentId: number,
  ): Promise<TournamentRegistration[]> {
    return await this.registrationRepo.find({
      where: { tournament: { id: tournamentId } },
      relations: ['team', 'team.captain'],
    });
  }

  async updateRegistrationStatus(
    registrationId: number,
    status: string,
    rejectionReason?: string,
  ): Promise<TournamentRegistration> {
    const registration = await this.registrationRepo.findOne({
      where: { id: registrationId },
      relations: ['tournament', 'team', 'team.captain'],
    });

    if (!registration) {
      throw new NotFoundException('Inscripción no encontrada');
    }

    const validStatuses = [
      RegistrationStatus.PENDING,
      RegistrationStatus.APPROVED,
      RegistrationStatus.REJECTED,
    ];

    if (!validStatuses.includes(status as RegistrationStatus)) {
      throw new BadRequestException('Estado de inscripción no válido');
    }

    registration.status = status;

    if (status === RegistrationStatus.APPROVED) {
      registration.approvedAt = new Date();
      registration.rejectionReason = null;
    } else if (status === RegistrationStatus.REJECTED) {
      registration.approvedAt = null;
      registration.rejectionReason = rejectionReason || 'Razón no especificada';
    } else {
      registration.approvedAt = null;
      registration.rejectionReason = null;
    }

    return await this.registrationRepo.save(registration);
  }

  async getTeamRegistrations(
    teamId: number,
  ): Promise<TournamentRegistration[]> {
    return await this.registrationRepo.find({
      where: { team: { id: teamId } },
      relations: ['tournament'],
    });
  }
}
