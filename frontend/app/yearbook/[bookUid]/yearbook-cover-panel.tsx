'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const FIXED_BOOK_SPEC_UID = 'PHOTOBOOK_A5_SC';

type TemplateListItem = {
  templateUid: string;
  templateName?: string;
  theme?: string;
  bookSpecUid?: string;
  templateKind?: string;
  thumbnails?: { layout?: string };
};

type TemplateParamDefinition = {
  binding?: string;
  type?: string;
  required?: boolean;
  description?: string | null;
};

type LayoutTemplateDetailPayload = {
  response?: {
    data?: {
      parameters?: { definitions?: Record<string, TemplateParamDefinition> };
      templateName?: string;
    };
  };
};

type YearbookLayoutTemplatesResponse = {
  success: boolean;
  items?: TemplateListItem[];
  message?: string;
};

/** 템플릿 카드에 쓸 레이아웃 썸네일 URL */
function pickTemplateLayoutThumbnail(item: TemplateListItem): string | null {
  return item.thumbnails?.layout?.trim() || null;
}

/** 표지 적용 API에 넣을 templateUid */
function templateUidForCoverRequest(item: TemplateListItem): string {
  return item.templateUid;
}

/** localStorage — 이 책 표지 적용 완료 플래그 */
function storageCoverKey(bookUid: string) {
  return `yearbook:${bookUid}:coverApplied`;
}

function isFileBinding(def: TemplateParamDefinition): boolean {
  return (def.binding ?? '').toLowerCase() === 'file';
}

/** 텍스트 파라미터만 모아 미리보기용 JSON 문자열 생성 */
function buildParametersPreviewJson(
  definitions: Record<string, TemplateParamDefinition> | null,
  defsTemplateUid: string | null,
  selected: TemplateListItem | null,
  dynamicText: Record<string, string>,
): string {
  if (!definitions || !defsTemplateUid || !selected || defsTemplateUid !== selected.templateUid) return '';
  const o: Record<string, string> = {};
  for (const [key, def] of Object.entries(definitions)) {
    if (!isFileBinding(def)) o[key] = dynamicText[key] ?? '';
  }
  return JSON.stringify(o, null, 2);
}

type Props = {
  bookUid: string;
  /** 로그인 후 돌아올 경로 (예: `/yearbook/bk_xxx/edit`) */
  loginRedirectPath: string;
  onCoverApplied?: () => void;
};

/**
 * 표지 만들기 — SweetBook POST /v1/books/{bookUid}/cover (multipart)
 */
