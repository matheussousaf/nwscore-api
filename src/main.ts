import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@core/filters/http-exception.filter';
import { InternalLoggerService } from '@shared/services/logger/internal-logger.service';
import { setupSwagger } from '@core/config/swagger.config';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@core/config/app.config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(InternalLoggerService);
  const configService = app.get(ConfigService);
  const appConfig = configService.get('app') as AppConfig;

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  setupSwagger(app);

  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.enableCors();

  await app.listen(appConfig.port);
  logger.log(`Server started on port ${appConfig.port}`);
}
bootstrap();
