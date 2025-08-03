import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './application/services/auth.service';
import { AuthController } from './presentation/controllers/auth.controller';
import { JwtStrategy } from './presentation/strategies/jwt.strategy';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '@modules/user/user.module';
import { createJwtModuleOptions } from '@shared/factories/create-jwt-module-options.factory';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    UserModule,
    JwtModule.registerAsync(createJwtModuleOptions()),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
