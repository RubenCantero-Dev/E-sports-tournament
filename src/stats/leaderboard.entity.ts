import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { LeaderboardEntry } from './leaderboard-entry.entity';

export enum LeaderboardType {
  GLOBAL = 'global',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
}

@Entity()
export class Leaderboard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  game: string;

  @Column({
    type: 'varchar',
    default: LeaderboardType.GLOBAL,
  })
  type: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => LeaderboardEntry, (entry) => entry.leaderboard)
  entries: LeaderboardEntry[];
}
