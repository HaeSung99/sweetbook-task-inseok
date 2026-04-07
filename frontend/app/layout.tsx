import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import { Providers } from './providers';
import './globals.css';

const noto = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '학년 앨범 — 학급 포토북',
  description: '선생님이 남긴 사진과 글을 모아, 졸업식 날 전해 줄 한 권의 학급 포토북을 만듭니다.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={noto.variable}>
      <body className="sb-body">
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
