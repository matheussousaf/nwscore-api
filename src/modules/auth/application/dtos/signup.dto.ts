import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SignUpDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  username: string;

  @IsString()
  password: string;
}
