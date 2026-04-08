import Image from 'next/image';
import Link from 'next/link';

/** 선생님 후기 썸네일 — 1번은 `public/review1.png`. 2~4번은 파일 넣은 뒤 아래 URL을 `/review2.png` 형태로 바꾸면 됨 */
const TEACHER_REVIEWS = [
  {
    id: 'r1',
    image: '/review1.png',
    quote: '졸업식에 나눠 주니 아이들 표정이 생생하게 남았어요.',
    who: '김○○ 담임 · 초등 6학년',
  },
  {
    id: 'r2',
    image: '/review2.png',
    quote: '부담 없이 우리 반 분위기를 담을 수 있어 학부모 상담 때도 도움이 됐습니다.',
    who: '이○○ 담임 · 중학교',
  },
  {
    id: 'r3',
    image: '/review3.png',
    quote: '사진과 글이 한 권으로 묶이니 아이들에게 의미 있는 선물이 됐어요.',
    who: '박○○ 담임 · 초등',
  },
  {
    id: 'r4',
    image: '/review4.png',
    quote: '표지부터 내지까지 순서가 분명해 처음 해도 흐름을 놓치지 않았습니다.',
    who: '최○○ 담임 · 초등 5학년',
  },
] as const;

export default function HomePage() {
  return (
    <main className="sb-home">
      <section className="sb-hero" aria-label="소개">
        <div>
          <p className="sb-eyebrow">학급 추억 한 권</p>
          <h1 className="sb-heroTitle">
            학년을 마무리하며,
            <br />
            <span className="sb-heroAccent">학생들에게 추억을 선물</span>하세요.
          </h1>
          <p className="sb-heroLead">
            수학여행·현장학습·운동회·소풍 함께 웃고 뛰던 날들을 사진과 글로 엮어, 졸업식이나 학기 말 우리 반만의 학급 포토북으로
            남길 수 있습니다. 복잡한 편집 대신 선생님의 마음을 한 권에 담아 보세요.
          </p>
          <div className="sb-heroActions">
            <Link className="sb-btn sb-btnPrimary sb-btnLg" href="/login?redirect=%2Fyearbook">
              시작하기
            </Link>
          </div>
        </div>
        <div className="sb-heroPanel" aria-hidden>
          <div className="sb-paperStack">
            <div className="sb-paper sb-paperA" />
            <div className="sb-paper sb-paperB" />
            <div className="sb-paper sb-paperC" />
          </div>
          <p className="sb-panelCaption">교실 안팎에서 쌓인 순간들을, 아이들 손에 닿는 한 권의 선물로.</p>
        </div>
      </section>

      <section className="sb-section" aria-labelledby="home-reviews-title">
        <div className="sb-sectionInner">
          <h2 id="home-reviews-title" className="sb-sectionTitle">
            함께한 선생님들의 이야기
          </h2>
          <p className="sb-reviewLead">담임·교과 선생님들이 남긴 이용 후기입니다.</p>
          <ul className="sb-reviewGrid">
            {TEACHER_REVIEWS.map((item) => (
              <li key={item.id} className="sb-reviewCard">
                <div className="sb-reviewImgWrap">
                  <Image
                    src={item.image}
                    alt=""
                    width={720}
                    height={480}
                    sizes="(max-width: 520px) 100vw, (max-width: 960px) 50vw, 25vw"
                    className="sb-reviewImg"
                  />
                </div>
                <p className="sb-reviewQuote">{item.quote}</p>
                <p className="sb-reviewMeta">{item.who}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sb-section" aria-labelledby="home-steps-title">
        <div className="sb-sectionInner">
          <h2 id="home-steps-title" className="sb-sectionTitle">
            학급 포토북, 이렇게 만들어요
          </h2>
          <p className="sb-flowIntro">
            로그인부터 표지·내지 편집, 최종화까지 순서만 따라가면 됩니다. 아래는 서비스 안에서 진행되는 단계입니다.
          </p>
          <ol className="sb-steps">
            <li>
              <span className="sb-stepNum" aria-hidden>
                1
              </span>
              <div>
                <h3>가입하고 로그인하기</h3>
                <p>계정을 만든 뒤 로그인하면 <strong>내 학급 포토북</strong> 목록으로 이동합니다.</p>
              </div>
            </li>
            <li>
              <span className="sb-stepNum" aria-hidden>
                2
              </span>
              <div>
                <h3>새 포토북 만들기</h3>
                <p>「새 책 추가」로 제목만 정해 한 권을 만듭니다. 한 반·한 시기에 한 권씩 천천히 준비하면 됩니다.</p>
              </div>
            </li>
            <li>
              <span className="sb-stepNum" aria-hidden>
                3
              </span>
              <div>
                <h3>표지 적용 → 내지 채우기</h3>
                <p>
                  먼저 <strong>표지</strong>에서 템플릿·문구·사진을 넣고 적용합니다. 이어지는 <strong>내지</strong>에서 페이지를
                  한 장씩 쌓아 최소 장 수를 맞춥니다.
                </p>
              </div>
            </li>
            <li>
              <span className="sb-stepNum" aria-hidden>
                4
              </span>
              <div>
                <h3>최종화 후 주문(선택)</h3>
                <p>
                  편집이 끝나면 <strong>최종화</strong>로 완성 처리합니다. 인쇄본이 필요하면 그다음 <strong>주문 요청</strong>을 할 수
                  있어요.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}
