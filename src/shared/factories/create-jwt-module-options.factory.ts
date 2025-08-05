import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModuleAsyncOptions } from '@nestjs/jwt';

export function createJwtModuleOptions(): JwtModuleAsyncOptions {
  return {
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      secret: config.get<string>('app.jwtSecret'),
      signOptions: { expiresIn: '1d' },
    }),
  };
}
