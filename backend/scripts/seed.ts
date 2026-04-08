/**
 * 로컬/새 DB에 사용자 계정·잔액 등을 넣습니다. SweetBook API는 호출하지 않습니다.
 *
 * `layout_templates`에 표지·내지 템플릿 UID를 넣습니다. 표지·내지 각각 **시드 기본 UID**가 있으며,
 * `.env`로 덮어쓰거나(표지) 내지는 **추가** UID를 더할 수 있습니다. book_uids / 주문은 비워 둡니다.
 *
 * 사용: backend 폴더에서 `npm run seed`
 *
 * 기본 계정: .env의 SEED_ADMIN_*, SEED_USER_* 값 사용
 *
 * 템플릿 UID: `.env.example` 에 표지·내지 기본 UID가 적혀 있음. 변수가 비어 있으면 코드 상수
 * (표지 4MY2fokVjkeY, 내지 2mi1ao0Z4Vxl)로 보완합니다. 내지는 기본 UID에 SEED_CONTENT_* 추가값을 합쳐 등록합니다.
 *
 * 선택 .env:
 *   SEED_USER_BALANCE_WON=500000
 *   SEED_COVER_TEMPLATE_UID=
 *   SEED_CONTENT_TEMPLATE_UID_1=
 *   SEED_CONTENT_TEMPLATE_UID_2=
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

config({ path: resolve(__dirname, '../.env') });

/** 시드 시 항상 등록하는 SweetBook 레이아웃 템플릿 UID */
const DEFAULT_SEED_COVER_TEMPLATE_UID = '4MY2fokVjkeY';
const DEFAULT_SEED_CONTENT_TEMPLATE_UIDS = ['2mi1ao0Z4Vxl'] as const;

function requiredEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`필수 환경변수 누락: ${name}`);
  return v;
}

async function main() {
  const port = Number(process.env.DB_PORT ?? '3306');
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number.isFinite(port) ? port : 3306,
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'sweetbook',
  });

  await ds.initialize();

  const adminId = requiredEnv('SEED_ADMIN_ID');
  const adminEmail = requiredEnv('SEED_ADMIN_EMAIL');
  const adminPassword = requiredEnv('SEED_ADMIN_PASSWORD');
  const adminDisplayName = '관리자';

  const userId = requiredEnv('SEED_USER_ID');
  const userEmail = requiredEnv('SEED_USER_EMAIL');
  const userPassword = requiredEnv('SEED_USER_PASSWORD');
  const userDisplayName = '선생님';
  const userBalance = Math.max(0, Math.floor(Number(process.env.SEED_USER_BALANCE_WON ?? '500000')));

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const userHash = await bcrypt.hash(userPassword, 10);

  // id·email 중복 시 갱신(반복 실행). book_uids/order_uids는 UPDATE에서 제외
  await ds.query(
    `INSERT INTO users (id, email, password_hash, display_name, role, book_uids, order_uids, balance_won, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       id = VALUES(id),
       email = VALUES(email),
       password_hash = VALUES(password_hash),
       display_name = VALUES(display_name),
       role = VALUES(role),
       balance_won = VALUES(balance_won)`,
    [adminId, adminEmail, adminHash, adminDisplayName, 'admin', '[]', '[]', 0],
  );
  console.log('[seed] 관리자 반영:', adminEmail);

  await ds.query(
    `INSERT INTO users (id, email, password_hash, display_name, role, book_uids, order_uids, balance_won, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       id = VALUES(id),
       email = VALUES(email),
       password_hash = VALUES(password_hash),
       display_name = VALUES(display_name),
       role = VALUES(role),
       balance_won = VALUES(balance_won)`,
    [userId, userEmail, userHash, userDisplayName, 'user', '[]', '[]', userBalance],
  );
  console.log(
    '[seed] 선생님 반영:',
    userEmail,
    `(잔액 ${userBalance.toLocaleString('ko-KR')}원)`,
  );

  const coverUid =
    process.env.SEED_COVER_TEMPLATE_UID?.trim() || DEFAULT_SEED_COVER_TEMPLATE_UID;
  const contentUids = [
    ...new Set(
      [
        ...DEFAULT_SEED_CONTENT_TEMPLATE_UIDS,
        process.env.SEED_CONTENT_TEMPLATE_UID_1?.trim(),
        process.env.SEED_CONTENT_TEMPLATE_UID_2?.trim(),
      ].filter((v): v is string => !!v),
    ),
  ];

  const coverRow = await ds.query(
    'SELECT id FROM layout_templates WHERE kind = ? AND template_uid = ? LIMIT 1',
    ['cover', coverUid],
  );
  if (!Array.isArray(coverRow) || coverRow.length === 0) {
    await ds.query(
      `INSERT INTO layout_templates (id, kind, template_uid, created_at) VALUES (UUID(), ?, ?, NOW())`,
      ['cover', coverUid],
    );
    console.log('[seed] 표지 템플릿 등록:', coverUid);
  } else {
    console.log('[seed] 표지 템플릿 이미 있음:', coverUid);
  }

  for (const contentUid of contentUids) {
    const row = await ds.query(
      'SELECT id FROM layout_templates WHERE kind = ? AND template_uid = ? LIMIT 1',
      ['content', contentUid],
    );
    if (!Array.isArray(row) || row.length === 0) {
      await ds.query(
        `INSERT INTO layout_templates (id, kind, template_uid, created_at) VALUES (UUID(), ?, ?, NOW())`,
        ['content', contentUid],
      );
      console.log('[seed] 내지 템플릿 등록:', contentUid);
    } else {
      console.log('[seed] 내지 템플릿 이미 있음:', contentUid);
    }
  }

  console.log('[seed] 완료. book_uids·주문은 비어 있음 — SweetBook에서 책 생성 후 목록에 붙습니다.');
  await ds.destroy();
}

main().catch((e) => {
  console.error('[seed] 실패:', e);
  process.exit(1);
});
