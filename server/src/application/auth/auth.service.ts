import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../../use-cases/user/user.service';

@Injectable()
export class AuthService {
   constructor(
      private readonly userService: UserService,
      private readonly jwtService: JwtService,
   ) {}

   async register(data: {
      username: string;
      email: string;
      password: string;
      avatarUrl?: string | null;
      bio?: string | null;
   }) {
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await this.userService.createUser({
         username: data.username,
         email: data.email,
         passwordHash: hashedPassword,
         avatarUrl: data.avatarUrl,
         bio: data.bio,
      });

      const token = this.generateToken(user.id, user.email);

      return {
         userId: user.id,
         username: user.username,
         email: user.email,
         access_token: token,
      };
   }

   async login(email: string, password: string) {
      const user = await this.userService.findByEmail(email);

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
         throw new UnauthorizedException('Invalid credentials.');
      }

      const token = this.generateToken(user.id, user.email);

      return {
         userId: user.id,
         username: user.username,
         email: user.email,
         access_token: token,
      };
   }

   private generateToken(userId: string, email: string): string {
      return this.jwtService.sign({
         sub: userId,
         email,
      });
   }
}
