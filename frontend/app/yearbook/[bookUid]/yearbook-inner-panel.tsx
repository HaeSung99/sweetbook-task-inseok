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

/** 내지 적용 API에 넣을 templateUid */
function templateUidForCoverRequest(item: TemplateListItem): string {
  return item.templateUid;
}

/** 템플릿 파라미터가 파일 업로드형인지 */
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

const MIN_INNER_PAGES = 24;
const MAX_INNER_PAGES = 120;

/** localStorage — 이 책 표지 적용 여부(내지 진행 조건) */
function storageCoverKey(bookUid: string) {
  return `yearbook:${bookUid}:coverApplied`;
}

/** localStorage — 이 책에 적용한 내지 장 수 */
function storageInnerCountKey(bookUid: string) {
  return `yearbook:${bookUid}:innerAppliedCount`;
}

type Props = {
  bookUid: string;
  loginRedirectPath: string;
};

/**
 * 내지 — 표지 적용 후 순차 적용(한 번 적용한 장은 수정 불가 가정), 최소 24장·최대 120장(표지 제외)
 */
export function YearbookInnerPanel({ bookUid, loginRedirectPath }: Props) {
  const router = useRouter();

  const [bookLoading, setBookLoading] = useState(true);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState<string | null>(null);
  /** SweetBook `data.status` 소문자: draft | finalized | deleted */
  const [bookStatus, setBookStatus] = useState<string | null>(null);

  const [innerAppliedCount, setInnerAppliedCount] = useState(0);
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
  const [appliedModalOpen, setAppliedModalOpen] = useState(false);
  const [confirmApplyModalOpen, setConfirmApplyModalOpen] = useState(false);
  const [finalizeBusy, setFinalizeBusy] = useState(false);
  const [finalizeMsg, setFinalizeMsg] = useState<string | null>(null);
  const [finalizeSuccessModalOpen, setFinalizeSuccessModalOpen] = useState(false);

  const redirectLogin = `/login?redirect=${encodeURIComponent(loginRedirectPath)}`;

  const nextPageIndex = innerAppliedCount + 1;
  const atMaxPages = innerAppliedCount >= MAX_INNER_PAGES;
  const finalizedOrDeleted = bookStatus === 'finalized' || bookStatus === 'deleted';

  useEffect(() => {
    if (typeof window === 'undefined' || !bookUid) return;
    setCoverAppliedLocal(window.localStorage.getItem(storageCoverKey(bookUid)) === '1');
    const n = parseInt(window.localStorage.getItem(storageInnerCountKey(bookUid)) ?? '0', 10);
    setInnerAppliedCount(Number.isFinite(n) && n >= 0 ? n : 0);
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
          `/yearbook/layout-templates?kind=${encodeURIComponent('content')}`,
        );
        if (cancelled) return;
        const list = data.success && Array.isArray(data.items) ? data.items : [];
        setTemplates(list);
        if (list.length === 0) {
          setTemplatesError('내지 레이아웃이 없습니다. 관리자 페이지에서 템플릿 UID를 등록해 주세요.');
        }
      } catch {
        if (!cancelled) setTemplatesError('템플릿 목록을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetFormToEmptyPage() {
    setSelected(null);
    setDefinitions(null);
    setDefsTemplateUid(null);
    setLoadedTemplateName(null);
    setDetailError(null);
    setDynamicText({});
    setDynamicFiles({});
    setStatusMsg(null);
  }

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

  async function applyInner(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg(null);
    if (!bookUid) {
      setStatusMsg('책 식별자가 없습니다.');
      return;
    }
    if (!coverAppliedLocal) {
      setStatusMsg('먼저 표지 단계에서 표지를 적용해 주세요.');
      return;
    }
    if (atMaxPages) {
      setStatusMsg(`내지는 표지 제외 최대 ${MAX_INNER_PAGES}장까지 추가할 수 있습니다.`);
      return;
    }
    if (!selected || !definitions || defsTemplateUid !== selected.templateUid) {
      setStatusMsg('내지 레이아웃을 선택하고 입력 항목을 불러왔는지 확인해 주세요.');
      return;
    }
    for (const [key, def] of Object.entries(definitions)) {
      if (isFileBinding(def)) {
        if (def.required && !dynamicFiles[key]) {
          setStatusMsg(`필수 이미지: ${key}`);
          return;
        }
      } else if (def.required && !(dynamicText[key]?.trim())) {
        setStatusMsg(`필수 입력: ${key}`);
        return;
      }
    }
    setConfirmApplyModalOpen(true);
  }

  async function executeApplyInner() {
    setConfirmApplyModalOpen(false);
    if (!selected || !definitions || defsTemplateUid !== selected.templateUid) {
      setStatusMsg('내지 레이아웃을 다시 선택해 주세요.');
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
      const q = new URLSearchParams();
      q.set('breakBefore', 'page');
      await api.post(`/yearbook/books/${encodeURIComponent(bookUid)}/contents?${q.toString()}`, fd);
      const next = innerAppliedCount + 1;
      setInnerAppliedCount(next);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageInnerCountKey(bookUid), String(next));
      }
      resetFormToEmptyPage();
      setAppliedModalOpen(true);
    } catch {
      setStatusMsg('요청 중 오류가 났습니다. 네트워크·필수 항목·최종화 여부를 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function finalizeBook() {
    setFinalizeBusy(true);
    setFinalizeMsg(null);
    try {
      const { data: res } = await api.post<{ success: boolean; message?: string }>(
        `/yearbook/books/${encodeURIComponent(bookUid)}/finalize`,
      );
      if (!res.success) {
        setFinalizeMsg(res.message ?? '최종화에 실패했습니다.');
      } else {
        setBookStatus('finalized');
        setFinalizeSuccessModalOpen(true);
      }
    } catch {
      setFinalizeMsg('최종화 요청 중 오류가 났습니다.');
    } finally {
      setFinalizeBusy(false);
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
          <Link href="/yearbook">학급 포토북 목록으로</Link>
        </p>
      </>
    );
  }

  if (finalizeSuccessModalOpen) {
    return (
      <div className="sb-modalBackdrop" role="presentation">
        <div
          className="sb-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="yearbook-finalize-success-title"
          onClick={(ev) => ev.stopPropagation()}
        >
          <h2 id="yearbook-finalize-success-title" className="sb-panelTitle">
            최종화에 성공했습니다
          </h2>
          <p className="sb-panelNote">내 학급 포토북 목록에서 완성된 책을 확인할 수 있습니다.</p>
          <div className="sb-modalActions">
            <button
              type="button"
              className="sb-btn sb-btnPrimary"
              onClick={() => {
                setFinalizeSuccessModalOpen(false);
                router.push('/yearbook');
              }}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (finalizedOrDeleted) {
    return (
      <section className="sb-panel">
        <p className="sb-error">
          {bookStatus === 'deleted'
            ? '삭제된 책은 내지를 편집할 수 없습니다.'
            : 'SweetBook에서 최종화된 책은 표지·내지를 더 이상 수정할 수 없습니다.'}
        </p>
      </section>
    );
  }

  if (!coverAppliedLocal) {
    return (
      <section className="sb-panel">
        <h2 className="sb-panelTitle">내지</h2>
        <p className="sb-panelNote">
          표지를 먼저 적용한 뒤에 내지를 채울 수 있습니다. 내지는 한 장씩 적용하며, 적용한 장은 다시 수정할 수 없습니다.
        </p>
      </section>
    );
  }

  return (
    <>
      <div className="sb-pageHead">
        <h2 className="sb-pageTitle" style={{ fontSize: '1.35rem' }}>
          내지 ({nextPageIndex}번째 장)
        </h2>
        <p className="sb-pageLead">
          <strong>{bookTitle ?? bookUid}</strong> — 표지 제외 내지는 <strong>최소 {MIN_INNER_PAGES}장 · 최대 {MAX_INNER_PAGES}장</strong>까지 추가할 수
          있습니다. 레이아웃을 고른 뒤 내용을 채우고 「이 장 적용하기」를 누르면 다음 빈 장으로 넘어갑니다.{' '}
          <span className="sb-muted">이미 적용한 장은 수정할 수 없습니다.</span>
        </p>
        <p className="sb-fieldHint">
          적용 완료: <strong>{innerAppliedCount}</strong>장 / 목표 최소 {MIN_INNER_PAGES}장
          {innerAppliedCount >= MIN_INNER_PAGES ? (
            <span className="sb-formMsg" style={{ marginLeft: 8 }}>
              최소 장 수를 충족했습니다. 필요하면 최대 {MAX_INNER_PAGES}장까지 이어서 추가하세요.
            </span>
          ) : null}
        </p>
        {innerAppliedCount >= MIN_INNER_PAGES ? (
          <div className="sb-modalActions" style={{ marginTop: 8 }}>
            <button type="button" className="sb-btn sb-btnPrimary" disabled={finalizeBusy} onClick={() => void finalizeBook()}>
              {finalizeBusy ? '최종화 중…' : '포토북 최종화 하기'}
            </button>
          </div>
        ) : null}
        {finalizeMsg ? <p className="sb-formMsg">{finalizeMsg}</p> : null}
      </div>

      {atMaxPages ? (
        <section className="sb-panel">
          <p className="sb-formMsg">내지가 최대 장수({MAX_INNER_PAGES}장)에 도달했습니다. 더 이상 추가할 수 없습니다.</p>
        </section>
      ) : null}

      {!atMaxPages ? (
        <>
          <section className="sb-panel">
            <h3 className="sb-panelTitle">1. 내지 레이아웃 선택</h3>
            <p className="sb-panelNote">
              <strong> 레이아웃을 눌러 고르세요. </strong>
            </p>
            {templatesLoading ? <p className="sb-muted">목록 불러오는 중…</p> : null}
            {templatesError ? <p className="sb-error">{templatesError}</p> : null}
            {!templatesLoading && templates.length > 0 ? (
              <div className="sb-templateGrid">
                {templates.map((t) => {
                  const active = selected?.templateUid === t.templateUid;
                  const thumb = pickTemplateLayoutThumbnail(t);
                  const label = t.templateName ?? '내지 레이아웃';
                  return (
                    <button
                      key={t.templateUid}
                      type="button"
                      className={`sb-templateCard ${active ? 'isActive' : ''}`}
                      onClick={() => onPickTemplate(t)}
                      aria-pressed={active}
                      aria-label={`${label} 선택`}
                    >
                      <div className="sb-templateThumb">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="sb-templateImg" loading="lazy" />
                        ) : (
                          <span className="sb-templateNoImg">미리보기 없음</span>
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
                  <p className="sb-muted">
                    이 템플릿은 큰 미리보기 이미지 URL이 없습니다. 위 작은 썸네일과 이름을 참고해 주세요.
                  </p>
                )}
                <p className="sb-coverLayoutPreviewCaption">
                  {selected.templateName ?? selected.templateUid}
                  {selected.theme ? <span className="sb-templateTheme"> · {selected.theme}</span> : null}
                </p>
              </div>
            ) : null}
          </section>

          <section className={`sb-panel ${!selected ? 'sb-panelDisabled' : ''}`}>
            <h3 className="sb-panelTitle">2. 이 장에 넣을 내용</h3>
            {!selected ? (
              <p className="sb-panelNote">위에서 레이아웃을 선택해 주세요.</p>
            ) : detailLoading ? (
              <p className="sb-muted">템플릿 상세 불러오는 중…</p>
            ) : detailError ? (
              <p className="sb-error">{detailError}</p>
            ) : definitions && defsTemplateUid === selected.templateUid ? (
              <div className="sb-dynamicForm">
                <p className="sb-fieldHint">
                  선택: <strong>{loadedTemplateName ?? selected.templateName}</strong>
                </p>
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
            ) : (
              <p className="sb-muted">레이아웃을 선택하면 입력 항목이 표시됩니다.</p>
            )}
          </section>

          <form className="sb-panel sb-formWide" onSubmit={applyInner}>
            <h3 className="sb-panelTitle">3. 이 장 적용하기</h3>
            <p className="sb-panelNote">
              적용 후에는 이 장을 수정할 수 없으며, 다음 장을 채울 때마다 입력란이 비어 있는 새 내지 화면으로 돌아갑니다.
            </p>
            <button
              type="submit"
              className="sb-btn sb-btnPrimary"
              disabled={
                busy ||
                !selected ||
                !definitions ||
                defsTemplateUid !== selected.templateUid ||
                detailLoading ||
                atMaxPages
              }
            >
              {busy ? '처리 중…' : `이 장 적용하기 (${nextPageIndex}번째)`}
            </button>
            {statusMsg ? <p className="sb-error">{statusMsg}</p> : null}
          </form>
        </>
      ) : null}

      {confirmApplyModalOpen ? (
        <div className="sb-modalBackdrop" role="presentation">
          <div
            className="sb-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="yearbook-inner-confirm-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="yearbook-inner-confirm-title" className="sb-panelTitle">
              이 장을 적용할까요?
            </h2>
            <p className="sb-panelNote">
              적용하면 <strong>이 장은 다시 수정할 수 없습니다.</strong>
            </p>
            <div className="sb-modalActions">
              <button type="button" className="sb-btn sb-btnSecondary" disabled={busy} onClick={() => setConfirmApplyModalOpen(false)}>
                취소
              </button>
              <button type="button" className="sb-btn sb-btnPrimary" disabled={busy} onClick={() => void executeApplyInner()}>
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {appliedModalOpen ? (
        <div className="sb-modalBackdrop" role="presentation">
          <div
            className="sb-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="yearbook-inner-applied-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="yearbook-inner-applied-title" className="sb-panelTitle">
              적용되었습니다
            </h2>
            <p className="sb-panelNote">
              {innerAppliedCount >= MAX_INNER_PAGES
                ? '마지막 장까지 모두 적용했습니다.'
                : `내지 ${innerAppliedCount}장까지 반영되었습니다. 다음 장을 채우려면 레이아웃을 다시 선택하세요.`}
            </p>
            <div className="sb-modalActions">
              <button type="button" className="sb-btn sb-btnPrimary" onClick={() => setAppliedModalOpen(false)}>
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
