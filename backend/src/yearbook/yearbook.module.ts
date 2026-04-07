import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookPurchaseRequest } from '../entities/book-purchase-request.entity';
import { LayoutTemplate } from '../entities/layout-template.entity';
import { User } from '../entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { AdminPurchaseController } from './admin-purchase.controller';
import { YearbookController } from './yearbook.controller';
import { YearbookPartnerApiService } from './yearbook-partner-api.service';
import { YearbookService } from './yearbook.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, BookPurchaseRequest, LayoutTemplate]), AuthModule],
  controllers: [YearbookController, AdminPurchaseController],
  providers: [YearbookService, YearbookPartnerApiService],
})
export class YearbookModule {}
