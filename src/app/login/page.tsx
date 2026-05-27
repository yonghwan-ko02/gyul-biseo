'use client';

import { useActionState } from 'react';
import { loginAction } from './actions';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-background)', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', padding: '40px 24px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', margin: '0 0 16px 0' }}>🍊</h1>
        <h2 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '8px', color: 'var(--color-text)' }}>귤비서 로그인</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px', fontSize: 'var(--font-size-sm)' }}>농장주 전용 관리 페이지입니다.<br/>비밀번호를 입력해 주세요.</p>
        
        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="password" 
            name="password" 
            placeholder="비밀번호 4자리" 
            maxLength={4}
            required
            autoFocus
            style={{ 
              padding: '16px', 
              fontSize: '24px', 
              textAlign: 'center', 
              borderRadius: 'var(--radius-md)', 
              border: '2px solid var(--color-border)', 
              letterSpacing: '8px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
          />
          {state?.error && (
            <p style={{ color: '#e11d48', fontSize: 'var(--font-size-sm)', margin: '0', fontWeight: 'bold' }}>
              {state.error}
            </p>
          )}
          <button 
            type="submit" 
            disabled={isPending}
            style={{ 
              backgroundColor: 'var(--color-primary)', 
              color: 'white', 
              padding: '16px', 
              fontSize: 'var(--font-size-lg)', 
              fontWeight: 'bold', 
              border: 'none', 
              borderRadius: 'var(--radius-lg)', 
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.7 : 1,
              marginTop: '8px'
            }}
          >
            {isPending ? '확인 중...' : '접속하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
