import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import { SweetbookProxyDto } from '../sweetbook/dto/sweetbook-proxy.dto';
import { findBookByUidViaBooksList } from '../sweetbook/sweetbook-book-lookup';
import type { SweetbookRawResult } from '../sweetbook/sweetbook.types';
import { BlankPageImageOptionsDto } from './dto/blank-page-image-options.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateSweetbookBookDto } from './dto/create-sweetbook-book.dto';
import { SweetbookContentsQueryDto } from './dto/contents-query.dto';
import { SweetbookCoverFieldsDto } from './dto/cover-fields.dto';
import type { SweetbookOrderBodyDto } from './dto/order-body.dto';

type TemplateParamDef = { binding?: string; required?: boolean };

function extractParameterDefinitions(sweetbookBody: unknown): Record<string, TemplateParamDef> | null {
  if (!sweetbookBody || typeof sweetbookBody !== 'object') return null;
  const root = sweetbookBody as Record<string, unknown>;
  const inner = root.data;
  if (!inner || typeof inner !== 'object') return null;
  const params = (inner as Record<string, unknown>).parameters;
  if (!params || typeof params !== 'object') return null;
  const definitions = (params as Record<string, unknown>).definitions;
  if (!definitions || typeof definitions !== 'object') return null;
  return definitions as Record<string, TemplateParamDef>;
}

function isFileBinding(def: TemplateParamDef): boolean {
  return (def.binding ?? '').toLowerCase() === 'file';
}

@Injectable()
// 공통 기능: 개발/검증용 SweetBook 상세 연동 서비스
export class TestSweetbookService {
  constructor(private readonly configService: ConfigService) {}

  private baseUrl(): string {
    return (
      this.configService.get<string>('SWEETBOOK_API_BASE_URL')?.replace(/\/$/, '') ??
      'https://api-sandbox.sweetbook.com/v1'
    );
  }

  private apiKey(): string | undefined {
    return this.configService.get<string>('SWEETBOOK_API_KEY');
  }

  private noKey(): SweetbookRawResult {
    return { ok: false, message: 'SWEETBOOK_API_KEY가 backend/.env에 없습니다.' };
  }

