import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { TestService } from './test.service';
import { TestSweetbookService } from './test-sweetbook.service';

@Module({
  controllers: [TestController],
  providers: [TestService, TestSweetbookService],
})
export class TestModule {}
