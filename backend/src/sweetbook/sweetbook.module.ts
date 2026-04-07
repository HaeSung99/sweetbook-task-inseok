import { Module } from '@nestjs/common';
import { SweetbookController } from './sweetbook.controller';
import { SweetbookService } from './sweetbook.service';

@Module({
  controllers: [SweetbookController],
  providers: [SweetbookService],
  exports: [SweetbookService],
})
export class SweetbookModule {}
