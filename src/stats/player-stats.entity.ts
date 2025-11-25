import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class PlayerStats {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.stats)
  player: User;

  @Column()
  game: string;

  @Column({ default: 0 })
  totalMatches: number;

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0 })
  losses: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  winRate: number;

  @Column({ default: 1200 })
  eloRating: number;

  @Column({ default: 0 })
  kills: number;

  @Column({ default: 0 })
  deaths: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  kdRatio: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
