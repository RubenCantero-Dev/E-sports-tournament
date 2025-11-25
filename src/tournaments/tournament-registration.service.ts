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
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TournamentRegistrationService {
  constructor(
    @InjectRepository(TournamentRegistration)
    private registrationRepo: Repository<TournamentRegistration>,
    @InjectRepository(Tournament)
    private tournamentRepo: Repository<Tournament>,
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,
    private notificationsService: NotificationsService,
  ) {}

  async registerTeam(
    tournamentId: number,
    teamId: number,
  ): Promise<TournamentRegistration> {
    // Verificar que el torneo existe
    const tournament = await this.tournamentRepo.findOne({
      where: { id: tournamentId },
      relations: ['registrations'],
    });

    if (!tournament) {
      throw new NotFoundException('Torneo no encontrado');
    }

    // Verificar que el equipo existe
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('Equipo no encontrado');
    }

    // Verificar si el equipo ya está registrado
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

    // Verificar si el torneo está lleno
    const approvedRegistrations =
      tournament.registrations?.filter(
        (reg) => reg.status === RegistrationStatus.APPROVED,
      ).length || 0;

    if (approvedRegistrations >= tournament.maxTeams) {
      throw new BadRequestException('El torneo está lleno');
    }

    // Crear la inscripción
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

    // Validar que el status es válido
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

      // Notificar al capitán del equipo
      await this.notificationsService.notifyTournamentRegistrationApproved(
        registration.team.captain.id,
        registration.tournament.name,
        registration.tournament.id,
      );
    } else if (status === RegistrationStatus.REJECTED) {
      registration.approvedAt = null;
      registration.rejectionReason = rejectionReason || 'Razón no especificada';

      // Notificar al capitán del equipo
      await this.notificationsService.notifyTournamentRegistrationRejected(
        registration.team.captain.id,
        registration.tournament.name,
        registration.tournament.id,
        rejectionReason,
      );
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
