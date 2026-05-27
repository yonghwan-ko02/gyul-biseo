import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 루트 경로 접속 시 /chat으로 리다이렉트
  if (pathname === '/') {
    const chatUrl = new URL('/chat', request.url);
    return NextResponse.redirect(chatUrl);
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

// 아래의 경로들에만 이 미들웨어가 실행되도록 설정 (주문 폼과 관련 API는 제외)
export const config = {
  matcher: [
    '/',
    '/chat',
    '/dashboard',
    '/ledger',
    '/settlement',
    '/settings',
    '/api/chat',
    '/api/farm'
  ],
};
