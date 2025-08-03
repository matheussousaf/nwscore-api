import { IsString } from 'class-validator';

export class NewPasswordDto {
  @IsString()
  token: string;

  @IsString()
  password: string;
}
