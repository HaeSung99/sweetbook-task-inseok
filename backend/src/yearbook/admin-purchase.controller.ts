import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminCancelOrderDto } from './dto/admin-cancel-order.dto';
import { CreateLayoutTemplateDto } from './dto/create-layout-template.dto';
import { YearbookService } from './yearbook.service';

type AuthedRequest = Request & { user: { userId: string; email: string; role: string } };

@Controller('admin')
// 관리자 기능: 주문 승인/취소 관리
export class AdminPurchaseController {
  constructor(private readonly yearbook: YearbookService) {}

  // 관리자 기능: SweetBook 회사 잔액 (GET /v1/credits)
  @Get('company-credits')
  @UseGuards(JwtAuthGuard)
  companyCredits(@Req() req: AuthedRequest) {
    return this.yearbook.getCompanyCredits(req.user.userId, req.user.role);
  }

  // 관리자 기능: SweetBook 주문 상세 (GET /v1/orders/{orderUid})
  @Get('sweetbook-orders/:orderUid')
  @UseGuards(JwtAuthGuard)
  sweetbookOrderDetail(@Req() req: AuthedRequest, @Param('orderUid') orderUid: string) {
    return this.yearbook.getSweetbookOrderDetailForAdmin(req.user.userId, req.user.role, orderUid);
  }

  // 관리자 기능: 구매 요청 목록 조회
  @Get('purchase-requests')
  @UseGuards(JwtAuthGuard)
  list(@Req() req: AuthedRequest) {
    return this.yearbook.listPurchaseRequestsForAdmin(req.user.userId, req.user.role);
  }

  // 관리자 기능: 구매 요청 승인(주문 생성)
  @Post('purchase-requests/:id/approve')
  @UseGuards(JwtAuthGuard)
  approve(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.yearbook.approvePurchaseRequest(req.user.userId, req.user.role, id);
  }

  // 관리자 기능: 주문 취소
  @Post('purchase-requests/:id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: AdminCancelOrderDto) {
    return this.yearbook.cancelPurchaseOrder(req.user.userId, req.user.role, id, dto);
  }

  // 관리자 기능: 레이아웃 템플릿 UID 목록
  @Get('layout-templates')
  @UseGuards(JwtAuthGuard)
  listLayoutTemplates(@Req() req: AuthedRequest) {
    return this.yearbook.listLayoutTemplatesForAdmin(req.user.userId, req.user.role);
  }

  // 관리자 기능: 레이아웃 템플릿 등록
  @Post('layout-templates')
  @UseGuards(JwtAuthGuard)
  createLayoutTemplate(@Req() req: AuthedRequest, @Body() dto: CreateLayoutTemplateDto) {
    return this.yearbook.createLayoutTemplate(req.user.userId, req.user.role, dto);
  }

  // 관리자 기능: 레이아웃 템플릿 삭제
  @Delete('layout-templates/:id')
  @UseGuards(JwtAuthGuard)
  deleteLayoutTemplate(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.yearbook.deleteLayoutTemplate(req.user.userId, req.user.role, id);
  }
}
