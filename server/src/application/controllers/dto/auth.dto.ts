import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
   @IsEmail()
   email!: string;

   @IsString()
   @MinLength(6)
   password!: string;
}

export class RegisterDto {
   @IsString()
   @IsNotEmpty()
   username!: string;

   @IsEmail()
   email!: string;

   @IsString()
   @MinLength(6)
   password!: string;

   @IsOptional()
   @IsString()
   avatarUrl?: string | null;

   @IsOptional()
   @IsString()
   bio?: string | null;
}
