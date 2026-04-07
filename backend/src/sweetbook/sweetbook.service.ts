import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { SweetbookProxyDto } from './dto/sweetbook-proxy.dto';

/** SweetBook 목록 GET만 */
@Injectable()
// 공통 기능: SweetBook 조회 API 프록시 서비스
export class SweetbookService {
  constructor(private readonly config: ConfigService) {}

  private baseUrl(): string {
    return (
      this.config.get<string>('SWEETBOOK_API_BASE_URL')?.replace(/\/$/, '') ??
      'https://api-sandbox.sweetbook.com/v1'
    );
  }

  // SweetBook GET /v1/book-specs
  /** 공통 기능: 책 스펙 목록 조회 */
  async bookSpecsList(query: Record<string, string>) {
    const key = this.config.get<string>('SWEETBOOK_API_KEY');
    if (!key) return { success: false, message: 'SWEETBOOK_API_KEY가 backend/.env에 없습니다.' };
    const url = `${this.baseUrl()}/book-specs`;
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${key}` },
        params: Object.keys(query).length ? query : undefined,
      });
      return { success: true, sweetbookStatus: response.status, response: response.data };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const err = e as AxiosError<{ message?: string }>;
        return {
          success: false,
          message: err.response?.data?.message ?? err.message ?? 'API 호출 실패',
          sweetbookStatus: err.response?.status,
          response: err.response?.data,
        };
      }
      return { success: false, message: e instanceof Error ? e.message : 'API 호출 실패' };
    }
  }

  // SweetBook GET /v1/template-categories
  /** 공통 기능: 템플릿 카테고리 목록 조회 */
  async templateCategories() {
    const key = this.config.get<string>('SWEETBOOK_API_KEY');
    if (!key) return { success: false, message: 'SWEETBOOK_API_KEY가 backend/.env에 없습니다.' };
    const url = `${this.baseUrl()}/template-categories`;
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      return { success: true, sweetbookStatus: response.status, response: response.data };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const err = e as AxiosError<{ message?: string }>;
        return {
          success: false,
          message: err.response?.data?.message ?? err.message ?? 'API 호출 실패',
          sweetbookStatus: err.response?.status,
          response: err.response?.data,
        };
      }
      return { success: false, message: e instanceof Error ? e.message : 'API 호출 실패' };
    }
  }

  // SweetBook GET /v1/templates
  /** 공통 기능: 템플릿 목록 조회 */
  async templatesList(query: Record<string, string>) {
    const key = this.config.get<string>('SWEETBOOK_API_KEY');
    if (!key) return { success: false, message: 'SWEETBOOK_API_KEY가 backend/.env에 없습니다.' };
    const url = `${this.baseUrl()}/templates`;
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${key}` },
        params: { limit: '50', ...query },
      });
      return { success: true, sweetbookStatus: response.status, response: response.data };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const err = e as AxiosError<{ message?: string }>;
        return {
          success: false,
          message: err.response?.data?.message ?? err.message ?? 'API 호출 실패',
          sweetbookStatus: err.response?.status,
          response: err.response?.data,
        };
      }
      return { success: false, message: e instanceof Error ? e.message : 'API 호출 실패' };
    }
  }

  // SweetBook GET /v1/books
  /** 공통 기능: 책 목록 조회 */
  async booksList(query?: Record<string, string>) {
    const key = this.config.get<string>('SWEETBOOK_API_KEY');
    if (!key) return { success: false, message: 'SWEETBOOK_API_KEY가 backend/.env에 없습니다.' };
    const url = `${this.baseUrl()}/books`;
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${key}` },
        params: query && Object.keys(query).length ? query : undefined,
      });
      return { success: true, sweetbookStatus: response.status, response: response.data };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const err = e as AxiosError<{ message?: string }>;
        return {
          success: false,
          message: err.response?.data?.message ?? err.message ?? 'API 호출 실패',
          sweetbookStatus: err.response?.status,
          response: err.response?.data,
        };
      }
      return { success: false, message: e instanceof Error ? e.message : 'API 호출 실패' };
    }
  }

  // SweetBook GET /v1/orders
  /** 공통 기능: 주문 목록 조회 */
  async ordersList() {
    const key = this.config.get<string>('SWEETBOOK_API_KEY');
    if (!key) return { success: false, message: 'SWEETBOOK_API_KEY가 backend/.env에 없습니다.' };
    const url = `${this.baseUrl()}/orders`;
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      return { success: true, sweetbookStatus: response.status, response: response.data };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const err = e as AxiosError<{ message?: string }>;
        return {
          success: false,
          message: err.response?.data?.message ?? err.message ?? 'API 호출 실패',
          sweetbookStatus: err.response?.status,
          response: err.response?.data,
        };
      }
      return { success: false, message: e instanceof Error ? e.message : 'API 호출 실패' };
    }
  }
}
