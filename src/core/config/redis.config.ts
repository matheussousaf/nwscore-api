import { registerAs } from '@nestjs/config';
import { plainToClass } from 'class-transformer';
import { IsNumber, IsString, Min, validateSync } from 'class-validator';

export class RedisConfig {
  @IsString()
  host: string;

  @Min(1)
  @IsNumber()
  port: number;

  @IsString()
  password: string;
}

export const redisConfig = registerAs<RedisConfig>('redis', () => {
  const config = {
    host: String(process.env.REDIS_HOST),
    port: Number(process.env.REDIS_PORT),
    password: String(process.env.REDIS_PASSWORD),
  };

  const validatedConfig = plainToClass(RedisConfig, config);
  const errors = validateSync(validatedConfig);

  if (errors.length > 0) {
    throw new Error(
      `Error while trying to set up the Redis config: ${JSON.stringify(errors)}`,
    );
  }

  return validatedConfig;
});
