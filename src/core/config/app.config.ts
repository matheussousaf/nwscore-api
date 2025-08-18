import { registerAs } from '@nestjs/config';
import { IsNumber, IsString, Min } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';

export class AppConfig {
  @IsNumber()
  @Min(1)
  port = 3000;

  @IsString()
  clientUrl: string;

  @IsString()
  resetPasswordUrl: string;
}

export const appConfig = registerAs<AppConfig>('app', () => {
  const config = {
    port: Number(process.env.PORT),
    clientUrl: String(process.env.CLIENT_URL),
    resetPasswordUrl: String(process.env.RESET_PASSWORD_URL),
  };

  const validatedConfig = plainToClass(AppConfig, config);
  const errors = validateSync(validatedConfig);

  if (errors.length > 0) {
    throw new Error(
      `Error while trying to set up the app config: ${JSON.stringify(errors)}`,
    );
  }

  return validatedConfig;
});