  private async get(path: string, params?: Record<string, string>): Promise<SweetbookRawResult> {
    const key = this.apiKey();
    if (!key) return this.noKey();
    const url = `${this.baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${key}` },
        params,
      });
      return { ok: true, status: response.status, data: response.data };
    } catch (e) {
      return this.mapAxiosError(e);
    }
  }

  private async postJson(path: string, body: unknown): Promise<SweetbookRawResult> {
    const key = this.apiKey();
    if (!key) return this.noKey();
    const url = `${this.baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    try {
      const response = await axios.post(url, body, {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      });
      return { ok: true, status: response.status, data: response.data };
    } catch (e) {
      return this.mapAxiosError(e);
    }
  }

  /** 공통 기능: multipart 업로드 호출 */
  async postMultipart(
    path: string,
    fields: Record<string, string | undefined>,
    files: Express.Multer.File[],
    query?: Record<string, string | undefined>,
  ): Promise<SweetbookRawResult> {
    const key = this.apiKey();
    if (!key) return this.noKey();
    let urlPath = `${this.baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    if (query) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== '') q.set(k, v);
      }
      const s = q.toString();
      if (s) urlPath += `?${s}`;
    }
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined && v !== '') form.append(k, v);
    }
    for (const f of files) {
      form.append(f.fieldname, f.buffer, { filename: f.originalname, contentType: f.mimetype });
    }
    try {
      const response = await axios.post(urlPath, form, {
        headers: { ...form.getHeaders(), Authorization: `Bearer ${key}` },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      return { ok: true, status: response.status, data: response.data };
    } catch (e) {
      return this.mapAxiosError(e);
    }
  }

  private mapAxiosError(e: unknown): SweetbookRawResult {
    if (axios.isAxiosError(e)) {
      const err = e as AxiosError<{ message?: string }>;
      return {
        ok: false,
        message: err.response?.data?.message ?? err.message ?? 'API 호출 실패',
        status: err.response?.status,
        data: err.response?.data,
      };
    }
    return { ok: false, message: e instanceof Error ? e.message : 'API 호출 실패' };
  }

  private out(r: SweetbookRawResult): SweetbookProxyDto {
    if (r.ok) return { success: true, sweetbookStatus: r.status, response: r.data };
    return { success: false, message: r.message, sweetbookStatus: r.status, response: r.data };
  }

  /** 공통 기능: 책 스펙 목록 조회 */
  async bookSpecsList(query: Record<string, string>) {
    return this.out(await this.get('/book-specs', Object.keys(query).length ? query : undefined));
  }

  /** 공통 기능: 책 스펙 상세 조회 */
  async bookSpecDetail(specUid: string) {
    return this.out(await this.get(`/book-specs/${specUid}`));
  }

  /** 공통 기능: 템플릿 카테고리 조회 */
  async templateCategories() {
    return this.out(await this.get('/template-categories'));
  }

  /** 공통 기능: 템플릿 목록 조회 */
  async templatesList(query: Record<string, string>) {
    return this.out(await this.get('/templates', { limit: '50', ...query }));
  }

  /** 공통 기능: 템플릿 상세 조회 */
  async templateDetail(templateUid: string) {
    return this.out(await this.get(`/templates/${templateUid}`));
  }

  /** 공통 기능: 책 목록 조회 */
  async booksList(query?: Record<string, string>) {
    return this.out(await this.get('/books', query && Object.keys(query).length ? query : undefined));
  }

  /** 공통 기능: 책 상세 조회 */
  async bookDetail(bookUid: string) {
    return this.out(
      await findBookByUidViaBooksList(
        (limit, offset) => this.get('/books', { limit: String(limit), offset: String(offset) }),
        bookUid,
      ),
    );
  }

  /** 공통 기능: 책 생성 */
  async createBook(dto: CreateSweetbookBookDto) {
    const payload: Record<string, string> = {
      title: dto.title.trim(),
      bookSpecUid: dto.bookSpecUid.trim(),
    };
    if (dto.creationType?.trim()) payload.creationType = dto.creationType.trim();
    if (dto.externalRef?.trim()) payload.externalRef = dto.externalRef.trim();
    if (dto.specProfileUid?.trim()) payload.specProfileUid = dto.specProfileUid.trim();
    return this.out(await this.postJson('/books', payload));
  }

  /** 공통 기능: 표지 업로드 */
  async addCover(bookUid: string, fields: SweetbookCoverFieldsDto, files: Express.Multer.File[]) {
    return this.out(
      await this.postMultipart(
        `/books/${bookUid}/cover`,
        { templateUid: fields.templateUid, parameters: fields.parameters },
        files,
      ),
    );
  }

  /** 공통 기능: 내지 업로드 */
  async addContents(
    bookUid: string,
    query: SweetbookContentsQueryDto,
    fields: SweetbookCoverFieldsDto,
    files: Express.Multer.File[],
  ) {
    return this.out(
      await this.postMultipart(
        `/books/${bookUid}/contents`,
        { templateUid: fields.templateUid, parameters: fields.parameters },
        files,
        query.breakBefore ? { breakBefore: query.breakBefore } : undefined,
      ),
    );
  }

  /** 공통 기능: 빈 페이지 이미지 업로드 */
  async addContentsBlankPageImage(
    bookUid: string,
    options: BlankPageImageOptionsDto,
    uploaded: Express.Multer.File,
  ): Promise<SweetbookProxyDto> {
    const templateUid = options.templateUid.trim();
    const raw = await this.get(`/templates/${templateUid}`);
    if (!raw.ok) return this.out(raw);
    const defs = extractParameterDefinitions(raw.data);
    if (!defs) {
      return { success: false, message: '템플릿 definitions 없음', sweetbookStatus: raw.status, response: raw.data };
    }
    const fileKeys = Object.keys(defs).filter((k) => isFileBinding(defs[k]));
    if (fileKeys.length === 0) return { success: false, message: 'file 슬롯 없음' };
    const fileField = fileKeys.sort()[0];
    const textParams: Record<string, string> = {};
    for (const [key, def] of Object.entries(defs)) {
      if (!isFileBinding(def)) textParams[key] = '';
    }
    if (options.parametersExtra?.trim()) {
      try {
        const extra = JSON.parse(options.parametersExtra) as Record<string, unknown>;
        for (const [k, v] of Object.entries(extra)) {
          if (k in defs && !isFileBinding(defs[k])) textParams[k] = v == null ? '' : String(v);
        }
      } catch {
        return { success: false, message: 'parameters JSON 오류' };
      }
    }
    let parameters: string | undefined;
    if (Object.keys(textParams).length > 0) parameters = JSON.stringify(textParams);
    const remapped: Express.Multer.File = { ...uploaded, fieldname: fileField };
    const r = await this.postMultipart(
      `/books/${bookUid}/contents`,
      { templateUid, parameters },
      [remapped],
      options.breakBefore ? { breakBefore: options.breakBefore } : undefined,
    );
    return this.out(r);
  }

  /** 공통 기능: 책 최종화 */
  async finalizeBook(bookUid: string) {
    return this.out(await this.postJson(`/books/${bookUid}/finalization`, {}));
  }

  /** 공통 기능: 주문 목록 조회 */
  async ordersList() {
    return this.out(await this.get('/orders'));
  }

  /** 공통 기능: 주문 상세 조회 */
  async orderDetail(orderUid: string) {
    return this.out(await this.get(`/orders/${orderUid}`));
  }

  /** 공통 기능: 주문 견적 조회 */
  async orderEstimate(body: SweetbookOrderBodyDto) {
    return this.out(await this.postJson('/orders/estimate', body));
  }

  /** 공통 기능: 주문 생성 */
  async createOrder(body: SweetbookOrderBodyDto) {
    return this.out(await this.postJson('/orders', body));
  }

  /** 공통 기능: 주문 취소 */
  async cancelOrder(orderUid: string, body: CancelOrderDto) {
    return this.out(await this.postJson(`/orders/${orderUid}/cancel`, body ?? {}));
  }
}
