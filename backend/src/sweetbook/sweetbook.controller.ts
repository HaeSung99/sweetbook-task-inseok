import { Controller, Get, Query } from '@nestjs/common';
import { SweetbookService } from './sweetbook.service';

@Controller('sweetbook')
// 공통 기능: SweetBook 조회 프록시 API
export class SweetbookController {
  constructor(private readonly sweetbook: SweetbookService) {}

  // 공통 기능: 템플릿 카테고리 조회
  @Get('template-categories')
  templateCategories() {
    return this.sweetbook.templateCategories();
  }

  // 공통 기능: 템플릿 목록 조회
  @Get('templates')
  templatesList(@Query() query: Record<string, string | undefined>) {
    const q: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) {
      if (v) q[k] = v;
    }
    return this.sweetbook.templatesList(q);
  }

  // 공통 기능: 책 규격 목록 조회
  @Get('book-specs')
  bookSpecsList(@Query() query: Record<string, string | undefined>) {
    const q: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) {
      if (v) q[k] = v;
    }
    return this.sweetbook.bookSpecsList(q);
  }

  // 공통 기능: 책 목록 조회
  @Get('books')
  booksList(@Query() query: Record<string, string | undefined>) {
    const q: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) {
      if (v) q[k] = v;
    }
    return this.sweetbook.booksList(Object.keys(q).length ? q : undefined);
  }

  // 공통 기능: 주문 목록 조회
  @Get('orders')
  ordersList() {
    return this.sweetbook.ordersList();
  }
}
