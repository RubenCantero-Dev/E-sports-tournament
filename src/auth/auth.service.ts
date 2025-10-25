import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(userData: {
    email: string;
    username: string;
    password: string;
  }): Promise<{ token: string; user: Omit<User, 'password'> }> {
    const user = await this.usersService.create(userData);
    const { password, ...userWithoutPassword } = user;

    const token = this.jwtService.sign({
      userId: user.id,
      email: user.email,
    });

    return { token, user: userWithoutPassword };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; user: Omit<User, 'password'> }> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = this.jwtService.sign({
      userId: user.id,
      email: user.email,
    });

    const { password: _, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }
}
