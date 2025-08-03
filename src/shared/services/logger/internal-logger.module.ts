import { Module, Global } from '@nestjs/common';
import { InternalLoggerService } from '@shared/services/logger/internal-logger.service';

@Global()
@Module({
  providers: [InternalLoggerService],
  exports: [InternalLoggerService],
})
export class InternalLoggerModule {}
