import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from '../../application/services/auth.service';
import { LoginDto } from '../../application/dtos/login.dto';
import { SignUpDto } from '@modules/auth/application/dtos/signup.dto';
import { LoginDocs } from './__docs__/login.docs';
import { SignupDocs } from './__docs__/signup.docs';
import { NewPasswordDto } from '@modules/auth/application/dtos/new-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @LoginDocs()
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    return this.authService.login(user);
  }

  @Post('signup')
  @SignupDocs()
  async signup(@Body() signupDto: SignUpDto) {
    const user = await this.authService.signup(signupDto);

    return this.authService.login(user);
  }

  @Post('new-password')
  async newPassword(@Body() newPasswordDto: NewPasswordDto) {
    return this.authService.newPassword(newPasswordDto);
  }
}
