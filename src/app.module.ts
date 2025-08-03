import { MiddlewareConsumer, Module } from '@nestjs/common';
import { InternalLoggerModule } from '@shared/services/logger/internal-logger.module';
import { AppConfigModule } from '@core/config/config.module';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { HttpExceptionFilter } from '@core/filters/http-exception.filter';
import { HealthModule } from '@shared/services/health/health.module';
import { AuthModule } from '@modules/auth/auth.module';
import { HttpLoggingMiddleware } from '@core/middlewares/http-logging.middleware';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    AuthModule,
    InternalLoggerModule,
    AppConfigModule,
    HealthModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 15,
        },
      ],
    }),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggingMiddleware).forRoutes('*');
  }
}
