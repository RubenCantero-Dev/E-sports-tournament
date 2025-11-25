import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { User } from '../users/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async createNotification(
    userId: number,
    type: string,
    title: string,
    message: string,
    relatedEntityId?: string,
    relatedEntityType?: string,
  ): Promise<Notification> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const notification = this.notificationRepo.create({
      user,
      type,
      title,
      message,
      relatedEntityId,
      relatedEntityType,
      read: false,
    });

    return await this.notificationRepo.save(notification);
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await this.notificationRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: number): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notificación no encontrada');
    }

    notification.read = true;
    return await this.notificationRepo.save(notification);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepo.update(
      { user: { id: userId }, read: false },
      { read: true },
    );
  }

  async getUnreadCount(userId: number): Promise<number> {
    return await this.notificationRepo.count({
      where: { user: { id: userId }, read: false },
    });
  }

  // Métodos específicos para tipos de notificación
  async notifyTournamentRegistrationApproved(
    userId: number,
    tournamentName: string,
    tournamentId: number,
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      NotificationType.TOURNAMENT_APPROVED,
      'Inscripción Aprobada',
      `Tu equipo ha sido aprobado para el torneo "${tournamentName}"`,
      tournamentId.toString(),
      'tournament',
    );
  }

  async notifyTournamentRegistrationRejected(
    userId: number,
    tournamentName: string,
    tournamentId: number,
    reason?: string,
  ): Promise<Notification> {
    const message = reason
      ? `Tu equipo ha sido rechazado para el torneo "${tournamentName}". Razón: ${reason}`
      : `Tu equipo ha sido rechazado para el torneo "${tournamentName}"`;

    return this.createNotification(
      userId,
      NotificationType.TOURNAMENT_REJECTED,
      'Inscripción Rechazada',
      message,
      tournamentId.toString(),
      'tournament',
    );
  }
}
