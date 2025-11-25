import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Bracket } from './bracket.entity';
import { Team } from '../../teams/team.entity';

export enum MatchStatus {
  SCHEDULED = 'scheduled',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity()
export class Match {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Bracket, (bracket) => bracket.matches)
  bracket: Bracket;

  @Column()
  matchNumber: number;

  @ManyToOne(() => Team, { nullable: true })
  team1: Team;

  @ManyToOne(() => Team, { nullable: true })
  team2: Team;

  @Column({ type: 'int', nullable: true })
  team1Score: number;

  @Column({ type: 'int', nullable: true })
  team2Score: number;

  @ManyToOne(() => Team, { nullable: true })
  winner: Team;

  @Column({
    type: 'varchar',
    default: MatchStatus.SCHEDULED,
  })
  status: string;

  @Column({ type: 'datetime', nullable: true })
  scheduledTime: Date;

  @CreateDateColumn()
  createdAt: Date;
}
