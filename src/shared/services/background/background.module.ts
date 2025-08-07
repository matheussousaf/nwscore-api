import { Module } from '@nestjs/common';
import { BackgroundService } from './background.service';

@Module({
  providers: [BackgroundService],
  exports: [BackgroundService],
})
export class BackgroundModule {}