export function YearbookCoverPanel({ bookUid, loginRedirectPath, onCoverApplied }: Props) {
  const router = useRouter();

  const [bookLoading, setBookLoading] = useState(true);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState<string | null>(null);
  /** SweetBook `data.status` 소문자: draft | finalized | deleted */
  const [bookStatus, setBookStatus] = useState<string | null>(null);
  const [coverAppliedLocal, setCoverAppliedLocal] = useState(false);

  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [selected, setSelected] = useState<TemplateListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [definitions, setDefinitions] = useState<Record<string, TemplateParamDefinition> | null>(null);
  const [loadedTemplateName, setLoadedTemplateName] = useState<string | null>(null);
  const [defsTemplateUid, setDefsTemplateUid] = useState<string | null>(null);

  const [dynamicText, setDynamicText] = useState<Record<string, string>>({});
  const [dynamicFiles, setDynamicFiles] = useState<Record<string, File | null>>({});

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmApplyModalOpen, setConfirmApplyModalOpen] = useState(false);

  const redirectLogin = `/login?redirect=${encodeURIComponent(loginRedirectPath)}`;

  useEffect(() => {
    if (typeof window === 'undefined' || !bookUid) return;
    setCoverAppliedLocal(window.localStorage.getItem(storageCoverKey(bookUid)) === '1');
  }, [bookUid]);

  useEffect(() => {
    if (!bookUid) return;
    let cancelled = false;
    (async () => {
      setBookLoading(true);
      setBookError(null);
      try {
        const { data: listData } = await api.get<{
          success: boolean;
          items?: { photobookUid: string; sweetbook: unknown }[];
          message?: string;
        }>('/yearbook/books');
        if (cancelled) return;
        if (!listData.success || !Array.isArray(listData.items)) {
          setBookError(listData.message ?? '목록을 불러오지 못했습니다.');
          return;
        }
        const row = listData.items.find((i) => i.photobookUid === bookUid);
        if (!row) {
          setBookError('해당 책을 찾을 수 없습니다.');
          return;
        }
        const d = (row.sweetbook as { data?: { title?: string; status?: string } })?.data;
        setBookTitle(d?.title?.trim() || '제목 없음');
        setBookStatus(d?.status?.toLowerCase() ?? null);
      } catch (e: unknown) {
        if (cancelled) return;
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) {
          router.replace(redirectLogin);
          return;
        }
        setBookError('책 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setBookLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookUid, router, redirectLogin]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTemplatesLoading(true);
      setTemplatesError(null);
      try {
        const { data } = await api.get<YearbookLayoutTemplatesResponse>(
          `/yearbook/layout-templates?kind=${encodeURIComponent('cover')}`,
        );
        if (cancelled) return;
        const list = data.success && Array.isArray(data.items) ? data.items : [];
        setTemplates(list);
        if (list.length === 0) {
          setTemplatesError(
            '표지 레이아웃이 없습니다. 관리자 페이지에서 템플릿 UID를 등록해 주세요.',
          );
        }
      } catch {
        if (!cancelled) {
          setTemplatesError('템플릿 목록을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadTemplateDetail(item: TemplateListItem) {
    const uid = item.templateUid;
    setDetailLoading(true);
    setDetailError(null);
    setDefinitions(null);
    setDefsTemplateUid(null);
    setLoadedTemplateName(null);
    setDynamicText({});
    setDynamicFiles({});
    try {
      const { data } = await api.get<unknown>(`/yearbook/layout-templates/${encodeURIComponent(uid)}/detail`);
      const detail = data as LayoutTemplateDetailPayload;
      const defs = detail.response?.data?.parameters?.definitions;
      if (!defs || typeof defs !== 'object') {
        setDetailError('템플릿 상세에 parameters.definitions가 없습니다.');
        return;
      }
      setDefinitions(defs);
      setDefsTemplateUid(uid);
      setLoadedTemplateName(detail.response?.data?.templateName ?? null);
      const text: Record<string, string> = {};
      const files: Record<string, File | null> = {};
      for (const key of Object.keys(defs)) {
        if (isFileBinding(defs[key])) files[key] = null;
        else text[key] = '';
      }
      setDynamicText(text);
      setDynamicFiles(files);
    } catch {
      setDetailError('템플릿 상세를 불러오지 못했습니다.');
    } finally {
      setDetailLoading(false);
    }
  }

  const onPickTemplate = (item: TemplateListItem) => {
    setSelected(item);
    setStatusMsg(null);
    void loadTemplateDetail(item);
  };

  const selectedLayoutPreviewUrl = selected ? pickTemplateLayoutThumbnail(selected) : null;
  const parametersPreview = buildParametersPreviewJson(definitions, defsTemplateUid, selected, dynamicText);

  function applyCover(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg(null);
    if (!bookUid) {
      setStatusMsg('책 식별자가 없습니다.');
      return;
    }
    if (!selected || !definitions || defsTemplateUid !== selected.templateUid) {
      setStatusMsg('표지 템플릿을 선택하고 파라미터를 불러왔는지 확인해 주세요.');
      return;
    }
    for (const [key, def] of Object.entries(definitions)) {
      if (isFileBinding(def)) {
        if (def.required && !dynamicFiles[key]) {
          setStatusMsg(`필수 이미지 항목을 선택하세요: ${key} (${def.description ?? ''})`);
          return;
        }
      } else if (def.required && !(dynamicText[key]?.trim())) {
        setStatusMsg(`필수 입력 항목을 채워 주세요: ${key} (${def.description ?? ''})`);
        return;
      }
    }
    setConfirmApplyModalOpen(true);
  }

  async function executeApplyCover() {
    setConfirmApplyModalOpen(false);
    if (!selected || !definitions || defsTemplateUid !== selected.templateUid) {
      setStatusMsg('표지 템플릿을 다시 선택해 주세요.');
      return;
    }
    const currentSelected = selected;
    const currentDefinitions = definitions;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('templateUid', templateUidForCoverRequest(currentSelected));
      const textOnly: Record<string, string> = {};
      for (const [key, def] of Object.entries(currentDefinitions)) {
        if (!isFileBinding(def)) textOnly[key] = dynamicText[key] ?? '';
      }
      fd.append('parameters', JSON.stringify(textOnly));
      for (const [key, def] of Object.entries(currentDefinitions)) {
        if (isFileBinding(def)) {
          const f = dynamicFiles[key];
          if (f) fd.append(key, f);
        }
      }
      await api.post(`/yearbook/books/${encodeURIComponent(bookUid)}/cover`, fd);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageCoverKey(bookUid), '1');
      }
      setStatusMsg(null);
      onCoverApplied?.();
    } catch {
      setStatusMsg('요청 중 오류가 났습니다. 네트워크·API 키·필수 항목을 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  if (bookLoading) {
    return <p className="sb-muted">책 정보 확인 중…</p>;
  }

  if (bookError) {
    return (
      <>
        <p className="sb-error">{bookError}</p>
        <p className="sb-panelNote">
          <Link href="/yearbook">학급 포토북 목록으로 돌아가기</Link>
        </p>
      </>
    );
  }

  const finalizedOrDeleted = bookStatus === 'finalized' || bookStatus === 'deleted';

  if (finalizedOrDeleted) {
    return (
      <section className="sb-panel">
        <p className="sb-error">
          {bookStatus === 'deleted'
            ? '삭제된 책은 표지를 바꿀 수 없습니다.'
            : 'SweetBook에서 최종화된 책은 표지·내지를 더 이상 수정할 수 없습니다.'}
        </p>
        <p className="sb-panelNote">
          <Link href="/yearbook">목록으로</Link>
        </p>
      </section>
    );
  }

  if (coverAppliedLocal) {
    return (
      <>
        <div className="sb-pageHead">
          <h2 className="sb-pageTitle" style={{ fontSize: '1.35rem' }}>
            표지
          </h2>
          <p className="sb-pageLead">
            <strong>{bookTitle ?? bookUid}</strong> — 표지는 <strong>한 번 적용하면 수정할 수 없습니다</strong>. 적용이 끝나면
            내지 편집 단계로 자동으로 넘어갑니다.
          </p>
        </div>
        <section className="sb-panel">
          <p className="sb-formMsg">이 책의 표지는 이미 적용되었습니다.</p>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="sb-pageHead">
        <h2 className="sb-pageTitle" style={{ fontSize: '1.35rem' }}>
          표지
        </h2>
        <p className="sb-pageLead">
          <strong>{bookTitle ?? bookUid}</strong> — 아래 <strong>썸네일(레이아웃)</strong> 중 하나를 고른 뒤 글·사진을 넣고 적용합니다.{' '}
          <span className="sb-muted">표지는 한 번 적용하면 수정할 수 없습니다.</span> (
          <code>templateKind=cover</code>)
        </p>
      </div>

      <section className="sb-panel">
        <h3 className="sb-panelTitle">1. 레이아웃 선택 (썸네일)</h3>
        <p className="sb-panelNote">
          <strong> 레이아웃을 눌러 고르세요. </strong>
        </p>
        {templatesLoading ? <p className="sb-muted">레이아웃 목록 불러오는 중…</p> : null}
        {templatesError ? <p className="sb-error">{templatesError}</p> : null}
        {!templatesLoading && templates.length > 0 ? (
          <div className="sb-templateGrid">
            {templates.map((t) => {
              const active = selected?.templateUid === t.templateUid;
              const thumb = pickTemplateLayoutThumbnail(t);
              const label = t.templateName ?? '표지 레이아웃';
              return (
                <button
                  key={t.templateUid}
                  type="button"
                  className={`sb-templateCard ${active ? 'isActive' : ''}`}
                  onClick={() => onPickTemplate(t)}
                  aria-pressed={active}
                  aria-label={`${label} 레이아웃 선택`}
                >
                  <div className="sb-templateThumb">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="sb-templateImg" loading="lazy" />
                    ) : (
                      <span className="sb-templateNoImg">미리보기 없음 · 이름만 확인</span>
                    )}
                  </div>
                  <div className="sb-templateMeta">
                    <span className="sb-templateName">{t.templateName ?? t.templateUid}</span>
                    {t.theme ? <span className="sb-templateTheme">{t.theme}</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
        {selected ? (
          <div className="sb-coverLayoutPreview">
            <p className="sb-coverLayoutPreviewLabel">선택한 레이아웃 (크게 보기)</p>
            {selectedLayoutPreviewUrl ? (
              <div className="sb-coverLayoutPreviewFrame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedLayoutPreviewUrl} alt="" className="sb-coverLayoutPreviewImg" />
              </div>
            ) : (
              <p className="sb-muted">이 템플릿은 큰 미리보기 이미지 URL이 없습니다. 위 작은 썸네일과 이름을 참고해 주세요.</p>
            )}
            <p className="sb-coverLayoutPreviewCaption">
              {selected.templateName ?? selected.templateUid}
              {selected.theme ? <span className="sb-templateTheme"> · {selected.theme}</span> : null}
            </p>
          </div>
        ) : null}
      </section>

      <section className={`sb-panel ${!selected ? 'sb-panelDisabled' : ''}`}>
        <h3 className="sb-panelTitle">2. 표지에 넣을 내용</h3>
        {!selected ? (
          <p className="sb-panelNote">위에서 템플릿을 먼저 선택해 주세요.</p>
        ) : detailLoading ? (
          <p className="sb-muted">템플릿 상세·입력 항목 불러오는 중…</p>
        ) : detailError ? (
          <p className="sb-error">{detailError}</p>
        ) : definitions && defsTemplateUid === selected.templateUid ? (
          <>
            <p className="sb-fieldHint">
              선택한 레이아웃: <strong>{loadedTemplateName ?? selected.templateName ?? '표지'}</strong>
            </p>
            <div className="sb-dynamicForm">
              {Object.entries(definitions)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, def]) => (
                  <label key={key} className="sb-label">
                    <span className="sb-paramKey">
                      <code>{key}</code>{' '}
                      <span className={def.required ? 'sb-tagReq' : 'sb-tagOpt'}>
                        {def.required ? '필수' : '선택'}
                      </span>
                    </span>
                    {def.description ? <span className="sb-fieldHint">{def.description}</span> : null}
                    {isFileBinding(def) ? (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setDynamicFiles((prev) => ({ ...prev, [key]: e.target.files?.[0] ?? null }))
                        }
                      />
                    ) : (
                      <input
                        className="sb-input"
                        value={dynamicText[key] ?? ''}
                        onChange={(e) =>
                          setDynamicText((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder={def.description ?? key}
                      />
                    )}
                  </label>
                ))}
            </div>
          </>
        ) : (
          <p className="sb-muted">템플릿을 선택하면 입력 항목이 표시됩니다.</p>
        )}
      </section>

      <form className="sb-panel sb-formWide" onSubmit={applyCover}>
        <h3 className="sb-panelTitle">3. 표지 적용</h3>
        <p className="sb-panelNote">
          표지를 적용하면 다시는 수정할 수 없습니다.
        </p>
        <button type="submit" className="sb-btn sb-btnPrimary" disabled={busy}>
          표지 적용하기
        </button>
        {statusMsg ? <p className="sb-formMsg">{statusMsg}</p> : null}
      </form>

      {confirmApplyModalOpen ? (
        <div className="sb-modalBackdrop" role="presentation">
          <div
            className="sb-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="yearbook-cover-confirm-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="yearbook-cover-confirm-title" className="sb-panelTitle">
              표지를 적용할까요?
            </h2>
            <p className="sb-panelNote">
              표지를 적용하면 <strong>다시는 수정할 수 없습니다.</strong>
            </p>
            <div className="sb-modalActions">
              <button type="button" className="sb-btn sb-btnSecondary" disabled={busy} onClick={() => setConfirmApplyModalOpen(false)}>
                취소
              </button>
              <button type="button" className="sb-btn sb-btnPrimary" disabled={busy} onClick={() => void executeApplyCover()}>
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
