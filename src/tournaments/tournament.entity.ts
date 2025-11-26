import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { TournamentRegistration } from './entities/tournament-registration.entity';
import { Bracket } from './entities/bracket.entity';

export enum TournamentFormat {
  SINGLE_ELIMINATION = 'single_elimination',
  DOUBLE_ELIMINATION = 'double_elimination',
  ROUND_ROBIN = 'round_robin',
}

@Entity()
export class Tournament {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  game: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ default: 16 })
  maxTeams: number;

  @Column({
    type: 'varchar',
    default: TournamentFormat.SINGLE_ELIMINATION,
  })
  format: string;

  @Column({ default: 'upcoming' })
  status: string;

  @Column({ type: 'datetime', nullable: true })
  startDate: Date;

  @ManyToOne(() => User)
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(
    () => TournamentRegistration,
    (registration) => registration.tournament,
  )
  registrations: TournamentRegistration[];

  @OneToMany(() => Bracket, (bracket) => bracket.tournament)
  brackets: Bracket[];
}
