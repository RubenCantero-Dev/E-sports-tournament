import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Leaderboard } from './leaderboard.entity';
import { User } from '../users/user.entity';

@Entity()
export class LeaderboardEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Leaderboard, (leaderboard) => leaderboard.entries)
  leaderboard: Leaderboard;

  @ManyToOne(() => User)
  player: User;

  @Column({ type: 'int' })
  position: number;

  @Column('decimal', { precision: 10, scale: 2 })
  rating: number;

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0 })
  losses: number;

  @CreateDateColumn()
  createdAt: Date;
}
