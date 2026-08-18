import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from '../controllers/dto/auth.dto';

@Controller('auth')
export class AuthController {
   constructor(private readonly authService: AuthService) {}

   @Post('register')
   @HttpCode(HttpStatus.CREATED)
   async register(@Body() body: RegisterDto) {
      return this.authService.register({
         username: body.username,
         email: body.email,
         password: body.password,
         avatarUrl: body.avatarUrl,
         bio: body.bio,
      });
   }

   @Post('login')
   @HttpCode(HttpStatus.OK)
   async login(@Body() body: LoginDto) {
      return this.authService.login(body.email, body.password);
   }
}
