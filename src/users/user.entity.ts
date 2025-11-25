import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Notification } from '../notifications/notification.entity';
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

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => PlayerStats, (stats) => stats.player)
  stats: PlayerStats[];
}
