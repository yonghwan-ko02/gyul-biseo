import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 비밀번호 인증 비활성화 여부 (다시 활성화하려면 false로 변경)
const DISABLE_AUTH = true;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 루트 경로 접속 시 /chat으로 리다이렉트
  if (pathname === '/') {
    const chatUrl = new URL('/chat', request.url);
    return NextResponse.redirect(chatUrl);
  }

  // 로그인 페이지 처리
  if (pathname === '/login') {
    if (DISABLE_AUTH) {
      const chatUrl = new URL('/chat', request.url);
      return NextResponse.redirect(chatUrl);
    }
    return NextResponse.next();
  }

  // 비밀번호 인증 비활성화 시 검사 생략
  if (DISABLE_AUTH) {
    return NextResponse.next();
  }

  // 관리자 권한 확인 (쿠키 기반)
  const authCookie = request.cookies.get('gyul-auth');

  if (!authCookie || authCookie.value !== 'authenticated') {
    // API 라우트인 경우 401 에러 반환
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // 일반 페이지인 경우 로그인 페이지로 리다이렉트
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// 아래의 경로들에만 이 미들웨어가 실행되도록 설정 (로그인 및 주요 경로 포함)
export const config = {
  matcher: [
    '/',
    '/login',
    '/chat',
    '/dashboard',
    '/ledger',
    '/settlement',
    '/settings',
    '/api/chat',
    '/api/farm'
  ],
};
