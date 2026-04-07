import type { SweetbookRawResult } from './sweetbook.types';

/**
 * SweetBook Books API에는 문서화된 단건 GET /books/:bookUid 가 없고, 호출 시 405가 날 수 있습니다.
 * GET /books 목록을 페이지 단위로 조회해 bookUid 일치 항목을 찾습니다.
 */
export async function findBookByUidViaBooksList(
  fetchPage: (limit: number, offset: number) => Promise<SweetbookRawResult>,
  bookUid: string,
): Promise<SweetbookRawResult> {
  const limit = 100;
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const r = await fetchPage(limit, offset);
    if (!r.ok) return r;

    const payload = r.data as { data?: { books?: Array<{ bookUid?: string }>; total?: number } };
    const books = payload?.data?.books ?? [];
    const t = payload?.data?.total;
    if (typeof t === 'number' && t >= 0) total = t;

    const found = books.find((b) => b.bookUid === bookUid);
    if (found) {
      return {
        ok: true,
        status: r.status,
        data: { success: true, data: found },
      };
    }

    if (books.length === 0 || books.length < limit) break;
    offset += limit;
    if (offset > 50_000) break;
  }

  return {
    ok: false,
    message: '책을 찾을 수 없습니다.',
    status: 404,
  };
}
