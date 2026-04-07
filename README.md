# sweetbook-task-inseok

**서비스 소개**: 교사가 SweetBook 파트너 API로 학급 포토북을 만들고, 서비스 내 충전 잔액으로 견적·구매 요청·관리자 승인을 거쳐 인쇄 주문까지 이어 가는 웹 서비스입니다.

**타겟 고객**: 학년 동안의 추억을 담아 학생들에게 선물하고 싶은 선생님.

**주요 기능**

- 회원가입·로그인(JWT), 역할 구분(일반 `user` / `admin`)
- 충전 잔액(`balance_won`): 충전 후 구매 시 차감
- 포토북 생성·목록·상세, 표지/내지 업로드, 최종화(SweetBook 연동)
- 견적 조회: API 견적 금액의 2배를 이용자 부담으로 안내·차감
- 구매 요청 → 관리자 승인 시 SweetBook 주문 생성, 이용자는 요청 목록·취소
- 관리자: 구매 요청 처리, 회사 크레딧 조회, 레이아웃 템플릿 등록
- 등록된 템플릿 UID 기준 표지/내지 선택 UI

## 빠른 실행

### 1) MySQL

백엔드는 MySQL에 붙습니다. **이미 로컬에서 MySQL이 떠 있으면** 그걸 쓰면 되고, 아니면 저장소의 Docker Compose로 MySQL만 띄울 수 있습니다.

```bash
cd ./backend

# mysql이 켜져있지 않다면
docker compose up -d mysql
```

- 기본 포트: 호스트 `3306` → 컨테이너 `3306` (`MYSQL_PUBLISH_PORT`로 바꿀 수 있음)
- 계정·DB 이름은 `backend/docker-compose.yml` / `.env`와 맞춰 `backend/.env`의 `DB_*` 를 설정하세요.

### 2) 백엔드

```bash
cd ./backend
cp .env.example .env
```

PowerShell: `Copy-Item .env.example .env`

`.env`에 `DB_*`, `JWT_SECRET`, `SWEETBOOK_API_KEY`, 시드용 `SEED_*` 등 필요한 값을 채운 뒤:

```bash
npm install
npm run start:dev
```

- API 기본 주소: `http://localhost:3001` (`PORT`로 변경 가능)

### 3) 프론트엔드 (별도 터미널)

```bash
cd ./frontend
cp .env.example .env
```

PowerShell: `Copy-Item .env.example .env.local`

(백엔드 주소가 다르면 `.env`의 `NEXT_PUBLIC_API_BASE_URL` 수정)

```bash
npm install
npm run dev
```

- 브라우저: `http://localhost:3000`

### 4) 시드 (선택)

DB가 떠 있는 상태에서, **백엔드 디렉터리**에서:

```bash
cd ./backend
npm run seed
```

데모 계정·레이아웃 템플릿은 `backend/.env`의 `SEED_ADMIN_*`, `SEED_USER_*` 등으로만 주입됩니다.

## 폴더 구조

| 경로 | 설명 |
|------|------|
| `backend/` | Nest 앱 — `auth/`, `yearbook/`, `sweetbook/`, `test/`, `entities/`, `scripts/seed.ts` |
| `frontend/` | Next.js 앱 — `app/`, `components/`, `contexts/`, `lib/api.ts` |
