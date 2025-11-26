import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PlayerStats } from '../stats/player-stats.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ default: 'player' })
  role: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => PlayerStats, (stats) => stats.player)
  stats: PlayerStats[];
}
