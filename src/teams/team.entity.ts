import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { TournamentRegistration } from '../tournaments/entities/tournament-registration.entity';

@Entity()
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  tag: string;

  @Column()
  game: string;

  @ManyToOne(() => User)
  captain: User;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => TournamentRegistration, (registration) => registration.team)
  tournamentRegistrations: TournamentRegistration[];
}
