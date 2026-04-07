import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateYearbookBookDto } from './dto/create-book.dto';
import { YearbookCoverFieldsDto } from './dto/cover-fields.dto';
import { AdminCancelOrderDto } from './dto/admin-cancel-order.dto';
import { PurchaseEstimateDto } from './dto/purchase-estimate.dto';
import { PurchaseShippingDto } from './dto/purchase-shipping.dto';
import { YearbookService } from './yearbook.service';

const MULTIPART_LIMIT = 52 * 1024 * 1024;

type AuthedRequest = Request & { user: { userId: string; email: string; role: string } };

@Controller('yearbook')
// 일반유저 기능: 학년책 생성/편집/주문
export class YearbookController {
  constructor(private readonly yearbook: YearbookService) {}

  // 일반유저 기능: 내 주문 조회
  @Get('orders')
  @UseGuards(JwtAuthGuard)
  listMyOrders(@Req() req: AuthedRequest) {
    return this.yearbook.listMyOrders(req.user.userId);
  }

  // 일반유저 기능: 내 주문 취소
  @Post('orders/:requestId/cancel')
  @UseGuards(JwtAuthGuard)
  cancelMyOrder(
    @Req() req: AuthedRequest,
    @Param('requestId') requestId: string,
    @Body() dto: AdminCancelOrderDto,
  ) {
    return this.yearbook.cancelMyOrder(req.user.userId, requestId, dto);
  }

  // 일반유저 기능: 내 학년책 목록/상세/생성/편집
  @Get('books')
  @UseGuards(JwtAuthGuard)
  listBooks(@Req() req: AuthedRequest) {
    return this.yearbook.listBooksWithDetails(req.user.userId);
  }

  // 일반유저 기능: 내 학년책 상세 조회
  @Get('books/:bookUid')
  @UseGuards(JwtAuthGuard)
  getBook(@Req() req: AuthedRequest, @Param('bookUid') bookUid: string) {
    return this.yearbook.getBookForUser(req.user.userId, bookUid);
  }

  // 일반유저 기능: 포토북 UID 목록 조회
  @Get('photobooks')
  @UseGuards(JwtAuthGuard)
  listPhotobooks(@Req() req: AuthedRequest) {
    return this.yearbook.listPhotobooks(req.user.userId);
  }

  // 일반유저 기능: 책 생성
  @Post('books')
  @UseGuards(JwtAuthGuard)
  createBook(@Req() req: AuthedRequest, @Body() dto: CreateYearbookBookDto) {
    return this.yearbook.createBook(req.user.userId, dto);
  }

  // 일반유저 기능: 표지 업로드
  @Post('books/:bookUid/cover')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MULTIPART_LIMIT } }))
  addCover(
    @Req() req: AuthedRequest,
    @Param('bookUid') bookUid: string,
    @Body() body: YearbookCoverFieldsDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.yearbook.addCover(req.user.userId, bookUid, body, files ?? []);
  }

  // 일반유저 기능: 내지 업로드
  @Post('books/:bookUid/contents')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MULTIPART_LIMIT } }))
  addContents(
    @Req() req: AuthedRequest,
    @Param('bookUid') bookUid: string,
    @Query('breakBefore') breakBefore: string | undefined,
    @Body() body: YearbookCoverFieldsDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.yearbook.addContents(req.user.userId, bookUid, { breakBefore }, body, files ?? []);
  }

  // 일반유저 기능: 포토북 최종화
  @Post('books/:bookUid/finalize')
  @UseGuards(JwtAuthGuard)
  finalizeBook(@Req() req: AuthedRequest, @Param('bookUid') bookUid: string) {
    return this.yearbook.finalizeBookForUser(req.user.userId, bookUid);
  }

  // 일반유저 기능: 주문 견적 조회
  @Post('books/:bookUid/purchase/estimate')
  @UseGuards(JwtAuthGuard)
  purchaseEstimate(
    @Req() req: AuthedRequest,
    @Param('bookUid') bookUid: string,
    @Body() body: PurchaseEstimateDto,
  ) {
    return this.yearbook.purchaseEstimate(req.user.userId, bookUid, body);
  }

  // 일반유저 기능: 주문 요청 제출
  @Post('books/:bookUid/purchase/submit')
  @UseGuards(JwtAuthGuard)
  submitPurchase(@Req() req: AuthedRequest, @Param('bookUid') bookUid: string, @Body() dto: PurchaseShippingDto) {
    return this.yearbook.submitPurchaseRequest(req.user.userId, bookUid, dto);
  }

  // 일반유저 기능: DB 등록 레이아웃 템플릿 목록(SweetBook 상세 병합)
  @Get('layout-templates')
  @UseGuards(JwtAuthGuard)
  listLayoutTemplates(@Req() req: AuthedRequest, @Query('kind') kind: string | undefined) {
    const k = kind === 'content' ? 'content' : 'cover';
    return this.yearbook.listLayoutTemplatesForUser(req.user.userId, k);
  }

  // 일반유저 기능: 등록된 템플릿 UID만 SweetBook 상세
  @Get('layout-templates/:templateUid/detail')
  @UseGuards(JwtAuthGuard)
  layoutTemplateDetail(@Req() req: AuthedRequest, @Param('templateUid') templateUid: string) {
    return this.yearbook.getLayoutTemplateSweetbookDetail(req.user.userId, templateUid);
  }
}
