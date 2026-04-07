import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { BlankPageImageOptionsDto } from './dto/blank-page-image-options.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateSweetbookBookDto } from './dto/create-sweetbook-book.dto';
import { SweetbookCoverFieldsDto } from './dto/cover-fields.dto';
import type { SweetbookOrderBodyDto } from './dto/order-body.dto';
import { TestService } from './test.service';

const MULTIPART_LIMIT = 52 * 1024 * 1024;

@Controller('test')
// 공통 기능: 개발/연동 테스트용 API
export class TestController {
  constructor(private readonly testService: TestService) {}

  // 개발 기능: 서버 상태 확인
  @Get('ping')
  ping() {
    return this.testService.ping();
  }

  // 공통 기능: SweetBook 템플릿/스펙 조회 테스트
  @Get('sweetbook/template-categories')
  templateCategories() {
    return this.testService.templateCategories();
  }

  @Get('sweetbook/templates')
  templatesList(@Query() query: Record<string, string | undefined>) {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') cleaned[k] = v;
    }
    return this.testService.templatesList(cleaned);
  }

  @Get('sweetbook/templates/:templateUid')
  templateDetail(@Param('templateUid') templateUid: string) {
    return this.testService.templateDetail(templateUid);
  }

  @Get('sweetbook/book-specs')
  bookSpecsList(@Query() query: Record<string, string | undefined>) {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') cleaned[k] = v;
    }
    return this.testService.bookSpecsList(cleaned);
  }

  @Get('sweetbook/book-specs/:specUid')
  bookSpecDetail(@Param('specUid') specUid: string) {
    return this.testService.bookSpecDetail(specUid);
  }

  @Get('sweetbook/books')
  booksList(@Query() query: Record<string, string | undefined>) {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') cleaned[k] = v;
    }
    return this.testService.booksList(cleaned);
  }

  // 개발 기능: SweetBook 책 생성/표지/내지 테스트
  @Post('sweetbook/books')
  createBook(@Body() body: CreateSweetbookBookDto) {
    return this.testService.createBook(body);
  }

  // 개발 기능: SweetBook 책 표지 테스트
  @Post('sweetbook/books/:bookUid/cover')
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MULTIPART_LIMIT } }))
  addCover(
    @Param('bookUid') bookUid: string,
    @Body() body: SweetbookCoverFieldsDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.testService.addCover(bookUid, body, files ?? []);
  }

  @Post('sweetbook/books/:bookUid/contents/blank-page-image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MULTIPART_LIMIT } }))
  addBlankPageContentImage(
    @Param('bookUid') bookUid: string,
    @Query('breakBefore') breakBefore: string | undefined,
    @Query('templateUid') templateUid: string | undefined,
    @Query('parameters') parametersJson: string | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      return { success: false, message: 'multipart 필드 file에 이미지를 첨부하세요.' };
    }
    const opts: BlankPageImageOptionsDto = {
      breakBefore,
      templateUid: (templateUid?.trim() || '3x6m83dbZ2CJ').trim(),
      parametersExtra: parametersJson,
    };
    return this.testService.addBlankPageContentImage(bookUid, opts, file);
  }

  @Post('sweetbook/books/:bookUid/contents')
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: MULTIPART_LIMIT } }))
  addContents(
    @Param('bookUid') bookUid: string,
    @Query('breakBefore') breakBefore: string | undefined,
    @Body() body: SweetbookCoverFieldsDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.testService.addContents(bookUid, { breakBefore }, body, files ?? []);
  }

  // 개발 기능: SweetBook 주문/취소 테스트
  @Post('sweetbook/books/:bookUid/finalization')
  finalizeBook(@Param('bookUid') bookUid: string) {
    return this.testService.finalizeBook(bookUid);
  }

  @Post('sweetbook/orders/estimate')
  orderEstimate(@Body() body: unknown) {
    return this.testService.orderEstimate(body as SweetbookOrderBodyDto);
  }

  @Post('sweetbook/orders')
  createOrder(@Body() body: unknown) {
    return this.testService.createOrder(body as SweetbookOrderBodyDto);
  }

  @Get('sweetbook/orders')
  ordersList() {
    return this.testService.ordersList();
  }

  @Get('sweetbook/orders/:orderUid')
  orderDetail(@Param('orderUid') orderUid: string) {
    return this.testService.orderDetail(orderUid);
  }

  @Post('sweetbook/orders/:orderUid/cancel')
  cancelOrder(@Param('orderUid') orderUid: string, @Body() body: CancelOrderDto) {
    return this.testService.cancelOrder(orderUid, body ?? {});
  }
}
