# 🍊 귤비서 (Gyul-Biseo) — Talk & Track

> **감귤 농가 맞춤형 대화형 비즈니스 데이터 관리 솔루션**  
> 수확 현장에서 음성 메시지 하나로 출하·정산·영농 이력을 기록하고 관리하는 AI 비서

[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-green)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-latest-orange)](https://langchain-ai.github.io/langgraph)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://postgresql.org)
[![KakaoTalk](https://img.shields.io/badge/KakaoTalk-Chatbot_API-yellow)](https://i.kakao.com)

---

## 📋 목차

1. [프로젝트 개요](#-프로젝트-개요)
2. [핵심 기능](#-핵심-기능)
3. [아키텍처](#-아키텍처)
4. [디렉터리 구조](#-디렉터리-구조)
5. [기술 스택](#-기술-스택)
6. [시작하기](#-시작하기)
7. [환경 변수 설정](#-환경-변수-설정)
8. [개발 가이드](#-개발-가이드)
9. [API 문서](#-api-문서)
10. [기여 가이드](#-기여-가이드)

---

## 🎯 프로젝트 개요

**귤비서**는 50~70대 감귤 농장주가 장갑을 낀 채로도 카카오톡 음성 메시지 하나만으로 다음을 처리할 수 있게 합니다:

- 📦 출하 내역 기록 (품종·규격·수량·단가·거래처)
- 💰 외상/미수금 자동 집계 및 정산서 발송
- 📝 GAP·친환경 인증용 영농일지 자동 생성
- 👷 일용직 인력 근무/급여 관리
- 🔧 말로 하는 장부 수정/삭제 (Natural Language CRUD)

### 왜 귤비서인가?

| 기존 방식 | 귤비서 |
|-----------|--------|
| 장갑 벗고 앱 켜서 타이핑 | 음성 메시지 하나로 끝 |
| 수기 장부 → 누락·분실 위험 | 실시간 DB 저장 |
| 정산서 수기 작성 후 문자 전송 | 원클릭 카카오톡 정산서 발송 |
| 영농일지 별도 기록 | 대화 중 자동 축적 |

---

## ✨ 핵심 기능

### 1. 스마트 음성 입력 (Voice → Data)
- 제주 방언·현장 은어 인식 (콘테나, 조생, 로얄과 등)
- 누락 정보 자동 되묻기 (컨텍스트 유지 대화)
- 현장 소음 대비 퀵 리플라이 버튼 UI 폴백

### 2. 사진 OCR 입력
- 수기 장부 사진 → OCR + LLM → DB 자동 입력

### 3. Natural Language CRUD
- "아까 청과로 보낸 거 50박스가 아니라 40박스야 수정해 줘"
- "어제 삼춘네 외상 기록한 거 지워줘"

### 4. 미수금 관리 & 정산서 발송
- 자연어 미수금 조회
- 원클릭 카카오톡 정산서 공유

### 5. 영농일지 & 인력 관리
- GAP 인증 양식 자동 변환
- 일당제 인력 음성 기록

---

## 🏗 아키텍처

```
카카오톡 사용자
      │  음성/텍스트/사진
      ▼
[Kakao i Open Builder] ── Webhook ──▶ [FastAPI Gateway]
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                        [STT Service]  [OCR Service]  [LangGraph Agent]
                        (Clova/Whisper) (Naver Clova)       │
                                                    ┌────────┴────────┐
                                                    ▼                 ▼
                                            [Intent Router]   [State Manager]
                                                    │
                              ┌─────────┬───────────┼───────────┬─────────┐
                              ▼         ▼           ▼           ▼         ▼
                          [Record]  [Correct]  [Query AR]  [Agri Log] [Labor]
                          Agent     Agent       Agent       Agent     Agent
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
              [PostgreSQL]         [ChromaDB]
              (정형 데이터)        (영농 컨텍스트)
                    │
                    ▼
            [KakaoTalk Message API]
            (정산서 발송)
```

---

## 📁 디렉터리 구조

```
gyul-biseo/
├── README.md                    # 이 파일
├── DEVELOPMENT.md               # 개발 방법론 & 코딩 표준
├── ARCHITECTURE.md              # 상세 아키텍처 문서
├── CHANGELOG.md                 # 변경 이력
├── .env.example                 # 환경 변수 템플릿
├── .gitignore
├── docker-compose.yml           # 로컬 개발 환경
├── pyproject.toml               # Python 프로젝트 설정
│
├── docs/                        # 상세 문서
│   ├── prd-v3.md                # 제품 요구사항 문서 (PRD V3)
│   ├── api-spec.md              # API 명세
│   ├── data-model.md            # 데이터 모델 ERD
│   ├── dialect-glossary.md      # 제주 방언·현장 은어 사전
│   └── agent-prompts.md         # LLM 프롬프트 설계 문서
│
├── backend/                     # FastAPI 백엔드
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 엔트리포인트
│   │   ├── config.py            # 설정 관리
│   │   │
│   │   ├── api/                 # API 라우터
│   │   │   ├── __init__.py
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── kakao.py     # 카카오톡 웹훅 엔드포인트
│   │   │   │   ├── records.py   # 출하 기록 CRUD
│   │   │   │   ├── settlements.py # 정산 API
│   │   │   │   ├── agri_log.py  # 영농일지 API
│   │   │   │   └── labor.py     # 인력 관리 API
│   │   │   └── health.py        # 헬스체크
│   │   │
│   │   ├── agents/              # LangGraph 에이전트
│   │   │   ├── __init__.py
│   │   │   ├── graph.py         # 메인 에이전트 그래프
│   │   │   ├── state.py         # 대화 상태 정의
│   │   │   ├── router.py        # 인텐트 라우터
│   │   │   ├── nodes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── record_agent.py    # 출하 기록 에이전트
│   │   │   │   ├── correct_agent.py   # 수정/삭제 에이전트
│   │   │   │   ├── query_agent.py     # 조회/미수금 에이전트
│   │   │   │   ├── agri_log_agent.py  # 영농일지 에이전트
│   │   │   │   └── labor_agent.py     # 인력 관리 에이전트
│   │   │   └── prompts/
│   │   │       ├── __init__.py
│   │   │       ├── system_prompt.py
│   │   │       ├── entity_extraction.py
│   │   │       └── clarification.py
│   │   │
│   │   ├── models/              # DB 모델 (SQLAlchemy)
│   │   │   ├── __init__.py
│   │   │   ├── shipment.py      # 출하 기록
│   │   │   ├── customer.py      # 거래처
│   │   │   ├── settlement.py    # 정산
│   │   │   ├── agri_log.py      # 영농일지
│   │   │   └── labor.py         # 인력
│   │   │
│   │   ├── schemas/             # Pydantic 스키마
│   │   │   ├── __init__.py
│   │   │   ├── kakao.py         # 카카오 메시지 스키마
│   │   │   ├── shipment.py
│   │   │   ├── settlement.py
│   │   │   └── agent.py
│   │   │
│   │   ├── services/            # 비즈니스 로직
│   │   │   ├── __init__.py
│   │   │   ├── stt_service.py   # STT (음성→텍스트)
│   │   │   ├── ocr_service.py   # OCR (사진→텍스트)
│   │   │   ├── kakao_service.py # 카카오 메시지 발송
│   │   │   └── settlement_service.py # 정산서 생성
│   │   │
│   │   ├── db/                  # DB 연결
│   │   │   ├── __init__.py
│   │   │   ├── session.py       # SQLAlchemy 세션
│   │   │   └── vector_store.py  # ChromaDB 연결
│   │   │
│   │   └── utils/               # 공통 유틸
│   │       ├── __init__.py
│   │       ├── dialect_parser.py # 방언/은어 전처리
│   │       ├── entity_extractor.py # 엔티티 추출
│   │       └── logger.py        # 로깅 설정
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── test_agents/
│   │   ├── test_api/
│   │   └── test_services/
│   │
│   ├── migrations/              # Alembic DB 마이그레이션
│   │   ├── env.py
│   │   ├── versions/
│   │   └── alembic.ini
│   │
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                    # 모바일 웹뷰 (Next.js)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx         # 대시보드 (출하 현황)
│   │   │   ├── settlements/     # 정산 관리
│   │   │   ├── agri-log/        # 영농일지
│   │   │   └── labor/           # 인력 관리
│   │   ├── components/
│   │   ├── lib/
│   │   └── styles/
│   ├── package.json
│   └── Dockerfile
│
└── scripts/                     # 운영 스크립트
    ├── seed_dialect_glossary.py # 방언 사전 초기화
    ├── backup_db.sh
    └── deploy.sh
```

---

## 🛠 기술 스택

| 레이어 | 기술 | 선택 이유 |
|--------|------|-----------|
| **AI 언어 모델** | GPT-4o / Llama 3.1 | 한국어 구어체·방언 이해도 |
| **에이전트 프레임워크** | LangGraph | 상태 기반 멀티에이전트 대화 흐름 |
| **백엔드** | FastAPI (Python 3.11) | 비동기 고성능, 타입 안전성 |
| **관계형 DB** | PostgreSQL 16 | 출하/정산/인력 정형 데이터 |
| **벡터 DB** | ChromaDB | 영농 컨텍스트 의미 검색 |
| **STT** | Clova Speech / OpenAI Whisper | 한국어 현장 음성 |
| **OCR** | Naver Clova OCR | 한글 수기 인식 |
| **메신저 인터페이스** | 카카오 i Open Builder | 5070 접근성 최우선 |
| **프론트엔드** | Next.js 14 (App Router) | 모바일 웹뷰 대시보드 |
| **컨테이너** | Docker + Docker Compose | 환경 일관성 |
| **마이그레이션** | Alembic | PostgreSQL 스키마 관리 |

---

## 🚀 시작하기

### 사전 요구사항

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (또는 Docker로 실행)

### 로컬 개발 환경 실행

```bash
# 1. 저장소 클론
git clone https://github.com/yonghwan-ko02/gyul-biseo.git
cd gyul-biseo

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 API 키 등 필요한 값 입력

# 3. Docker로 인프라 실행 (DB, ChromaDB)
docker-compose up -d postgres chromadb

# 4. Python 가상환경 설정
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 5. DB 마이그레이션
alembic upgrade head

# 6. 방언 사전 초기화
python ../scripts/seed_dialect_glossary.py

# 7. 백엔드 실행
uvicorn app.main:app --reload --port 8000

# 8. (별도 터미널) 프론트엔드 실행
cd frontend
npm install
npm run dev
```

---

## 🔐 환경 변수 설정

`.env.example` → `.env` 복사 후 아래 값을 채워주세요:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Kakao
KAKAO_REST_API_KEY=...
KAKAO_CHANNEL_SECRET=...
KAKAO_BOT_ID=...

# Naver Clova (STT / OCR)
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...

# PostgreSQL
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/gyul_biseo

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8001

# App
SECRET_KEY=...
ENVIRONMENT=development
```

---

## 📚 개발 가이드

상세한 개발 가이드는 [DEVELOPMENT.md](./DEVELOPMENT.md)를 참조하세요.

- 코딩 컨벤션 및 네이밍 규칙
- 에이전트 개발 패턴
- 오류 처리 표준
- 테스트 작성 가이드

---

## 📡 API 문서

서버 실행 후 아래 URL에서 자동 생성된 API 문서를 확인:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## 🤝 기여 가이드

1. `main` 브랜치에서 `feature/기능명` 브랜치 생성
2. 커밋 메시지는 [Conventional Commits](https://www.conventionalcommits.org/) 형식 준수
3. PR 전 `pytest` 및 `ruff` 통과 확인
4. PR 템플릿에 따라 변경 사항 기술

---

## 📄 라이선스

MIT License — [LICENSE](./LICENSE) 참조

---

*귤비서 팀 🍊 | 제주 감귤 농가의 디지털 전환을 응원합니다*
