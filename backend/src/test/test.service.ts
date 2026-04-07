import { Injectable } from '@nestjs/common';
import { BlankPageImageOptionsDto } from './dto/blank-page-image-options.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateSweetbookBookDto } from './dto/create-sweetbook-book.dto';
import { SweetbookContentsQueryDto } from './dto/contents-query.dto';
import { SweetbookCoverFieldsDto } from './dto/cover-fields.dto';
import type { SweetbookOrderBodyDto } from './dto/order-body.dto';
import { TestSweetbookService } from './test-sweetbook.service';

@Injectable()
// 공통 기능: 테스트 컨트롤러용 SweetBook 호출 위임
export class TestService {
  constructor(private readonly sb: TestSweetbookService) {}

  /** 공통 기능: 테스트 ping */
  ping() {
    return { success: true, message: 'Backend test API is running' };
  }

  /** 공통 기능: 책 스펙 목록 조회 */
  bookSpecsList(query: Record<string, string>) {
    return this.sb.bookSpecsList(query);
  }

  /** 공통 기능: 책 스펙 상세 조회 */
  bookSpecDetail(specUid: string) {
    return this.sb.bookSpecDetail(specUid);
  }

  /** 공통 기능: 템플릿 카테고리 조회 */
  templateCategories() {
    return this.sb.templateCategories();
  }

  /** 공통 기능: 템플릿 목록 조회 */
  templatesList(query: Record<string, string>) {
    return this.sb.templatesList(query);
  }

  /** 공통 기능: 템플릿 상세 조회 */
  templateDetail(templateUid: string) {
    return this.sb.templateDetail(templateUid);
  }

  /** 공통 기능: 책 목록 조회 */
  booksList(query: Record<string, string>) {
    return this.sb.booksList(query);
  }

  /** 공통 기능: 책 생성 */
  createBook(dto: CreateSweetbookBookDto) {
    return this.sb.createBook(dto);
  }

  /** 공통 기능: 표지 업로드 */
  addCover(bookUid: string, fields: SweetbookCoverFieldsDto, files: Express.Multer.File[]) {
    return this.sb.addCover(bookUid, fields, files);
  }

  /** 공통 기능: 내지 업로드 */
  addContents(
    bookUid: string,
    query: SweetbookContentsQueryDto,
    fields: SweetbookCoverFieldsDto,
    files: Express.Multer.File[],
  ) {
    return this.sb.addContents(bookUid, query, fields, files);
  }

  /** 공통 기능: 빈 페이지 이미지 업로드 */
  addBlankPageContentImage(bookUid: string, options: BlankPageImageOptionsDto, file: Express.Multer.File) {
    return this.sb.addContentsBlankPageImage(bookUid, options, file);
  }

  /** 공통 기능: 책 최종화 */
  finalizeBook(bookUid: string) {
    return this.sb.finalizeBook(bookUid);
  }

  /** 공통 기능: 주문 목록 조회 */
  ordersList() {
    return this.sb.ordersList();
  }

  /** 공통 기능: 주문 상세 조회 */
  orderDetail(orderUid: string) {
    return this.sb.orderDetail(orderUid);
  }

  /** 공통 기능: 주문 견적 조회 */
  orderEstimate(body: SweetbookOrderBodyDto) {
    return this.sb.orderEstimate(body);
  }

  /** 공통 기능: 주문 생성 */
  createOrder(body: SweetbookOrderBodyDto) {
    return this.sb.createOrder(body);
  }

  /** 공통 기능: 주문 취소 */
  cancelOrder(orderUid: string, body: CancelOrderDto) {
    return this.sb.cancelOrder(orderUid, body);
  }
}
