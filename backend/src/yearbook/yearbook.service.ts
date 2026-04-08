import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BookPurchaseRequest } from '../entities/book-purchase-request.entity';
import { LayoutTemplate, LayoutTemplateKind } from '../entities/layout-template.entity';
import { User } from '../entities/user.entity';
import { SweetbookProxyDto } from '../sweetbook/dto/sweetbook-proxy.dto';
import { CreateYearbookBookDto } from './dto/create-book.dto';
import { YearbookCoverFieldsDto } from './dto/cover-fields.dto';
import { AdminCancelOrderDto } from './dto/admin-cancel-order.dto';
import { PurchaseEstimateDto } from './dto/purchase-estimate.dto';
import { PurchaseShippingDto } from './dto/purchase-shipping.dto';
import { CreateLayoutTemplateDto } from './dto/create-layout-template.dto';
import { YearbookPartnerApiService } from './yearbook-partner-api.service';

@Injectable()
// 일반유저 + 관리자 기능: 학년책 생성/주문/승인/취소 비즈니스 로직
export class YearbookService {
  constructor(
    private readonly partner: YearbookPartnerApiService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(BookPurchaseRequest)
    private readonly purchaseRequests: Repository<BookPurchaseRequest>,
    @InjectRepository(LayoutTemplate)
    private readonly layoutTemplates: Repository<LayoutTemplate>,
    private readonly config: ConfigService,
  ) {}

  /** SweetBook 견적 응답 본문에서 totalAmount(원) 추출 */
  private extractTotalAmountWonFromEstimateResponse(estimateProxyResponse: unknown): number | null {
    if (!estimateProxyResponse || typeof estimateProxyResponse !== 'object') return null;
    const root = estimateProxyResponse as Record<string, unknown>;
    const data =
      root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;
    const ta = data.totalAmount;
    if (typeof ta === 'number' && Number.isFinite(ta)) return Math.max(0, Math.floor(ta));
    return null;
  }

  /** 책 상세 프록시 응답에서 제목 (주문 UID와 무관, bookUid 기준) */
  private bookTitleFromBookDetailProxy(p: SweetbookProxyDto): string | null {
    if (!p.success || p.response === undefined || p.response === null) return null;
    const root = p.response as Record<string, unknown>;
    const data =
      root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;
    const t = data.title ?? data.bookTitle;
    if (typeof t === 'string' && t.trim()) return t.trim();
    return null;
  }

  /** 구매 요청 행의 표시 제목 — 항상 해당 포토북(bookUid) SweetBook 책 상세 기준 */
  private async resolveBookTitleForPurchaseRow(r: BookPurchaseRequest): Promise<string | null> {
    const raw = await this.partner.bookDetail(r.bookUid);
    return this.bookTitleFromBookDetailProxy(raw as SweetbookProxyDto);
  }

  private mapTemplateDetailProxyToListItem(
    proxy: SweetbookProxyDto,
    fallbackUid: string,
    kind: LayoutTemplateKind,
  ): {
    templateUid: string;
    templateName?: string;
    theme?: string;
    bookSpecUid?: string;
    templateKind?: string;
    thumbnails?: { layout?: string };
  } | null {
    if (!proxy.success || proxy.response === undefined) return null;
    const r = proxy.response;
    if (!r || typeof r !== 'object') return null;
    const root = r as Record<string, unknown>;
    const data =
      root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;
    const uid = typeof data.templateUid === 'string' ? data.templateUid : fallbackUid;
    return {
      templateUid: uid,
      templateName: typeof data.templateName === 'string' ? data.templateName : undefined,
      theme: typeof data.theme === 'string' ? data.theme : undefined,
      bookSpecUid: typeof data.bookSpecUid === 'string' ? data.bookSpecUid : undefined,
      templateKind: typeof data.templateKind === 'string' ? data.templateKind : kind,
      thumbnails:
        data.thumbnails && typeof data.thumbnails === 'object'
          ? (data.thumbnails as { layout?: string })
          : undefined,
    };
  }

  /** 일반유저 기능: DB에 등록된 레이아웃 템플릿(SweetBook 상세 병합) */
  async listLayoutTemplatesForUser(userId: string, kind: LayoutTemplateKind) {
    const rows = await this.layoutTemplates.find({ where: { kind }, order: { createdAt: 'ASC' } });
    const items: NonNullable<ReturnType<YearbookService['mapTemplateDetailProxyToListItem']>>[] = [];
    for (const row of rows) {
      const uid = row.templateUid.trim();
      const raw = await this.partner.templateDetail(uid);
      const p = raw as SweetbookProxyDto;
      const mapped = this.mapTemplateDetailProxyToListItem(p, uid, kind);
      if (mapped) items.push(mapped);
    }
    return { success: true, items };
  }

