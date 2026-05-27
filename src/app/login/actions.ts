'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginAction(prevState: any, formData: FormData) {
  const password = formData.get('password');

  if (password === '4634') {
    const cookieStore = await cookies();
    cookieStore.set('gyul-auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30일
      path: '/',
    });
  } else {
    return { error: '비밀번호가 틀렸습니다. 다시 시도해 주세요.' };
  }

  // 성공 시 채팅 화면으로 강제 이동
  redirect('/chat');
}
