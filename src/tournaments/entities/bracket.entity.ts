import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Tournament } from '../tournament.entity';
import { Match } from './match.entity';

@Entity()
export class Bracket {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tournament, (tournament) => tournament.brackets)
  tournament: Tournament;

  @Column()
  name: string;

  @Column()
  round: number;

  @Column({ default: 'upcoming' })
  status: string;

  @OneToMany(() => Match, (match) => match.bracket)
  matches: Match[];

  @CreateDateColumn()
  createdAt: Date;
}