  /** 일반유저 기능: 등록된 템플릿 UID만 SweetBook 상세 조회 */
  async getLayoutTemplateSweetbookDetail(userId: string, templateUid: string) {
    const trimmed = templateUid.trim();
    const row = await this.layoutTemplates.findOne({ where: { templateUid: trimmed } });
    if (!row) {
      return { success: false, message: '등록된 템플릿이 아닙니다.' };
    }
    return this.partner.templateDetail(trimmed);
  }

  /** 관리자 기능: 레이아웃 템플릿 UID 목록 */
  async listLayoutTemplatesForAdmin(adminUserId: string, role: string) {
    if (role !== 'admin') {
      throw new ForbiddenException('관리자만 접근할 수 있습니다.');
    }
    const rows = await this.layoutTemplates.find({ order: { createdAt: 'DESC' } });
    return {
      success: true,
      items: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        templateUid: r.templateUid,
        createdAt: r.createdAt,
      })),
    };
  }

  /** 관리자 기능: 레이아웃 템플릿 등록 */
  async createLayoutTemplate(adminUserId: string, role: string, dto: CreateLayoutTemplateDto) {
    if (role !== 'admin') {
      throw new ForbiddenException('관리자만 접근할 수 있습니다.');
    }
    const uid = dto.templateUid.trim();
    if (!uid) {
      throw new BadRequestException('templateUid가 필요합니다.');
    }
    const row = this.layoutTemplates.create({ kind: dto.kind, templateUid: uid });
    try {
      await this.layoutTemplates.save(row);
    } catch {
      throw new BadRequestException('같은 종류·동일 UID는 중복 등록할 수 없습니다.');
    }
    return { success: true, id: row.id };
  }

  /** 관리자 기능: 레이아웃 템플릿 삭제 */
  async deleteLayoutTemplate(adminUserId: string, role: string, id: string) {
    if (role !== 'admin') {
      throw new ForbiddenException('관리자만 접근할 수 있습니다.');
    }
    const row = await this.layoutTemplates.findOne({ where: { id } });
    if (!row) {
      throw new BadRequestException('항목을 찾을 수 없습니다.');
    }
    await this.layoutTemplates.remove(row);
    return { success: true };
  }

  /** 기본 책 스펙 UID */
  private defaultBookSpecUid(): string {
    return this.config.get<string>('SWEETBOOK_DEFAULT_BOOK_SPEC_UID') ?? 'PHOTOBOOK_A5_SC';
  }

  /** 일반유저 기능: 책 생성 */
  async createBook(userId: string, dto: CreateYearbookBookDto) {
    const bookSpecUid = (dto.bookSpecUid?.trim() || this.defaultBookSpecUid()).trim();
    const raw = await this.partner.createBook(dto.title.trim(), bookSpecUid);
    const payload = raw as SweetbookProxyDto;
    if (!payload.success) return payload;
    const walk = (obj: unknown): string | null => {
      if (obj === null || obj === undefined) return null;
      if (typeof obj === 'string' && /^bk_/i.test(obj)) return obj;
      if (typeof obj !== 'object') return null;
      if (Array.isArray(obj)) {
        for (const x of obj) {
          const f = walk(x);
          if (f) return f;
        }
        return null;
      }
      const o = obj as Record<string, unknown>;
      if (typeof o.bookUid === 'string' && o.bookUid.length > 0) return o.bookUid;
      for (const k of Object.keys(o)) {
        const f = walk(o[k]);
        if (f) return f;
      }
      return null;
    };
    const bookUid = walk(payload.response);
    if (!bookUid) {
      return {
        success: false,
        message: 'SweetBook 응답에서 bookUid 없음',
        response: payload.response,
      } satisfies SweetbookProxyDto;
    }
    const user = await this.users.findOne({ where: { id: userId } });
    if (user) {
      user.bookUids = [...(user.bookUids ?? []), bookUid];
      await this.users.save(user);
    }
    return { success: true, bookUid, sweetbook: payload };
  }

  /** 일반유저 기능: 사용자의 포토북 목록 조회 */
  async listPhotobooks(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    const items = [...(user?.bookUids ?? [])].reverse().map((photobookUid) => ({ photobookUid }));
    return { success: true, items };
  }

  /** 일반유저 기능: 사용자의 포토북 목록 조회 (상세 정보 포함) */
  async listBooksWithDetails(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    const uids = [...(user?.bookUids ?? [])].reverse().filter(Boolean);
    const items: {
      photobookUid: string;
      linkedAt?: string;
      sweetbook: unknown;
      sweetbookError?: string;
    }[] = [];
    for (const photobookUid of uids) {
      const raw = await this.partner.bookDetail(photobookUid);
      const p = raw as SweetbookProxyDto;
      let linkedAt: string | undefined;
      if (p.success && p.response && typeof p.response === 'object') {
        const data = (p.response as Record<string, unknown>).data;
        if (data && typeof data === 'object') {
          const ca = (data as Record<string, unknown>).createdAt;
          if (typeof ca === 'string' && ca.trim().length > 0) linkedAt = ca.trim();
        }
      }
      items.push({
        photobookUid,
        ...(linkedAt ? { linkedAt } : {}),
        sweetbook: p.success ? p.response : null,
        sweetbookError: p.success ? undefined : p.message,
      });
    }
    return { success: true, items };
  }

  /** 일반유저 기능: 사용자의 포토북 상세 조회 */
  async getBookForUser(userId: string, bookUid: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!(user?.bookUids ?? []).includes(bookUid)) {
      throw new ForbiddenException('이 책에 대한 권한이 없습니다.');
    }
    const raw = await this.partner.bookDetail(bookUid);
    const payload = raw as SweetbookProxyDto;
    if (!payload.success) return payload;
    return { success: true, photobookUid: bookUid, sweetbook: payload.response };
  }

  /** 일반유저 기능: 표지 업로드/적용 */
  async addCover(userId: string, bookUid: string, fields: YearbookCoverFieldsDto, files: Express.Multer.File[]) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!(user?.bookUids ?? []).includes(bookUid)) {
      throw new ForbiddenException('이 책에 대한 권한이 없습니다.');
    }
    return this.partner.addCover(bookUid, fields, files);
  }

  /** 일반유저 기능: 내지 업로드/추가 */
  async addContents(
    userId: string,
    bookUid: string,
    query: { breakBefore?: string },
    fields: YearbookCoverFieldsDto,
    files: Express.Multer.File[],
  ) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!(user?.bookUids ?? []).includes(bookUid)) {
      throw new ForbiddenException('이 책에 대한 권한이 없습니다.');
    }
    return this.partner.addContents(bookUid, query, fields, files);
  }

  /** 일반유저 기능: 포토북 최종화 */
  async finalizeBookForUser(userId: string, bookUid: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!(user?.bookUids ?? []).includes(bookUid)) {
      throw new ForbiddenException('이 책에 대한 권한이 없습니다.');
    }
    return this.partner.finalizeBook(bookUid);
  }

  /** 일반유저 기능: 최종화 후 견적 조회 */
  async purchaseEstimate(userId: string, bookUid: string, dto?: PurchaseEstimateDto) {
    const qty = Math.min(99, Math.max(1, Math.floor(Number(dto?.quantity ?? 1))));
    const user = await this.users.findOne({ where: { id: userId } });
    if (!(user?.bookUids ?? []).includes(bookUid)) {
      throw new ForbiddenException('이 책에 대한 권한이 없습니다.');
    }
    const finRaw = await this.partner.finalizeBook(bookUid);
    const fin = finRaw as SweetbookProxyDto;
    const estRaw = await this.partner.orderEstimate({ items: [{ bookUid, quantity: qty }] });
    const est = estRaw as SweetbookProxyDto;
    const success = !!(fin.success && est.success);
    const apiTotalWon = success ? this.extractTotalAmountWonFromEstimateResponse(est.response) : null;
    const displayTotalWon = apiTotalWon !== null ? apiTotalWon * 2 : null;
    return {
      success,
      finalize: fin,
      estimate: est,
      apiTotalWon,
      displayTotalWon,
      message: success ? undefined : !fin.success ? fin.message : est.message,
    };
  }

  /** 일반유저 기능: 주문 요청 */
  async submitPurchaseRequest(userId: string, bookUid: string, dto: PurchaseShippingDto) {
    const qty = Math.min(99, Math.max(1, Math.floor(Number(dto.quantity ?? 1))));
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('사용자를 찾을 수 없습니다.');
    }
    if (!(user.bookUids ?? []).includes(bookUid)) {
      throw new ForbiddenException('이 책에 대한 권한이 없습니다.');
    }
    const dup = await this.purchaseRequests.findOne({
      where: { userId, bookUid, status: 'pending' },
    });
    if (dup) {
      return {
        success: false,
        message: '이 책에 대한 구매 요청이 이미 검토 대기 중입니다.',
      };
    }
    const finRaw = await this.partner.finalizeBook(bookUid);
    const fin = finRaw as SweetbookProxyDto;
    const estRaw = await this.partner.orderEstimate({ items: [{ bookUid, quantity: qty }] });
    const est = estRaw as SweetbookProxyDto;
    if (!fin.success || !est.success) {
      return {
        success: false,
        message: !fin.success ? fin.message ?? '최종화 실패' : est.message ?? '견적 조회 실패',
        finalize: fin,
        estimate: est,
      };
    }
    const apiAmountWon = this.extractTotalAmountWonFromEstimateResponse(est.response);
    if (apiAmountWon === null) {
      return {
        success: false,
        message: '견적에서 금액을 확인할 수 없습니다.',
        finalize: fin,
        estimate: est,
      };
    }
    const userChargeWon = apiAmountWon * 2;
    const balance = user.balanceWon ?? 0;
    if (balance < userChargeWon) {
      return {
        success: false,
        message: `잔액이 부족합니다. (결제 예정 ${userChargeWon.toLocaleString('ko-KR')}원, 보유 ${balance.toLocaleString('ko-KR')}원)`,
        finalize: fin,
        estimate: est,
      };
    }
    user.balanceWon = balance - userChargeWon;
    await this.users.save(user);
    const row = this.purchaseRequests.create({
      userId,
      bookUid,
      quantity: qty,
      status: 'pending',
      recipientName: dto.recipientName.trim(),
      recipientPhone: dto.recipientPhone.trim(),
      postalCode: dto.postalCode.trim(),
      address1: dto.address1.trim(),
      address2: dto.address2?.trim() ? dto.address2.trim() : null,
      finalizeSnapshot: fin.response ?? null,
      estimateSnapshot: est.response ?? null,
      apiAmountWon,
      userChargeWon,
      idempotencyKey: null,
      sweetbookOrderUid: null,
      lastError: null,
      cancelReason: null,
    });
    await this.purchaseRequests.save(row);
    return { success: true, requestId: row.id, balanceWon: user.balanceWon };
  }

  /** 관리자 기능: 주문 요청 목록 조회 */
  async listPurchaseRequestsForAdmin(adminUserId: string, role: string) {
    if (role !== 'admin') {
      throw new ForbiddenException('관리자만 접근할 수 있습니다.');
    }
    const rows = await this.purchaseRequests.find({ order: { createdAt: 'DESC' } });
    const items = await Promise.all(
      rows.map(async (r) => {
        const u = await this.users.findOne({ where: { id: r.userId } });
        const bookTitle = await this.resolveBookTitleForPurchaseRow(r);
        return {
          id: r.id,
          userId: r.userId,
          requesterEmail: u?.email ?? null,
          requesterName: u?.displayName ?? null,
          bookUid: r.bookUid,
          bookTitle,
          quantity: r.quantity,
          status: r.status,
          recipientName: r.recipientName,
          recipientPhone: r.recipientPhone,
          postalCode: r.postalCode,
          address1: r.address1,
          address2: r.address2,
          estimateSnapshot: r.estimateSnapshot,
          finalizeSnapshot: r.finalizeSnapshot,
          idempotencyKey: r.idempotencyKey,
          sweetbookOrderUid: r.sweetbookOrderUid,
          lastError: r.lastError,
          cancelReason: r.cancelReason,
          apiAmountWon: r.apiAmountWon,
          userChargeWon: r.userChargeWon,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      }),
    );
    return { success: true, items };
  }

  /** 일반유저 기능: 주문 목록 — 본인 userId + 본인이 만든 책(bookUids)에 대한 요청만, 제목은 포토북(bookUid) 책 상세 */
  async listMyOrders(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    const allowedBooks = new Set(user?.bookUids ?? []);
    const rows = await this.purchaseRequests.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const ownRows = rows.filter((r) => allowedBooks.has(r.bookUid));
    const items = await Promise.all(
      ownRows.map(async (r) => ({
        id: r.id,
        bookTitle: await this.resolveBookTitleForPurchaseRow(r),
        quantity: r.quantity,
        status: r.status,
        sweetbookOrderUid: r.sweetbookOrderUid,
        recipientName: r.recipientName,
        recipientPhone: r.recipientPhone,
        postalCode: r.postalCode,
        address1: r.address1,
        address2: r.address2,
        cancelReason: r.cancelReason,
        lastError: r.lastError,
        apiAmountWon: r.apiAmountWon,
        userChargeWon: r.userChargeWon,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    );
    return { success: true, items };
  }

  /** 일반유저 기능: 주문 취소 — 승인 대기(pending)는 즉시 취소·환불, 주문 완료(ordered)는 SweetBook 취소 */
  async cancelMyOrder(userId: string, requestId: string, dto: AdminCancelOrderDto) {
    const user = await this.users.findOne({ where: { id: userId } });
    const pr = await this.purchaseRequests.findOne({ where: { id: requestId } });
    if (!pr) {
      throw new BadRequestException('요청을 찾을 수 없습니다.');
    }
    if (pr.userId !== userId) {
      throw new ForbiddenException('본인 주문만 취소할 수 있습니다.');
    }
    if (!(user?.bookUids ?? []).includes(pr.bookUid)) {
      throw new ForbiddenException('이 책에 대한 권한이 없습니다.');
    }
    if (pr.status === 'cancelled') {
      throw new BadRequestException('이미 취소된 요청입니다.');
    }
    const reason = dto.cancelReason.trim();

    if (pr.status === 'pending') {
      if (user && (pr.userChargeWon ?? 0) > 0) {
        user.balanceWon = (user.balanceWon ?? 0) + pr.userChargeWon!;
        await this.users.save(user);
      }
      pr.status = 'cancelled';
      pr.cancelReason = reason;
      pr.lastError = null;
      await this.purchaseRequests.save(pr);
      return { success: true, message: '구매 요청이 취소되었고 잔액이 환불되었습니다.', balanceWon: user?.balanceWon };
    }

    if (pr.status !== 'ordered' || !pr.sweetbookOrderUid) {
      throw new BadRequestException('취소할 수 있는 상태가 아닙니다.');
    }
    const raw = await this.partner.cancelOrder(pr.sweetbookOrderUid, { cancelReason: reason });
    const p = raw as SweetbookProxyDto;
    if (p.success) {
      pr.status = 'cancelled';
      pr.cancelReason = reason;
      pr.lastError = null;
    } else {
      pr.lastError = p.message ?? '주문 취소 API 실패';
    }
    await this.purchaseRequests.save(pr);
    return p;
  }

  /** 관리자 기능: 주문 취소 — pending은 즉시·환불, ordered는 SweetBook 취소 */
  async cancelPurchaseOrder(adminUserId: string, role: string, requestId: string, dto: AdminCancelOrderDto) {
    if (role !== 'admin') {
      throw new ForbiddenException('관리자만 접근할 수 있습니다.');
    }
    const pr = await this.purchaseRequests.findOne({ where: { id: requestId } });
    if (!pr) {
      throw new BadRequestException('요청을 찾을 수 없습니다.');
    }
    if (pr.status === 'cancelled') {
      throw new BadRequestException('이미 취소된 요청입니다.');
    }
    const reason = dto.cancelReason.trim();

    if (pr.status === 'pending') {
      const u = await this.users.findOne({ where: { id: pr.userId } });
      if (u && (pr.userChargeWon ?? 0) > 0) {
        u.balanceWon = (u.balanceWon ?? 0) + pr.userChargeWon!;
        await this.users.save(u);
      }
      pr.status = 'cancelled';
      pr.cancelReason = reason;
      pr.lastError = null;
      await this.purchaseRequests.save(pr);
      return { success: true, message: '구매 요청이 취소되었고 이용자 잔액이 환불되었습니다.' };
    }

    if (pr.status !== 'ordered' || !pr.sweetbookOrderUid) {
      throw new BadRequestException('주문이 생성된 건만 SweetBook 취소 API를 호출할 수 있습니다.');
    }
    const raw = await this.partner.cancelOrder(pr.sweetbookOrderUid, { cancelReason: reason });
    const p = raw as SweetbookProxyDto;
    if (p.success) {
      pr.status = 'cancelled';
      pr.cancelReason = reason;
      pr.lastError = null;
    } else {
      pr.lastError = p.message ?? '주문 취소 API 실패';
    }
    await this.purchaseRequests.save(pr);
    return p;
  }

  /** POST /orders 응답에서 orderUid (data.orderUid 또는 최상위) */
  private orderUidFromCreateOrderResponse(response: unknown): string | null {
    if (!response || typeof response !== 'object') return null;
    const root = response as Record<string, unknown>;
    const data = root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : null;
    const fromData = data && typeof data.orderUid === 'string' ? data.orderUid.trim() : '';
    if (fromData) return fromData;
    const top = typeof root.orderUid === 'string' ? root.orderUid.trim() : '';
    return top || null;
  }

  /** 관리자 기능: 주문 요청 승인 */
  async approvePurchaseRequest(adminUserId: string, role: string, requestId: string) {
    if (role !== 'admin') {
      throw new ForbiddenException('관리자만 접근할 수 있습니다.');
    }
    const pr = await this.purchaseRequests.findOne({ where: { id: requestId } });
    if (!pr) {
      throw new BadRequestException('요청을 찾을 수 없습니다.');
    }
    if (pr.status !== 'pending') {
      throw new BadRequestException('대기 중인 요청만 승인할 수 있습니다.');
    }
    const qty = Math.min(99, Math.max(1, Math.floor(Number(pr.quantity ?? 1))));
    const idem = randomUUID();
    const addr2 = pr.address2?.trim();
    const body = {
      items: [{ bookUid: pr.bookUid, quantity: qty }],
      shipping: {
        recipientName: pr.recipientName,
        recipientPhone: pr.recipientPhone,
        postalCode: pr.postalCode,
        address1: pr.address1,
        ...(addr2 ? { address2: addr2 } : {}),
      },
      externalRef: `purchase-${pr.id}`,
    };
    const raw = await this.partner.createOrder(body, idem);
    const p = raw as SweetbookProxyDto;
    pr.idempotencyKey = idem;
    if (p.success) {
      const orderUid = this.orderUidFromCreateOrderResponse(p.response);
      if (!orderUid) {
        pr.status = 'failed';
        pr.lastError = 'SweetBook 주문 응답에 orderUid가 없습니다. 응답 형식을 확인하세요.';
        pr.sweetbookOrderUid = null;
      } else {
        pr.status = 'ordered';
        pr.sweetbookOrderUid = orderUid;
        pr.lastError = null;
      }
    } else {
      pr.status = 'failed';
      pr.lastError = p.message ?? '주문 API 실패';
    }
    await this.purchaseRequests.save(pr);
    if (p.success && pr.sweetbookOrderUid) {
      const user = await this.users.findOne({ where: { id: pr.userId } });
      if (user) {
        const arr = [...(user.orderUids ?? [])];
        if (!arr.includes(pr.sweetbookOrderUid)) arr.push(pr.sweetbookOrderUid);
        user.orderUids = arr;
        await this.users.save(user);
      }
    }
    return p;
  }

  /** 관리자 기능: SweetBook GET /v1/credits — 회사(파트너) 잔액(원만 반환) */
  async getCompanyCredits(adminUserId: string, role: string) {
    if (role !== 'admin') {
      throw new ForbiddenException('관리자만 접근할 수 있습니다.');
    }
    const raw = await this.partner.getCredits();
    const p = raw as SweetbookProxyDto;
    if (!p.success) {
      return { success: false as const, message: p.message ?? 'SweetBook credits 조회 실패' };
    }
    const root = p.response;
    if (!root || typeof root !== 'object') {
      return { success: false as const, message: '응답 형식 오류' };
    }
    const r = root as Record<string, unknown>;
    const data = r.data && typeof r.data === 'object' ? (r.data as Record<string, unknown>) : null;
    const bal = data?.balance;
    if (typeof bal !== 'number' || !Number.isFinite(bal)) {
      return { success: false as const, message: '잔액을 읽을 수 없습니다.' };
    }
    return { success: true as const, balance: Math.floor(bal) };
  }

  /** 관리자 기능: SweetBook GET /orders/{orderUid} — 주문 상세 */
  async getSweetbookOrderDetailForAdmin(_adminUserId: string, role: string, orderUid: string) {
    if (role !== 'admin') {
      throw new ForbiddenException('관리자만 접근할 수 있습니다.');
    }
    const uid = orderUid?.trim();
    if (!uid) {
      return { success: false as const, message: 'orderUid가 없습니다.' };
    }
    return this.partner.orderDetail(uid);
  }
}
