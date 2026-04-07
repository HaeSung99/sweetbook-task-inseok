import Image from 'next/image';
import Link from 'next/link';

/** 선생님(교사)이 작성한 후기로 가정 — 임시 이미지는 교체 예정 */
const TEACHER_REVIEWS = [
  { seed: 'sb-r1', quote: '졸업식에 나눠 주니 아이들 표정이 생생하게 남았어요.', who: '김○○ 담임 · 초등 6학년' },
  { seed: 'sb-r2', quote: '부담 없이 우리 반 분위기를 담을 수 있어 학부모 상담 때도 도움이 됐습니다.', who: '이○○ 담임 · 중학교' },
  { seed: 'sb-r3', quote: '사진과 글이 한 권으로 묶이니 아이들에게 의미 있는 선물이 됐어요.', who: '박○○ 담임 · 초등' },
  { seed: 'sb-r4', quote: '표지부터 내지까지 순서가 분명해 처음 해도 흐름을 놓치지 않았습니다.', who: '최○○ 담임 · 초등 5학년' },
] as const;

export default function HomePage() {
  return (
    <main>
      <section className="sb-hero">
        <div className="sb-heroInner">
          <p className="sb-eyebrow">학급 추억 한 권</p>
          <h1 className="sb-heroTitle">
            학급에서 쌓인 하루하루를,
            <br />
            <span className="sb-heroAccent">한 권의 추억</span>으로 남깁니다.
          </h1>
          <p className="sb-heroLead">
            사진과 선생님의 마음을 엮어, 졸업식·학년 마무리 날 학생들에게 전해 줄 학급 포토북을 준비하세요.
            복잡한 편집 대신, 우리 반에 맞는 한 권에 집중할 수 있습니다.
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
          <p className="sb-panelCaption">한 학기를 넘어, 오래 기억에 남는 한 권으로.</p>
        </div>
      </section>

      <section className="sb-section" aria-labelledby="home-reviews-title">
        <div className="sb-sectionInner">
          <h2 id="home-reviews-title" className="sb-sectionTitle">
            함께한 선생님들의 이야기
          </h2>
          <p className="sb-reviewLead">
            담임·교과 선생님들이 남긴 이용 후기입니다. (사진은 임시이며, 이후 실제 이미지로 바꿀 수 있습니다.)
          </p>
          <ul className="sb-reviewGrid">
            {TEACHER_REVIEWS.map((item) => (
              <li key={item.seed} className="sb-reviewCard">
                <div className="sb-reviewImgWrap">
                  <Image
                    src={`https://picsum.photos/seed/${item.seed}/720/480`}
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

      <section className="sb-section">
        <div className="sb-sectionInner">
          <h2 className="sb-sectionTitle">학급 포토북, 이렇게 만들어요</h2>
          <p className="sb-flowIntro">
            로그인부터 표지·내지 편집, 최종화까지 순서만 따라가면 됩니다. 아래는 서비스 안에서 진행되는 단계입니다.
          </p>
          <ul className="sb-steps">
            <li>
              <span className="sb-stepNum">1</span>
              <div>
                <h3>가입하고 로그인하기</h3>
                <p>계정을 만든 뒤 로그인하면 <strong>내 학급 포토북</strong> 목록으로 이동합니다.</p>
              </div>
            </li>
            <li>
              <span className="sb-stepNum">2</span>
              <div>
                <h3>새 포토북 만들기</h3>
                <p>「새 책 추가」로 제목만 정해 한 권을 만듭니다. 한 반·한 시기에 한 권씩 천천히 준비하면 됩니다.</p>
              </div>
            </li>
            <li>
              <span className="sb-stepNum">3</span>
              <div>
                <h3>표지 적용 → 내지 채우기</h3>
                <p>
                  먼저 <strong>표지</strong>에서 템플릿·문구·사진을 넣고 적용합니다. 이어지는 <strong>내지</strong>에서 페이지를
                  한 장씩 쌓아 최소 장 수를 맞춥니다.
                </p>
              </div>
            </li>
            <li>
              <span className="sb-stepNum">4</span>
              <div>
                <h3>최종화 후 구매(선택)</h3>
                <p>편집이 끝나면 <strong>최종화</strong>로 완성 처리합니다. 인쇄본이 필요하면 그다음 <strong>구매</strong>로 주문할 수 있어요.</p>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
