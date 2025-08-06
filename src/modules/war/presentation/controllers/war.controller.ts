import { UploadWarDto } from '@modules/war/application/dtos/upload-war.dto';
import { WarService } from '@modules/war/application/services/war.service';
import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { War } from '@prisma/client';

@Controller('war')
export class WarController {
  constructor(private readonly warService: WarService) {}

  @Post('upload')
  createWar(@Body() war: UploadWarDto): Promise<War> {
    return this.warService.uploadWar(war);
  }

  @Delete('rollback/:id')
  rollbackWar(@Param('id') id: string): Promise<void> {
    return this.warService.rollbackWar(id);
  }
}
