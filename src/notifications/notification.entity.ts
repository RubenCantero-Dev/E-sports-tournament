import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum NotificationType {
  TOURNAMENT_APPROVED = 'tournament_approved',
  TOURNAMENT_REJECTED = 'tournament_rejected',
  TEAM_INVITATION = 'team_invitation',
  MATCH_SCHEDULED = 'match_scheduled',
  SYSTEM = 'system',
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.notifications)
  user: User;

  @Column({
    type: 'varchar',
  })
  type: string;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({ type: 'text', nullable: true })
  relatedEntityId: string;

  @Column({ type: 'varchar', nullable: true })
  relatedEntityType: string;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
