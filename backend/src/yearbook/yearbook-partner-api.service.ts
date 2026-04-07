import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import { SweetbookProxyDto } from '../sweetbook/dto/sweetbook-proxy.dto';
import { findBookByUidViaBooksList } from '../sweetbook/sweetbook-book-lookup';
import type { SweetbookRawResult } from '../sweetbook/sweetbook.types';
import { YearbookCoverFieldsDto } from './dto/cover-fields.dto';

@Injectable()
// 공통 기능: SweetBook 파트너 API 연동
export class YearbookPartnerApiService {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    return (
      this.config.get<string>('SWEETBOOK_API_BASE_URL')?.replace(/\/$/, '') ??
      'https://api-sandbox.sweetbook.com/v1'
    );
  }

  private apiKey(): string | undefined {
    return this.config.get<string>('SWEETBOOK_API_KEY');
  }

  private noKey(): SweetbookRawResult {
    return { ok: false, message: 'SWEETBOOK_API_KEY 없음' };
  }

  private async get(path: string): Promise<SweetbookRawResult> {
    const key = this.apiKey();
    if (!key) return this.noKey();
    const url = `${this.baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${key}` } });
      return { ok: true, status: res.status, data: res.data };
    } catch (e) {
      return this.mapAxiosError(e);
    }
  }

  private async postJson(path: string, body: unknown, extraHeaders?: Record<string, string>): Promise<SweetbookRawResult> {
    const key = this.apiKey();
    if (!key) return this.noKey();
    const url = `${this.baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      };
      const res = await axios.post(url, body, { headers });
      return { ok: true, status: res.status, data: res.data };
    } catch (e) {
      return this.mapAxiosError(e);
    }
  }

  private async postMultipart(
    path: string,
    fields: Record<string, string | undefined>,
    files: Express.Multer.File[],
  ): Promise<SweetbookRawResult> {
    const key = this.apiKey();
    if (!key) return this.noKey();
    const url = `${this.baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined && v !== '') form.append(k, v);
    }
    for (const f of files) {
      form.append(f.fieldname, f.buffer, { filename: f.originalname, contentType: f.mimetype });
    }
    try {
      const res = await axios.post(url, form, {
        headers: { ...form.getHeaders(), Authorization: `Bearer ${key}` },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      return { ok: true, status: res.status, data: res.data };
    } catch (e) {
      return this.mapAxiosError(e);
    }
  }

  private mapAxiosError(e: unknown): SweetbookRawResult {
    if (axios.isAxiosError(e)) {
      const err = e as AxiosError<{ message?: string }>;
      return {
        ok: false,
        message: err.response?.data?.message ?? err.message ?? 'API 실패',
        status: err.response?.status,
        data: err.response?.data,
      };
    }
    return { ok: false, message: e instanceof Error ? e.message : 'API 실패' };
  }

  /**
   * SweetBook은 HTTP 200이어도 본문에 `{ success: false, message }`를 줄 수 있음.
   * 이때 프록시의 success도 false로 맞춘다.
   */
  private out(r: SweetbookRawResult): SweetbookProxyDto {
    if (!r.ok) {
      return { success: false, message: r.message, sweetbookStatus: r.status, response: r.data };
    }
    const payload = r.data;
    if (payload && typeof payload === 'object' && 'success' in payload) {
      const bodyOk = (payload as Record<string, unknown>).success;
      if (bodyOk === false) {
        const msg = (payload as Record<string, unknown>).message;
        return {
          success: false,
          message: typeof msg === 'string' && msg.trim() ? msg : 'SweetBook 응답 success: false',
          sweetbookStatus: r.status,
          response: r.data,
        };
      }
    }
    return { success: true, sweetbookStatus: r.status, response: r.data };
  }

  /** 공통 기능: SweetBook 책 생성 */
  async createBook(title: string, bookSpecUid: string) {
    return this.out(await this.postJson('/books', { title, bookSpecUid }));
  }

  /** 공통 기능: SweetBook 책 상세 조회 */
  async bookDetail(bookUid: string) {
    return this.out(
      await findBookByUidViaBooksList(
        (limit, offset) => this.get(`/books?limit=${limit}&offset=${offset}`),
        bookUid,
      ),
    );
  }

  /** 공통 기능: SweetBook 템플릿 상세 조회 */
  async templateDetail(templateUid: string) {
    return this.out(await this.get(`/templates/${encodeURIComponent(templateUid.trim())}`));
  }

  /** 공통 기능: SweetBook 표지 업로드 */
  async addCover(bookUid: string, fields: YearbookCoverFieldsDto, files: Express.Multer.File[]) {
    return this.out(
      await this.postMultipart(
        `/books/${bookUid}/cover`,
        { templateUid: fields.templateUid, parameters: fields.parameters },
        files,
      ),
    );
  }

  /** 공통 기능: SweetBook 내지 업로드 */
  async addContents(
    bookUid: string,
    query: { breakBefore?: string },
    fields: YearbookCoverFieldsDto,
    files: Express.Multer.File[],
  ) {
    let path = `/books/${bookUid}/contents`;
    if (query.breakBefore) {
      path += `?breakBefore=${encodeURIComponent(query.breakBefore)}`;
    }
    return this.out(
      await this.postMultipart(path, { templateUid: fields.templateUid, parameters: fields.parameters }, files),
    );
  }

  /** 공통 기능: SweetBook 책 최종화 */
  async finalizeBook(bookUid: string) {
    return this.out(await this.postJson(`/books/${bookUid}/finalization`, {}));
  }

  /** 공통 기능: SweetBook 주문 견적 */
  async orderEstimate(body: { items: { bookUid: string; quantity: number }[] }) {
    return this.out(await this.postJson('/orders/estimate', body));
  }

  /** GET /orders/{orderUid} — 주문 상세(응답 data.items[].bookTitle 등) */
  async orderDetail(orderUid: string) {
    return this.out(await this.get(`/orders/${encodeURIComponent(orderUid)}`));
  }

  /** POST /orders — Idempotency-Key 필수 ([주문 가이드](https://api.sweetbook.com/docs/guides/orders/)) */
  /** 관리자 기능: SweetBook 주문 생성 */
  async createOrder(body: unknown, idempotencyKey: string) {
    return this.out(
      await this.postJson('/orders', body, { 'Idempotency-Key': idempotencyKey }),
    );
  }

  /** POST /orders/{orderUid}/cancel — PAID·PDF_READY 등 취소 가능 상태만 */
  /** 관리자/일반유저 기능: SweetBook 주문 취소 */
  async cancelOrder(orderUid: string, body: { cancelReason: string }) {
    return this.out(await this.postJson(`/orders/${encodeURIComponent(orderUid)}/cancel`, body));
  }

  /** GET /credits — 파트너(회사) 충전 잔액 */
  async getCredits() {
    return this.out(await this.get('/credits'));
  }
}
