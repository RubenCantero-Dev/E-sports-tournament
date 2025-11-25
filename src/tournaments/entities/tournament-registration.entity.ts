import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Tournament } from '../tournament.entity';
import { Team } from '../../teams/team.entity';

export enum RegistrationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity()
export class TournamentRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tournament, (tournament) => tournament.registrations)
  tournament: Tournament;

  @ManyToOne(() => Team, (team) => team.tournamentRegistrations)
  team: Team;

  @Column({
    type: 'varchar',
    default: RegistrationStatus.PENDING,
  })
  status: string;

  @CreateDateColumn()
  registeredAt: Date;

  @Column({ type: 'datetime', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;
}
