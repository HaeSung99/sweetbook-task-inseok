'use client';

import axios, { isAxiosError } from 'axios';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getStoredToken } from '@/lib/api';

const FIXED_BOOK_SPEC_UID = 'PHOTOBOOK_A5_SC';

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

function isFileBinding(def: TemplateParamDefinition): boolean {
  return (def.binding ?? '').toLowerCase() === 'file';
}

type TestResult = {
  status: 'idle' | 'success' | 'error';
  message: string;
  payload?: unknown;
};

const initialResult: TestResult = { status: 'idle', message: '아직 호출 전' };

function normalizeError(error: unknown) {
  if (isAxiosError(error)) {
    return {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    };
  }
  return error;
}

function FieldTag({ kind }: { kind: 'required' | 'optional' }) {
  return (
    <span className={kind === 'required' ? 'fieldTag fieldTagReq' : 'fieldTag fieldTagOpt'}>
      {kind === 'required' ? '필수' : '선택'}
    </span>
  );
}

const defaultEstimateJson = `{
  "items": [{ "bookUid": "bk_여기에_UID", "quantity": 1 }],
  "shipping": {
    "recipientName": "홍길동",
    "recipientPhone": "010-1234-5678",
    "postalCode": "06101",
    "address1": "서울시 강남구 테헤란로 123",
    "address2": "401호"
  }
}`;

const defaultOrderJson = defaultEstimateJson;

