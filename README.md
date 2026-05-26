# 🍊 귤비서 (Gyul-Biseo) — Talk & Track

> **감귤 농가 맞춤형 대화형 비즈니스 데이터 관리 솔루션**  
> 수확 현장에서 음성 메시지 하나로 출하·정산·영농 이력을 기록하고 관리하는 AI 비서

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-teal)](https://prisma.io)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com)
[![Ollama](https://img.shields.io/badge/Ollama-Llama_3.1-orange)](https://ollama.ai)

---

## 📋 목차

1. [프로젝트 개요](#-프로젝트-개요)
2. [핵심 기능](#-핵심-기능)
3. [기술 스택](#-기술-스택)
4. [아키텍처](#-아키텍처)
5. [시작하기](#-시작하기)
6. [디렉터리 구조](#-디렉터리-구조)
7. [개발 가이드](#-개발-가이드)

---

## 🎯 프로젝트 개요

**귤비서**는 50~70대 감귤 농장주가 장갑을 낀 채로도 **음성 입력 하나만으로** 다음을 처리할 수 있게 합니다:

- 📦 출하 내역 기록 (품종·규격·수량·단가·거래처)
- 💰 외상/미수금 자동 집계 및 정산서 공유
- ✏️ 말로 하는 장부 수정/삭제 (Natural Language CRUD)
- 📝 GAP·친환경 인증용 영농일지 자동 생성
- 👷 일용직 인력 근무/급여 관리

| 기존 방식 | 귤비서 |
|-----------|--------|
| 장갑 벗고 앱 켜서 타이핑 | 음성 한마디로 끝 |
| 수기 장부 → 누락·분실 | 실시간 DB 저장 |
| 정산서 수기 작성 | 원클릭 정산서 링크 공유 |
| 영농일지 별도 기록 | 대화 중 자동 축적 |

---

## ✨ 핵심 기능

### 1. 스마트 음성 입력 (Voice → Data)
- Web Speech API 기반 브라우저 음성 인식
- 제주 방언·현장 은어 자동 변환 (콘테나, 조생, 로얄과 등)
- 누락 정보 자동 되묻기 + 퀵 리플라이 버튼

### 2. Natural Language CRUD
- "아까 청과로 보낸 거 50박스가 아니라 40박스야 수정해 줘"
- "어제 삼춘네 외상 기록 지워줘"

### 3. 미수금 관리 & 정산서 공유
- 자연어 미수금 조회
- 정산서 웹 링크 생성 → URL 공유

### 4. 영농일지 & 인력 관리
- 음성 기록 → GAP 인증 양식 자동 변환
- 일당제 인력 근무·급여 기록

---

## 🛠 기술 스택

| 레이어 | 기술 | 선택 근거 |
|--------|------|-----------|
| **풀스택** | Next.js 15 (App Router) | SSR + API Routes 통합, Vercel 배포 |
| **언어** | TypeScript | 타입 안전성, Prisma 완벽 호환 |
| **LLM** | Ollama + Llama 3.1 8B | 무료 로컬 실행, GPU 활용 |
| **DB** | Supabase (PostgreSQL) | 무료 클라우드, Docker 불필요 |
| **ORM** | Prisma | TypeScript 타입 생성, 마이그레이션 관리 |
| **음성 입력** | Web Speech API | 무료, 브라우저 내장, 한국어 지원 |
| **배포** | Vercel | Next.js 네이티브, 무료 |

---

## 🏗 아키텍처

```
📱 사용자 (모바일 Chrome/Safari)
    │ 음성/텍스트 입력
    ▼
┌─────────────────────────────────────────────┐
│  Next.js 15 (App Router)                     │
│  ┌──────────────────────────────────────┐    │
│  │ 프론트엔드 (React + TypeScript)        │    │
│  │ • 채팅 UI (큰 글씨·큰 버튼)           │    │
│  │ • 음성 입력 (Web Speech API)          │    │
│  │ • 퀵 리플라이 (품종·규격 터치 선택)    │    │
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ API Routes (백엔드)                    │    │
│  │ • /api/chat     → 대화 처리 (LLM)    │    │
│  │ • /api/shipments → 출하 CRUD          │    │
│  │ • /api/payments  → 입금/잔액 처리     │    │
│  │ • /api/settlement → 정산서 생성       │    │
│  └──────────────────────────────────────┘    │
└──────────────┬──────────────────┬────────────┘
               │                  │
    ┌──────────┴──────┐  ┌───────┴───────┐
    │  Ollama (로컬)    │  │  Supabase     │
    │  Llama 3.1 8B    │  │  PostgreSQL   │
    │  JSON 모드 파싱   │  │  (Prisma ORM) │
    └─────────────────┘  └───────────────┘
```

---

## 🚀 시작하기

### 사전 요구사항

- Node.js 20+
- [Ollama](https://ollama.ai) 설치 + `ollama pull llama3.1`
- [Supabase](https://supabase.com) 계정 (무료)

### 로컬 개발 환경 실행

```bash
# 1. 저장소 클론
git clone https://github.com/yonghwan-ko02/gyul-biseo.git
cd gyul-biseo

# 2. 환경 변수 설정
cp .env.local.example .env.local
# .env.local 파일을 열어 Supabase URL 등 필요한 값 입력

# 3. 패키지 설치
npm install

# 4. Ollama 모델 다운로드 (최초 1회)
ollama pull llama3.1

# 5. DB 마이그레이션 & 시드 데이터
npx prisma migrate dev
npx prisma db seed

# 6. 개발 서버 실행
npm run dev
```

---

## 📁 디렉터리 구조

```
gyul-biseo/
├── prisma/
│   ├── schema.prisma          # DB 스키마 (Supabase PostgreSQL)
│   └── seed.ts                # 초기 데이터
├── src/
│   ├── app/
│   │   ├── layout.tsx         # 루트 레이아웃 (큰 폰트)
│   │   ├── globals.css        # 감귤 테마 디자인 토큰
│   │   ├── chat/              # 💬 메인 채팅 인터페이스
│   │   ├── dashboard/         # 📊 출하 현황 대시보드
│   │   ├── ledger/            # 📒 장부 상세 목록
│   │   ├── settlement/        # 💰 정산서
│   │   ├── settings/          # ⚙️ 농장 설정
│   │   └── api/               # API Routes (백엔드)
│   ├── components/            # UI 컴포넌트
│   ├── lib/                   # 비즈니스 로직
│   │   ├── ai/                # LLM 대화 엔진
│   │   ├── services/          # CRUD 서비스
│   │   └── utils/             # 유틸리티
│   └── hooks/                 # React 커스텀 훅
├── docs/                      # 프로젝트 문서
├── DEVELOPMENT.md             # 개발 방법론
├── PORTFOLIO.md               # 포트폴리오 기록
└── CHANGELOG.md               # 변경 이력
```

---

## 📚 개발 가이드

- [DEVELOPMENT.md](./DEVELOPMENT.md) — 코딩 표준, 오류 처리, 테스트 전략
- [PORTFOLIO.md](./PORTFOLIO.md) — Phase별 개발 과정 기록
- [docs/prd-v3.md](./docs/prd-v3.md) — 제품 요구사항 문서
- [docs/dialect-glossary.md](./docs/dialect-glossary.md) — 방언·은어 사전

---

*귤비서 🍊 | 제주 감귤 농가의 디지털 전환을 응원합니다*