export default function TestPage() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
  /** 이 Nest 서버에 붙일 때의 전체 URL (브라우저/포스트맨에 그대로 복사) */
  function nest(path: string) {
    return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  const [loadingTarget, setLoadingTarget] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<TestResult>(initialResult);

  const [bookSpecsListResult, setBookSpecsListResult] = useState<TestResult>(initialResult);
  const [bookSpecDetailResult, setBookSpecDetailResult] = useState<TestResult>(initialResult);
  const [specUidLookup, setSpecUidLookup] = useState('');

  const [templateCategoriesResult, setTemplateCategoriesResult] = useState<TestResult>(initialResult);
  const [templateListResult, setTemplateListResult] = useState<TestResult>(initialResult);
  const [templateDetailResult, setTemplateDetailResult] = useState<TestResult>(initialResult);
  const [templateListQuery, setTemplateListQuery] = useState({
    limit: '50',
    offset: '',
    category: '',
    /** cover = 표지, content = 내지 — 목록에서만 고름 (bookSpecUid는 고정) */
    templateKind: 'cover' as 'cover' | 'content',
  });
  const [templateUidLookup, setTemplateUidLookup] = useState('');

  const [booksListResult, setBooksListResult] = useState<TestResult>(initialResult);
  /** SweetBook GET /v1/books 쿼리 — 문서 예시와 동일하게 기본값 */
  const [booksListQuery, setBooksListQuery] = useState({
    pdfStatusIn: '1,2',
    createdFrom: '2026-01-01',
    createdTo: '2026-03-31',
    limit: '10',
  });
  const [createBookResult, setCreateBookResult] = useState<TestResult>(initialResult);
  const [coverResult, setCoverResult] = useState<TestResult>(initialResult);
  const [contentsResult, setContentsResult] = useState<TestResult>(initialResult);
  const [finalizeResult, setFinalizeResult] = useState<TestResult>(initialResult);

  const [ordersListResult, setOrdersListResult] = useState<TestResult>(initialResult);
  const [orderDetailResult, setOrderDetailResult] = useState<TestResult>(initialResult);
  const [estimateResult, setEstimateResult] = useState<TestResult>(initialResult);
  const [createOrderResult, setCreateOrderResult] = useState<TestResult>(initialResult);
  const [cancelResult, setCancelResult] = useState<TestResult>(initialResult);

  const [createForm, setCreateForm] = useState({
    title: '',
    bookSpecUid: FIXED_BOOK_SPEC_UID,
    creationType: '',
    externalRef: '',
    specProfileUid: '',
  });

  const [partnerBooksResult, setPartnerBooksResult] = useState<TestResult>(initialResult);
  const [partnerCreateTitle, setPartnerCreateTitle] = useState('테스트 학급 포토북');
  const [partnerCreateResult, setPartnerCreateResult] = useState<TestResult>(initialResult);

  const [bookUid, setBookUid] = useState('');
  const [coverForm, setCoverForm] = useState({
    templateUid: '',
    /** 스펙 미로드 시에만 multipart parameters JSON으로 전송 */
    parametersManual: '',
  });
  const [coverTemplateDefs, setCoverTemplateDefs] = useState<Record<string, TemplateParamDefinition> | null>(
    null,
  );
  const [coverDefsTemplateUid, setCoverDefsTemplateUid] = useState<string | null>(null);
  const [coverLoadedTemplateName, setCoverLoadedTemplateName] = useState<string | null>(null);
  const [coverDynamicText, setCoverDynamicText] = useState<Record<string, string>>({});
  const [coverDynamicFiles, setCoverDynamicFiles] = useState<Record<string, File | null>>({});
  const [coverSpecHint, setCoverSpecHint] = useState<string | null>(null);

  /** 프로젝트 기본: 빈 내지 템플릿 */
  const [contentsForm, setContentsForm] = useState({
    templateUid: '3x6m83dbZ2CJ',
    parametersManual: '',
    breakBefore: 'page',
  });
  const [contentsTemplateDefs, setContentsTemplateDefs] = useState<Record<
    string,
    TemplateParamDefinition
  > | null>(null);
  const [contentsDefsTemplateUid, setContentsDefsTemplateUid] = useState<string | null>(null);
  const [contentsLoadedTemplateName, setContentsLoadedTemplateName] = useState<string | null>(null);
  const [contentsDynamicText, setContentsDynamicText] = useState<Record<string, string>>({});
  const [contentsDynamicFiles, setContentsDynamicFiles] = useState<Record<string, File | null>>({});
  const [contentsSpecHint, setContentsSpecHint] = useState<string | null>(null);

  const [orderUid, setOrderUid] = useState('');
  const [estimateJson, setEstimateJson] = useState(defaultEstimateJson);
  const [orderJson, setOrderJson] = useState(defaultOrderJson);
  const [cancelReason, setCancelReason] = useState('테스트 취소');

  const coverParametersPreview = useMemo(() => {
    if (!coverTemplateDefs || coverDefsTemplateUid !== coverForm.templateUid.trim()) return '';
    const o: Record<string, string> = {};
    for (const [key, def] of Object.entries(coverTemplateDefs)) {
      if (!isFileBinding(def)) o[key] = coverDynamicText[key] ?? '';
    }
    return JSON.stringify(o, null, 2);
  }, [coverTemplateDefs, coverDefsTemplateUid, coverForm.templateUid, coverDynamicText]);

  const contentsParametersPreview = useMemo(() => {
    if (!contentsTemplateDefs || contentsDefsTemplateUid !== contentsForm.templateUid.trim()) return '';
    const o: Record<string, string> = {};
    for (const [key, def] of Object.entries(contentsTemplateDefs)) {
      if (!isFileBinding(def)) o[key] = contentsDynamicText[key] ?? '';
    }
    return JSON.stringify(o, null, 2);
  }, [contentsTemplateDefs, contentsDefsTemplateUid, contentsForm.templateUid, contentsDynamicText]);

  const runGet = async (key: string, url: string, setResult: (r: TestResult) => void) => {
    setLoadingTarget(key);
    try {
      const response = await axios.get(`${apiBaseUrl}${url}`);
      setResult({
        status: response.data?.success === false ? 'error' : 'success',
        message:
          response.data?.success === false
            ? (response.data?.message ?? '응답 success=false')
            : '호출 성공',
        payload: response.data,
      });
    } catch (error) {
      setResult({
        status: 'error',
        message: 'HTTP 오류 또는 네트워크 실패',
        payload: normalizeError(error),
      });
    } finally {
      setLoadingTarget(null);
    }
  };

  const runPostJson = async (
    key: string,
    url: string,
    body: unknown,
    setResult: (r: TestResult) => void,
  ) => {
    setLoadingTarget(key);
    try {
      const response = await axios.post(`${apiBaseUrl}${url}`, body, {
        headers: { 'Content-Type': 'application/json' },
      });
      setResult({
        status: response.data?.success === false ? 'error' : 'success',
        message:
          response.data?.success === false
            ? (response.data?.message ?? '응답 success=false')
            : '호출 성공',
        payload: response.data,
      });
    } catch (error) {
      setResult({
        status: 'error',
        message: 'HTTP 오류 또는 네트워크 실패',
        payload: normalizeError(error),
      });
    } finally {
      setLoadingTarget(null);
    }
  };

  const runCreateBook = () => {
    if (!createForm.title.trim()) {
      setCreateBookResult({ status: 'error', message: 'title은 필수입니다.' });
      return;
    }
    const spec = createForm.bookSpecUid.trim() || FIXED_BOOK_SPEC_UID;
    const body: Record<string, string> = {
      title: createForm.title.trim(),
      bookSpecUid: spec,
    };
    if (createForm.creationType.trim()) body.creationType = createForm.creationType.trim();
    if (createForm.externalRef.trim()) body.externalRef = createForm.externalRef.trim();
    if (createForm.specProfileUid.trim()) body.specProfileUid = createForm.specProfileUid.trim();
    runPostJson('createBook', '/test/sweetbook/books', body, setCreateBookResult);
  };

  const runPartnerYearbookList = async () => {
    const token = getStoredToken();
    if (!token) {
      setPartnerBooksResult({
        status: 'error',
        message: 'Bearer 토큰이 없습니다. /login 에서 로그인한 뒤 다시 시도하세요.',
      });
      return;
    }
    setLoadingTarget('partnerYearbookList');
    try {
      const response = await axios.get(`${apiBaseUrl}/yearbook/books`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPartnerBooksResult({
        status: response.data?.success === false ? 'error' : 'success',
        message:
          response.data?.success === false
            ? (response.data?.message ?? '응답 success=false')
            : '호출 성공',
        payload: response.data,
      });
    } catch (error) {
      setPartnerBooksResult({
        status: 'error',
        message: 'HTTP 오류 또는 네트워크 실패',
        payload: normalizeError(error),
      });
    } finally {
      setLoadingTarget(null);
    }
  };

  const runPartnerYearbookCreate = async () => {
    const token = getStoredToken();
    if (!token) {
      setPartnerCreateResult({
        status: 'error',
        message: 'Bearer 토큰이 없습니다. /login 에서 로그인한 뒤 다시 시도하세요.',
      });
      return;
    }
    const title = partnerCreateTitle.trim();
    if (!title) {
      setPartnerCreateResult({ status: 'error', message: 'title을 입력하세요.' });
      return;
    }
    setLoadingTarget('partnerYearbookCreate');
    try {
      const response = await axios.post(
        `${apiBaseUrl}/yearbook/books`,
        { title },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      setPartnerCreateResult({
        status: response.data?.success === false ? 'error' : 'success',
        message:
          response.data?.success === false
            ? (response.data?.message ?? '응답 success=false')
            : '호출 성공 — 학급 포토북 목록에서 표지·내지 편집으로 표지 작업',
        payload: response.data,
      });
    } catch (error) {
      setPartnerCreateResult({
        status: 'error',
        message: 'HTTP 오류 또는 네트워크 실패',
        payload: normalizeError(error),
      });
    } finally {
      setLoadingTarget(null);
    }
  };

  const runFinalize = () => {
    if (!bookUid.trim()) {
      setFinalizeResult({ status: 'error', message: 'bookUid를 입력하세요' });
      return;
    }
    runPostJson(
      'finalize',
      `/test/sweetbook/books/${encodeURIComponent(bookUid.trim())}/finalization`,
      {},
      setFinalizeResult,
    );
  };

  const loadCoverTemplateSpec = async () => {
    const uid = coverForm.templateUid.trim();
    if (!uid) {
      setCoverSpecHint('templateUid를 먼저 입력하세요.');
      return;
    }
    setLoadingTarget('coverTemplateSpec');
    setCoverSpecHint(null);
    try {
      const response = await axios.get(
        `${apiBaseUrl}/test/sweetbook/templates/${encodeURIComponent(uid)}`,
      );
      if (response.data?.success === false) {
        setCoverTemplateDefs(null);
        setCoverDefsTemplateUid(null);
        setCoverLoadedTemplateName(null);
        setCoverSpecHint(response.data?.message ?? '템플릿 조회 실패');
        return;
      }
      const detail = response.data as LayoutTemplateDetailPayload;
      const definitions = detail.response?.data?.parameters?.definitions;
      if (!definitions || typeof definitions !== 'object') {
        setCoverTemplateDefs(null);
        setCoverDefsTemplateUid(null);
        setCoverLoadedTemplateName(null);
        setCoverSpecHint('응답에 parameters.definitions가 없습니다.');
        return;
      }
      const templateName = detail.response?.data?.templateName;
      setCoverTemplateDefs(definitions);
      setCoverDefsTemplateUid(uid);
      setCoverLoadedTemplateName(templateName ?? null);
      const text: Record<string, string> = {};
      const files: Record<string, File | null> = {};
      for (const key of Object.keys(definitions)) {
        if (isFileBinding(definitions[key])) files[key] = null;
        else text[key] = '';
      }
      setCoverDynamicText(text);
      setCoverDynamicFiles(files);
      setCoverSpecHint(
        `불러옴: ${templateName ?? uid} · ${Object.keys(definitions).length}개 파라미터`,
      );
    } catch (error) {
      setCoverTemplateDefs(null);
      setCoverDefsTemplateUid(null);
      setCoverLoadedTemplateName(null);
      setCoverSpecHint('HTTP 오류 또는 네트워크 실패');
    } finally {
      setLoadingTarget(null);
    }
  };

  const loadContentsTemplateSpec = async () => {
    const uid = contentsForm.templateUid.trim();
    if (!uid) {
      setContentsSpecHint('templateUid를 먼저 입력하세요.');
      return;
    }
    setLoadingTarget('contentsTemplateSpec');
    setContentsSpecHint(null);
    try {
      const response = await axios.get(
        `${apiBaseUrl}/test/sweetbook/templates/${encodeURIComponent(uid)}`,
      );
      if (response.data?.success === false) {
        setContentsTemplateDefs(null);
        setContentsDefsTemplateUid(null);
        setContentsLoadedTemplateName(null);
        setContentsSpecHint(response.data?.message ?? '템플릿 조회 실패');
        return;
      }
      const detail = response.data as LayoutTemplateDetailPayload;
      const definitions = detail.response?.data?.parameters?.definitions;
      if (!definitions || typeof definitions !== 'object') {
        setContentsTemplateDefs(null);
        setContentsDefsTemplateUid(null);
        setContentsLoadedTemplateName(null);
        setContentsSpecHint('응답에 parameters.definitions가 없습니다.');
        return;
      }
      const templateName = detail.response?.data?.templateName;
      setContentsTemplateDefs(definitions);
      setContentsDefsTemplateUid(uid);
      setContentsLoadedTemplateName(templateName ?? null);
      const text: Record<string, string> = {};
      const files: Record<string, File | null> = {};
      for (const key of Object.keys(definitions)) {
        if (isFileBinding(definitions[key])) files[key] = null;
        else text[key] = '';
      }
      setContentsDynamicText(text);
      setContentsDynamicFiles(files);
      setContentsSpecHint(
        `불러옴: ${templateName ?? uid} · ${Object.keys(definitions).length}개 파라미터`,
      );
    } catch (error) {
      setContentsTemplateDefs(null);
      setContentsDefsTemplateUid(null);
      setContentsLoadedTemplateName(null);
      setContentsSpecHint('HTTP 오류 또는 네트워크 실패');
    } finally {
      setLoadingTarget(null);
    }
  };

  const runCover = async () => {
    if (!bookUid.trim()) {
      setCoverResult({
        status: 'error',
        message: 'URL 경로에 들어가는 bookUid를 입력하세요 (POST /v1/books/{bookUid}/cover).',
      });
      return;
    }
    if (!coverForm.templateUid.trim()) {
      setCoverResult({ status: 'error', message: 'templateUid는 필수입니다. 템플릿 목록·상세에서 확인하세요.' });
      return;
    }
    const uid = coverForm.templateUid.trim();
    const useDynamic =
      coverTemplateDefs &&
      coverDefsTemplateUid === uid &&
      Object.keys(coverTemplateDefs).length > 0;

    if (useDynamic && coverTemplateDefs) {
      for (const [key, def] of Object.entries(coverTemplateDefs)) {
        if (isFileBinding(def) && def.required && !coverDynamicFiles[key]) {
          setCoverResult({
            status: 'error',
            message: `필수 이미지 파라미터 '${key}'에 파일을 선택하세요.`,
          });
          return;
        }
        if (!isFileBinding(def) && def.required && !(coverDynamicText[key]?.trim())) {
          setCoverResult({
            status: 'error',
            message: `필수 텍스트 파라미터 '${key}'를 입력하세요.`,
          });
          return;
        }
      }
    }

    setLoadingTarget('cover');
    try {
      const fd = new FormData();
      fd.append('templateUid', uid);
      if (useDynamic && coverTemplateDefs) {
        const textOnly: Record<string, string> = {};
        for (const [key, def] of Object.entries(coverTemplateDefs)) {
          if (!isFileBinding(def)) textOnly[key] = coverDynamicText[key] ?? '';
        }
        fd.append('parameters', JSON.stringify(textOnly));
        for (const [key, def] of Object.entries(coverTemplateDefs)) {
          if (isFileBinding(def)) {
            const f = coverDynamicFiles[key];
            if (f) fd.append(key, f);
          }
        }
      } else if (coverForm.parametersManual.trim()) {
        fd.append('parameters', coverForm.parametersManual.trim());
      }

      const response = await axios.post(
        `${apiBaseUrl}/test/sweetbook/books/${encodeURIComponent(bookUid.trim())}/cover`,
        fd,
      );
      setCoverResult({
        status: response.data?.success === false ? 'error' : 'success',
        message:
          response.data?.success === false
            ? (response.data?.message ?? '응답 success=false')
            : '호출 성공',
        payload: response.data,
      });
    } catch (error) {
      setCoverResult({
        status: 'error',
        message: 'HTTP 오류 또는 네트워크 실패',
        payload: normalizeError(error),
      });
    } finally {
      setLoadingTarget(null);
    }
  };

  const runContents = async () => {
    if (!bookUid.trim()) {
      setContentsResult({ status: 'error', message: 'bookUid를 입력하세요' });
      return;
    }
    if (!contentsForm.templateUid.trim()) {
      setContentsResult({ status: 'error', message: '내지 templateUid를 입력하세요 (템플릿 API에서 확인)' });
      return;
    }
    const uid = contentsForm.templateUid.trim();
    const useDynamic =
      contentsTemplateDefs &&
      contentsDefsTemplateUid === uid &&
      Object.keys(contentsTemplateDefs).length > 0;

    if (useDynamic && contentsTemplateDefs) {
      for (const [key, def] of Object.entries(contentsTemplateDefs)) {
        if (isFileBinding(def) && def.required && !contentsDynamicFiles[key]) {
          setContentsResult({
            status: 'error',
            message: `필수 이미지 파라미터 '${key}'에 파일을 선택하세요.`,
          });
          return;
        }
        if (!isFileBinding(def) && def.required && !(contentsDynamicText[key]?.trim())) {
          setContentsResult({
            status: 'error',
            message: `필수 텍스트 파라미터 '${key}'를 입력하세요.`,
          });
          return;
        }
      }
    }

    setLoadingTarget('contents');
    try {
      const fd = new FormData();
      fd.append('templateUid', uid);
      if (useDynamic && contentsTemplateDefs) {
        const textOnly: Record<string, string> = {};
        for (const [key, def] of Object.entries(contentsTemplateDefs)) {
          if (!isFileBinding(def)) textOnly[key] = contentsDynamicText[key] ?? '';
        }
        fd.append('parameters', JSON.stringify(textOnly));
        for (const [key, def] of Object.entries(contentsTemplateDefs)) {
          if (isFileBinding(def)) {
            const f = contentsDynamicFiles[key];
            if (f) fd.append(key, f);
          }
        }
      } else if (contentsForm.parametersManual.trim()) {
        fd.append('parameters', contentsForm.parametersManual.trim());
      }

      const q = contentsForm.breakBefore.trim()
        ? `?breakBefore=${encodeURIComponent(contentsForm.breakBefore.trim())}`
        : '';
      const response = await axios.post(
        `${apiBaseUrl}/test/sweetbook/books/${encodeURIComponent(bookUid.trim())}/contents${q}`,
        fd,
      );
      setContentsResult({
        status: response.data?.success === false ? 'error' : 'success',
        message:
          response.data?.success === false
            ? (response.data?.message ?? '응답 success=false')
            : '호출 성공',
        payload: response.data,
      });
    } catch (error) {
      setContentsResult({
        status: 'error',
        message: 'HTTP 오류 또는 네트워크 실패',
        payload: normalizeError(error),
      });
    } finally {
      setLoadingTarget(null);
    }
  };

  const runEstimate = () => {
    try {
      const body = JSON.parse(estimateJson) as unknown;
      runPostJson('estimate', '/test/sweetbook/orders/estimate', body, setEstimateResult);
    } catch {
      setEstimateResult({ status: 'error', message: 'JSON 파싱 실패', payload: null });
    }
  };

  const runCreateOrder = () => {
    try {
      const body = JSON.parse(orderJson) as unknown;
      runPostJson('createOrder', '/test/sweetbook/orders', body, setCreateOrderResult);
    } catch {
      setCreateOrderResult({ status: 'error', message: 'JSON 파싱 실패', payload: null });
    }
  };

  const runOrderDetail = () => {
    if (!orderUid.trim()) {
      setOrderDetailResult({ status: 'error', message: 'orderUid를 입력하세요' });
      return;
    }
    runGet(
      'orderDetail',
      `/test/sweetbook/orders/${encodeURIComponent(orderUid.trim())}`,
      setOrderDetailResult,
    );
  };

  const runCancel = () => {
    if (!orderUid.trim()) {
      setCancelResult({ status: 'error', message: 'orderUid를 입력하세요' });
      return;
    }
    runPostJson(
      'cancel',
      `/test/sweetbook/orders/${encodeURIComponent(orderUid.trim())}/cancel`,
      { cancelReason: cancelReason.trim() || '취소' },
      setCancelResult,
    );
  };

  const buildTemplatesListUrl = () => {
    const q = new URLSearchParams();
    q.set('bookSpecUid', FIXED_BOOK_SPEC_UID);
    q.set('templateKind', templateListQuery.templateKind);
    if (templateListQuery.limit.trim()) q.set('limit', templateListQuery.limit.trim());
    if (templateListQuery.offset.trim()) q.set('offset', templateListQuery.offset.trim());
    if (templateListQuery.category.trim()) q.set('category', templateListQuery.category.trim());
    const s = q.toString();
    return `/test/sweetbook/templates${s ? `?${s}` : ''}`;
  };

  const buildBooksListUrl = () => {
    const q = new URLSearchParams();
    if (booksListQuery.pdfStatusIn.trim()) q.set('pdfStatusIn', booksListQuery.pdfStatusIn.trim());
    if (booksListQuery.createdFrom.trim()) q.set('createdFrom', booksListQuery.createdFrom.trim());
    if (booksListQuery.createdTo.trim()) q.set('createdTo', booksListQuery.createdTo.trim());
    if (booksListQuery.limit.trim()) q.set('limit', booksListQuery.limit.trim());
    const s = q.toString();
    return `/test/sweetbook/books${s ? `?${s}` : ''}`;
  };

  const runBookSpecDetail = () => {
    if (!specUidLookup.trim()) {
      setBookSpecDetailResult({ status: 'error', message: 'specUid(bookSpecUid)를 입력하세요' });
      return;
    }
    runGet(
      'bookSpecDetail',
      `/test/sweetbook/book-specs/${encodeURIComponent(specUidLookup.trim())}`,
      setBookSpecDetailResult,
    );
  };

  const runTemplateDetail = () => {
    if (!templateUidLookup.trim()) {
      setTemplateDetailResult({ status: 'error', message: 'templateUid를 입력하세요' });
      return;
    }
    runGet(
      'templateDetail',
      `/test/sweetbook/templates/${encodeURIComponent(templateUidLookup.trim())}`,
      setTemplateDetailResult,
    );
  };

  return (
    <main className="landing">
      <section className="section">
        <div className="sectionHead">
          <h2>API 테스트 — SweetBook 직접 프록시 + 학급 포토북(파트너)</h2>
          <p className="testIntro">
            <strong>① Raw 프록시</strong> — 아래 카드마다 <strong>첫 줄</strong>은 이 백엔드에 호출하는{' '}
            <strong>전체 URL</strong>(<code>{apiBaseUrl}</code> 기준), <strong>둘째 줄</strong>은 SweetBook Sandbox가
            실제로 받는 <code>/v1/…</code> 경로입니다. 키는 <code>backend/.env</code>의{' '}
            <code>SWEETBOOK_API_KEY</code>입니다. 기본 판형은 <code>{FIXED_BOOK_SPEC_UID}</code>입니다.
          </p>
          <p className="testIntro">
            <strong>② 학급 포토북</strong> — <code>{nest('/yearbook/books')}</code> 등은 JWT가 필요합니다. 앱과 같이{' '}
            <code>POST /yearbook/books</code> 본문은 <code>title</code>만 씁니다. UI는{' '}
            <Link href="/yearbook">학급 포토북 목록</Link> → <strong>표지·내지 편집</strong> → 표지·내지 탭입니다.
          </p>
        </div>

        <div className="testGrid">
          <article className="testCard">
            <h3>Ping</h3>
            <p className="testRoute">
              <code>GET {nest('/test/ping')}</code>
            </p>
            <button
              type="button"
              onClick={() => runGet('ping', '/test/ping', setPingResult)}
              disabled={loadingTarget === 'ping'}
            >
              {loadingTarget === 'ping' ? '…' : 'Ping'}
            </button>
            <p className="testMsg">{pingResult.message}</p>
            <pre>{JSON.stringify(pingResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>파트너 API — GET 학급 포토북 목록</h3>
            <p className="testRoute">
              <code>GET {nest('/yearbook/books')}</code> · <code>Authorization: Bearer …</code>
            </p>
            <p className="testDesc">
              브라우저에 저장된 <code>access_token</code>(로그인 후)으로 호출합니다. 토큰이 없으면 에러 메시지를
              봅니다.
            </p>
            <button
              type="button"
              onClick={runPartnerYearbookList}
              disabled={loadingTarget === 'partnerYearbookList'}
            >
              {loadingTarget === 'partnerYearbookList' ? '…' : '내 학급 포토북 목록'}
            </button>
            <p className="testMsg">{partnerBooksResult.message}</p>
            <pre>{JSON.stringify(partnerBooksResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>파트너 API — POST 학급 포토북 생성</h3>
            <p className="testRoute">
              <code>POST {nest('/yearbook/books')}</code> · <code>Authorization: Bearer …</code> · 본문{' '}
              <code>{`{ "title": "…" }`}</code>
            </p>
            <p className="testDesc">
              표지 적용: <code>POST {`${nest('/yearbook/books')}/:bookUid/cover`}</code> (multipart, 앱 표지 탭과 동일).
            </p>
            <div className="testForm">
              <label>
                title <FieldTag kind="required" />
                <input
                  value={partnerCreateTitle}
                  onChange={(e) => setPartnerCreateTitle(e.target.value)}
                  placeholder="책 제목"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={runPartnerYearbookCreate}
              disabled={loadingTarget === 'partnerYearbookCreate'}
            >
              {loadingTarget === 'partnerYearbookCreate' ? '…' : '학급 포토북 생성'}
            </button>
            <p className="testMsg">{partnerCreateResult.message}</p>
            <pre>{JSON.stringify(partnerCreateResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>BookSpecs — 판형 목록</h3>
            <p className="testDesc">사용 가능한 인쇄 판형 UID 목록(가격·이름 등 요약은 응답 참고).</p>
            <p className="testRoute">
              <code>GET {nest('/test/sweetbook/book-specs')}</code>
            </p>
            <p className="testRouteSweet">SweetBook · <code>GET /v1/book-specs</code></p>
            <button
              type="button"
              onClick={() => runGet('bookSpecsList', '/test/sweetbook/book-specs', setBookSpecsListResult)}
              disabled={loadingTarget === 'bookSpecsList'}
            >
              {loadingTarget === 'bookSpecsList' ? '…' : '판형 목록'}
            </button>
            <p className="testMsg">{bookSpecsListResult.message}</p>
            <pre>{JSON.stringify(bookSpecsListResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>BookSpecs — 판형 상세</h3>
            <p className="testDesc">가격, 레이아웃 크기, 페이지 규칙 등 상세 스펙.</p>
            <p className="testRoute">
              <code>GET {nest('/test/sweetbook/book-specs')}/&#123;specUid&#125;</code>
            </p>
            <p className="testRouteSweet">SweetBook · <code>GET /v1/book-specs/&#123;specUid&#125;</code></p>
            <div className="testForm">
              <label>
                specUid (bookSpecUid) <FieldTag kind="required" />
                <input
                  value={specUidLookup}
                  onChange={(e) => setSpecUidLookup(e.target.value)}
                  placeholder="목록 응답의 uid"
                />
              </label>
            </div>
            <div className="testBtnRow">
              <button
                type="button"
                onClick={runBookSpecDetail}
                disabled={loadingTarget === 'bookSpecDetail'}
              >
                {loadingTarget === 'bookSpecDetail' ? '…' : '상세 조회'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setCreateForm((f) => ({
                    ...f,
                    bookSpecUid: specUidLookup.trim() || f.bookSpecUid,
                  }))
                }
              >
                → 책 생성 bookSpecUid
              </button>
            </div>
            <p className="testMsg">{bookSpecDetailResult.message}</p>
            <pre>{JSON.stringify(bookSpecDetailResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>Templates — 카테고리 목록</h3>
            <p className="testDesc">템플릿이 어떤 분류로 묶여 있는지 먼저 봅니다.</p>
            <p className="testRoute">
              <code>GET {nest('/test/sweetbook/template-categories')}</code>
            </p>
            <p className="testRouteSweet">SweetBook · <code>GET /v1/template-categories</code></p>
            <button
              type="button"
              onClick={() =>
                runGet('templateCategories', '/test/sweetbook/template-categories', setTemplateCategoriesResult)
              }
              disabled={loadingTarget === 'templateCategories'}
            >
              {loadingTarget === 'templateCategories' ? '…' : '카테고리 조회'}
            </button>
            <p className="testMsg">{templateCategoriesResult.message}</p>
            <pre>{JSON.stringify(templateCategoriesResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>Templates — 목록</h3>
            <p className="testDesc">
              <code>bookSpecUid</code>는 <strong>{FIXED_BOOK_SPEC_UID}</strong> 로 고정됩니다.{' '}
              <strong>templateKind</strong>만 표지/내지 중 고르세요. 카테고리 예: <code>etc</code>.
            </p>
            <p className="testRoute">
              <code>GET {nest(buildTemplatesListUrl())}</code>
            </p>
            <p className="testRouteSweet">SweetBook · <code>GET /v1/templates?…</code></p>
            <div className="testForm testFormRow">
              <label>
                templateKind <FieldTag kind="required" />
                <select
                  value={templateListQuery.templateKind}
                  onChange={(e) =>
                    setTemplateListQuery((q) => ({
                      ...q,
                      templateKind: e.target.value as 'cover' | 'content',
                    }))
                  }
                >
                  <option value="cover">cover (표지)</option>
                  <option value="content">content (내지)</option>
                </select>
              </label>
              <label>
                category <FieldTag kind="optional" />
                <input
                  value={templateListQuery.category}
                  onChange={(e) =>
                    setTemplateListQuery((q) => ({ ...q, category: e.target.value }))
                  }
                  placeholder="etc (비우면 미적용)"
                />
              </label>
            </div>
            <div className="testForm testFormRow">
              <label>
                limit <FieldTag kind="optional" />
                <input
                  value={templateListQuery.limit}
                  onChange={(e) =>
                    setTemplateListQuery((q) => ({ ...q, limit: e.target.value }))
                  }
                  placeholder="50"
                />
              </label>
              <label>
                offset <FieldTag kind="optional" />
                <input
                  value={templateListQuery.offset}
                  onChange={(e) =>
                    setTemplateListQuery((q) => ({ ...q, offset: e.target.value }))
                  }
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => runGet('templateList', buildTemplatesListUrl(), setTemplateListResult)}
              disabled={loadingTarget === 'templateList'}
            >
              {loadingTarget === 'templateList' ? '…' : '템플릿 목록'}
            </button>
            <p className="testMsg">{templateListResult.message}</p>
            <pre>{JSON.stringify(templateListResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>Templates — 상세</h3>
            <p className="testDesc">
              변수명·레이아웃 정보를 확인합니다. 아래 버튼으로 표지/내지 입력란에 UID를 복사할 수 있습니다.
            </p>
            <p className="testRoute">
              <code>GET {nest('/test/sweetbook/templates')}/&#123;templateUid&#125;</code>
            </p>
            <p className="testRouteSweet">SweetBook · <code>GET /v1/templates/&#123;templateUid&#125;</code></p>
            <div className="testForm">
              <label>
                templateUid <FieldTag kind="required" />
                <input
                  value={templateUidLookup}
                  onChange={(e) => setTemplateUidLookup(e.target.value)}
                  placeholder="tpl_..."
                />
              </label>
            </div>
            <div className="testBtnRow">
              <button
                type="button"
                onClick={runTemplateDetail}
                disabled={loadingTarget === 'templateDetail'}
              >
                {loadingTarget === 'templateDetail' ? '…' : '상세 조회'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setCoverForm((f) => ({ ...f, templateUid: templateUidLookup.trim() || f.templateUid }))
                }
              >
                → 표지 templateUid
              </button>
              <button
                type="button"
                onClick={() =>
                  setContentsForm((f) => ({ ...f, templateUid: templateUidLookup.trim() || f.templateUid }))
                }
              >
                → 내지 templateUid
              </button>
            </div>
            <p className="testMsg">{templateDetailResult.message}</p>
            <pre>{JSON.stringify(templateDetailResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>Books — GET 목록</h3>
            <p className="testDesc">
              SweetBook은 보통 아래 쿼리로 조회합니다. (직접 호출 예:{' '}
              <code>
                curl -X GET &apos;https://api-sandbox.sweetbook.com/v1/books?pdfStatusIn=1,2&amp;createdFrom=2026-01-01&amp;createdTo=2026-03-31&amp;limit=10&apos;
                -H &apos;Authorization: Bearer …&apos;
              </code>
              ) 이 카드는 동일 파라미터를 Nest 프록시로 넘깁니다.
            </p>
            <p className="testRoute">
              <code>GET {nest(buildBooksListUrl())}</code>
            </p>
            <p className="testRouteSweet">
              SweetBook · <code>GET /v1/books?pdfStatusIn=…&amp;createdFrom=…&amp;createdTo=…&amp;limit=…</code>
            </p>
            <div className="testForm testFormRow">
              <label>
                pdfStatusIn <FieldTag kind="optional" />
                <input
                  value={booksListQuery.pdfStatusIn}
                  onChange={(e) => setBooksListQuery((q) => ({ ...q, pdfStatusIn: e.target.value }))}
                  placeholder="1,2"
                />
              </label>
              <label>
                limit <FieldTag kind="optional" />
                <input
                  value={booksListQuery.limit}
                  onChange={(e) => setBooksListQuery((q) => ({ ...q, limit: e.target.value }))}
                  placeholder="10"
                />
              </label>
            </div>
            <div className="testForm testFormRow">
              <label>
                createdFrom <FieldTag kind="optional" />
                <input
                  value={booksListQuery.createdFrom}
                  onChange={(e) => setBooksListQuery((q) => ({ ...q, createdFrom: e.target.value }))}
                  placeholder="YYYY-MM-DD"
                />
              </label>
              <label>
                createdTo <FieldTag kind="optional" />
                <input
                  value={booksListQuery.createdTo}
                  onChange={(e) => setBooksListQuery((q) => ({ ...q, createdTo: e.target.value }))}
                  placeholder="YYYY-MM-DD"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => runGet('booksList', buildBooksListUrl(), setBooksListResult)}
              disabled={loadingTarget === 'booksList'}
            >
              {loadingTarget === 'booksList' ? '…' : '책 목록'}
            </button>
            <p className="testMsg">{booksListResult.message}</p>
            <pre>{JSON.stringify(booksListResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>Books — POST 생성 (SweetBook 직접)</h3>
            <p className="testDesc">
              학급 포토북 앱은 <code>POST {nest('/yearbook/books')}</code> 만 사용합니다. 여기서는 SweetBook을 직접 호출합니다.
            </p>
            <p className="testRoute">
              <code>POST {nest('/test/sweetbook/books')}</code>
            </p>
            <p className="testRouteSweet">SweetBook · <code>POST /v1/books</code></p>
            <div className="testForm">
              <label>
                title <FieldTag kind="required" />
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="책 제목"
                />
              </label>
              <label>
                bookSpecUid <FieldTag kind="optional" />
                <input
                  value={createForm.bookSpecUid}
                  onChange={(e) => setCreateForm((f) => ({ ...f, bookSpecUid: e.target.value }))}
                  placeholder={`비우면 ${FIXED_BOOK_SPEC_UID}`}
                />
              </label>
              <details className="testDetailsMuted">
                <summary>SweetBook 전용 옵션 (선택)</summary>
                <label>
                  creationType <FieldTag kind="optional" />
                  <input
                    value={createForm.creationType}
                    onChange={(e) => setCreateForm((f) => ({ ...f, creationType: e.target.value }))}
                    placeholder="비우면 API 기본값"
                  />
                </label>
                <label>
                  specProfileUid <FieldTag kind="optional" />
                  <input
                    value={createForm.specProfileUid}
                    onChange={(e) => setCreateForm((f) => ({ ...f, specProfileUid: e.target.value }))}
                  />
                </label>
                <label>
                  externalRef <FieldTag kind="optional" />
                  <input
                    value={createForm.externalRef}
                    onChange={(e) => setCreateForm((f) => ({ ...f, externalRef: e.target.value }))}
                    placeholder="학급 포토북 파트너 생성 경로에서는 사용하지 않음"
                  />
                </label>
              </details>
            </div>
            <button
              type="button"
              onClick={runCreateBook}
              disabled={loadingTarget === 'createBook'}
            >
              {loadingTarget === 'createBook' ? '…' : '책 생성'}
            </button>
            <p className="testMsg">{createBookResult.message}</p>
            <pre>{JSON.stringify(createBookResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>공통 bookUid</h3>
            <p className="testDesc">표지·내지·최종화에 사용합니다.</p>
            <div className="testForm">
              <label>
                bookUid <FieldTag kind="required" />
                <input
                  value={bookUid}
                  onChange={(e) => setBookUid(e.target.value)}
                  placeholder="bk_..."
                />
              </label>
            </div>
          </article>

          <article className="testCard">
            <h3>Books — POST 표지 (multipart, Raw)</h3>
            <p className="testRoute">
              <code>POST {nest('/test/sweetbook/books')}/&#123;bookUid&#125;/cover</code>
            </p>
            <p className="testRouteSweet">SweetBook · <code>POST /v1/books/&#123;bookUid&#125;/cover</code></p>
            <p className="testDesc">
              학급 포토북 앱: <code>POST {`${nest('/yearbook/books')}/:bookUid/cover`}</code> (JWT). Raw 프록시는 아래로
              호출합니다.{' '}
              <a
                href="https://api.sweetbook.com/docs/api/books/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Books API 문서
              </a>
              . 공통 <code>bookUid</code>와 <strong>templateUid</strong> 후{' '}
              <strong>파라미터 스펙 불러오기</strong>로 <code>parameters.definitions</code>에 맞춰 입력합니다.
            </p>
            <div className="testForm">
              <label>
                templateUid <FieldTag kind="required" />
                <input
                  value={coverForm.templateUid}
                  onChange={(e) => setCoverForm((f) => ({ ...f, templateUid: e.target.value }))}
                  placeholder="예: 1dTGvR4NivrD (템플릿 목록·상세에서 확인)"
                />
              </label>
              <div className="testBtnRow">
                <button
                  type="button"
                  onClick={loadCoverTemplateSpec}
                  disabled={loadingTarget === 'coverTemplateSpec'}
                >
                  {loadingTarget === 'coverTemplateSpec' ? '…' : '파라미터 스펙 불러오기'}
                </button>
              </div>
              {coverSpecHint ? <p className="testMsg">{coverSpecHint}</p> : null}
              {coverLoadedTemplateName ? (
                <p className="testFieldHint">적용 템플릿: {coverLoadedTemplateName}</p>
              ) : null}
              {coverDefsTemplateUid && coverDefsTemplateUid !== coverForm.templateUid.trim() ? (
                <p className="testFieldHint">
                  templateUid가 바뀌었습니다. 다시 &quot;파라미터 스펙 불러오기&quot;를 누르세요.
                </p>
              ) : null}
              {coverTemplateDefs &&
              coverDefsTemplateUid === coverForm.templateUid.trim() &&
              Object.keys(coverTemplateDefs).length > 0
                ? Object.entries(coverTemplateDefs)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([key, def]) => (
                      <label key={key}>
                        <code>{key}</code>{' '}
                        <FieldTag kind={def.required ? 'required' : 'optional'} />
                        {def.description ? (
                          <span className="testFieldHint">{def.description}</span>
                        ) : null}
                        {isFileBinding(def) ? (
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setCoverDynamicFiles((prev) => ({
                                ...prev,
                                [key]: e.target.files?.[0] ?? null,
                              }))
                            }
                          />
                        ) : (
                          <input
                            value={coverDynamicText[key] ?? ''}
                            onChange={(e) =>
                              setCoverDynamicText((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder={def.description ?? key}
                          />
                        )}
                      </label>
                    ))
                : null}
              {coverTemplateDefs &&
              coverDefsTemplateUid === coverForm.templateUid.trim() &&
              coverParametersPreview ? (
                <label>
                  전송될 parameters (텍스트만, 미리보기) <FieldTag kind="optional" />
                  <pre className="testParamPreview">{coverParametersPreview}</pre>
                </label>
              ) : null}
              {!(
                coverTemplateDefs &&
                coverDefsTemplateUid === coverForm.templateUid.trim() &&
                Object.keys(coverTemplateDefs).length > 0
              ) ? (
                <label>
                  parameters (JSON, 스펙 없이 수동) <FieldTag kind="optional" />
                  <span className="testFieldHint">
                    스펙을 불러오지 않은 경우에만 전송됩니다. 이미지는 multipart 필드를 별도로 붙일 수
                    없으니 스펙 불러오기를 권장합니다.
                  </span>
                  <textarea
                    rows={3}
                    value={coverForm.parametersManual}
                    onChange={(e) =>
                      setCoverForm((f) => ({ ...f, parametersManual: e.target.value }))
                    }
                    placeholder="{}"
                  />
                </label>
              ) : null}
            </div>
            <button
              type="button"
              onClick={runCover}
              disabled={loadingTarget === 'cover' || loadingTarget === 'coverTemplateSpec'}
            >
              {loadingTarget === 'cover' ? '…' : '표지 추가'}
            </button>
            <p className="testMsg">{coverResult.message}</p>
            <pre>{JSON.stringify(coverResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>Books — POST 내지 (multipart)</h3>
            <p className="testRoute">
              <code>POST {nest('/test/sweetbook/books')}/&#123;bookUid&#125;/contents</code>
              {' '}(쿼리 <code>?breakBefore=</code>…)
            </p>
            <p className="testRouteSweet">SweetBook · <code>POST /v1/books/&#123;bookUid&#125;/contents</code></p>
            <p className="testDesc">
              기본 <code>templateUid</code>는 빈 내지용 <code>3x6m83dbZ2CJ</code>입니다. 표지와 같이{' '}
              <strong>파라미터 스펙 불러오기</strong>로 필드(<code>binding: file</code> → 파일, 그 외 → 텍스트)를
              맞춥니다. Gallery 등 동일 필드명 다중 파일은 이 UI에서 한 파일만 지원합니다.
            </p>
            <p className="testDesc">
              <strong>배치(위치) 관련:</strong> API로는 템플릿에 정의된 슬롯에 이미지·텍스트 값을 넣는 방식입니다.
              좌표를 요청마다 임의로 정하는 드래그 에디터가 아니라, <strong>템플릿 레이아웃</strong>이 사진·문자
              위치를 고정합니다. 원하는 배치가 있으면 SweetBook에서 그 레이아웃을 가진{' '}
              <strong>다른 templateUid</strong>를 고르거나, 파트너/갤러리 템플릿으로 맞춤 레이아웃을 쓰는
              식으로 가져가야 합니다.
            </p>
            <div className="testForm">
              <label>
                templateUid <FieldTag kind="required" />
                <input
                  value={contentsForm.templateUid}
                  onChange={(e) => setContentsForm((f) => ({ ...f, templateUid: e.target.value }))}
                  placeholder="기본 3x6m83dbZ2CJ (빈 내지)"
                />
              </label>
              <label>
                breakBefore <FieldTag kind="optional" />
                <input
                  value={contentsForm.breakBefore}
                  onChange={(e) => setContentsForm((f) => ({ ...f, breakBefore: e.target.value }))}
                  placeholder="page | column | none"
                />
              </label>
              <div className="testBtnRow">
                <button
                  type="button"
                  onClick={loadContentsTemplateSpec}
                  disabled={loadingTarget === 'contentsTemplateSpec'}
                >
                  {loadingTarget === 'contentsTemplateSpec' ? '…' : '파라미터 스펙 불러오기'}
                </button>
              </div>
              {contentsSpecHint ? <p className="testMsg">{contentsSpecHint}</p> : null}
              {contentsLoadedTemplateName ? (
                <p className="testFieldHint">적용 템플릿: {contentsLoadedTemplateName}</p>
              ) : null}
              {contentsDefsTemplateUid && contentsDefsTemplateUid !== contentsForm.templateUid.trim() ? (
                <p className="testFieldHint">
                  templateUid가 바뀌었습니다. 다시 &quot;파라미터 스펙 불러오기&quot;를 누르세요.
                </p>
              ) : null}
              {contentsTemplateDefs &&
              contentsDefsTemplateUid === contentsForm.templateUid.trim() &&
              Object.keys(contentsTemplateDefs).length > 0
                ? Object.entries(contentsTemplateDefs)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([key, def]) => (
                      <label key={key}>
                        <code>{key}</code>{' '}
                        <FieldTag kind={def.required ? 'required' : 'optional'} />
                        {def.description ? (
                          <span className="testFieldHint">{def.description}</span>
                        ) : null}
                        {isFileBinding(def) ? (
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setContentsDynamicFiles((prev) => ({
                                ...prev,
                                [key]: e.target.files?.[0] ?? null,
                              }))
                            }
                          />
                        ) : (
                          <input
                            value={contentsDynamicText[key] ?? ''}
                            onChange={(e) =>
                              setContentsDynamicText((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder={def.description ?? key}
                          />
                        )}
                      </label>
                    ))
                : null}
              {contentsTemplateDefs &&
              contentsDefsTemplateUid === contentsForm.templateUid.trim() &&
              contentsParametersPreview ? (
                <label>
                  전송될 parameters (텍스트만, 미리보기) <FieldTag kind="optional" />
                  <pre className="testParamPreview">{contentsParametersPreview}</pre>
                </label>
              ) : null}
              {!(
                contentsTemplateDefs &&
                contentsDefsTemplateUid === contentsForm.templateUid.trim() &&
                Object.keys(contentsTemplateDefs).length > 0
              ) ? (
                <label>
                  parameters (JSON, 스펙 없이 수동) <FieldTag kind="optional" />
                  <textarea
                    rows={3}
                    value={contentsForm.parametersManual}
                    onChange={(e) =>
                      setContentsForm((f) => ({ ...f, parametersManual: e.target.value }))
                    }
                  />
                </label>
              ) : null}
            </div>
            <button
              type="button"
              onClick={runContents}
              disabled={loadingTarget === 'contents' || loadingTarget === 'contentsTemplateSpec'}
            >
              {loadingTarget === 'contents' ? '…' : '내지 추가'}
            </button>
            <p className="testMsg">{contentsResult.message}</p>
            <pre>{JSON.stringify(contentsResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>Books — POST 최종화</h3>
            <p className="testRoute">
              <code>POST {nest('/test/sweetbook/books')}/&#123;bookUid&#125;/finalization</code>
            </p>
            <p className="testRouteSweet">SweetBook · <code>POST /v1/books/&#123;bookUid&#125;/finalization</code></p>
            <button type="button" onClick={runFinalize} disabled={loadingTarget === 'finalize'}>
              {loadingTarget === 'finalize' ? '…' : '최종화'}
            </button>
            <p className="testMsg">{finalizeResult.message}</p>
            <pre>{JSON.stringify(finalizeResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>Orders — GET 목록</h3>
            <p className="testRoute">
              <code>GET {nest('/test/sweetbook/orders')}</code>
            </p>
            <p className="testRouteSweet">SweetBook · <code>GET /v1/orders</code></p>
            <button
              type="button"
              onClick={() => runGet('ordersList', '/test/sweetbook/orders', setOrdersListResult)}
              disabled={loadingTarget === 'ordersList'}
            >
              {loadingTarget === 'ordersList' ? '…' : '주문 목록'}
            </button>
            <p className="testMsg">{ordersListResult.message}</p>
            <pre>{JSON.stringify(ordersListResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>Orders — GET 상세</h3>
            <p className="testRoute">
              <code>GET {nest('/test/sweetbook/orders')}/&#123;orderUid&#125;</code>
            </p>
            <p className="testRouteSweet">SweetBook · <code>GET /v1/orders/&#123;orderUid&#125;</code></p>
            <div className="testForm">
              <label>
                orderUid
                <input
                  value={orderUid}
                  onChange={(e) => setOrderUid(e.target.value)}
                  placeholder="or_..."
                />
              </label>
            </div>
            <button
              type="button"
              onClick={runOrderDetail}
              disabled={loadingTarget === 'orderDetail'}
            >
              {loadingTarget === 'orderDetail' ? '…' : '주문 상세'}
            </button>
            <p className="testMsg">{orderDetailResult.message}</p>
            <pre>{JSON.stringify(orderDetailResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>Orders — POST 가격 조회</h3>
            <p className="testRoute">
              <code>POST {nest('/test/sweetbook/orders/estimate')}</code>
            </p>
            <p className="testRouteSweet">SweetBook · <code>POST /v1/orders/estimate</code></p>
            <p className="testFieldHint">
              본문 <FieldTag kind="required" /> — JSON 직접 편집
            </p>
            <textarea
              className="testJsonArea"
              rows={12}
              value={estimateJson}
              onChange={(e) => setEstimateJson(e.target.value)}
            />
            <button type="button" onClick={runEstimate} disabled={loadingTarget === 'estimate'}>
              {loadingTarget === 'estimate' ? '…' : '견적 요청'}
            </button>
            <p className="testMsg">{estimateResult.message}</p>
            <pre>{JSON.stringify(estimateResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>Orders — POST 주문 생성</h3>
            <p className="testRoute">
              <code>POST {nest('/test/sweetbook/orders')}</code>
            </p>
            <p className="testRouteSweet">SweetBook · <code>POST /v1/orders</code></p>
            <p className="testFieldHint">
              본문 <FieldTag kind="required" /> — JSON 직접 편집
            </p>
            <textarea
              className="testJsonArea"
              rows={12}
              value={orderJson}
              onChange={(e) => setOrderJson(e.target.value)}
            />
            <button type="button" onClick={runCreateOrder} disabled={loadingTarget === 'createOrder'}>
              {loadingTarget === 'createOrder' ? '…' : '주문 생성'}
            </button>
            <p className="testMsg">{createOrderResult.message}</p>
            <pre>{JSON.stringify(createOrderResult.payload, null, 2)}</pre>
          </article>

          <article className="testCard">
            <h3>Orders — POST 취소</h3>
            <p className="testRoute">
              <code>POST {nest('/test/sweetbook/orders')}/&#123;orderUid&#125;/cancel</code>
            </p>
            <p className="testRouteSweet">SweetBook · <code>POST /v1/orders/&#123;orderUid&#125;/cancel</code></p>
            <div className="testForm">
              <label>
                cancelReason <FieldTag kind="optional" />
                <input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="비우면 기본 문구 전송"
                />
              </label>
            </div>
            <button type="button" onClick={runCancel} disabled={loadingTarget === 'cancel'}>
              {loadingTarget === 'cancel' ? '…' : '주문 취소'}
            </button>
            <p className="testMsg">{cancelResult.message}</p>
            <pre>{JSON.stringify(cancelResult.payload, null, 2)}</pre>
          </article>
        </div>
      </section>
    </main>
  );
}
