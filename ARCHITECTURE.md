# 귤비서 상세 아키텍처 문서

> 이 문서는 시스템의 기술적 설계 결정과 컴포넌트 상호작용을 상세히 기술합니다.

---

## 1. 시스템 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         사용자 레이어                            │
│  [카카오톡 앱]  ←──────────────────────────────→  [모바일 웹뷰] │
└───────────┬─────────────────────────────────────────────┬───────┘
            │ 음성/텍스트/사진                             │ HTTP
            ▼                                             ▼
┌───────────────────────┐                    ┌────────────────────┐
│  Kakao i Open Builder │                    │   Next.js Frontend │
│  (챗봇 빌더·라우팅)    │                    │   (대시보드 웹뷰)   │
└──────────┬────────────┘                    └────────┬───────────┘
           │ HTTPS Webhook                            │ REST API
           ▼                                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FastAPI Gateway                              │
│  POST /api/v1/kakao/webhook   GET /api/v1/records  ...           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  Request Pipeline                           │ │
│  │  1. 카카오 서명 검증 → 2. 미디어 전처리 → 3. 에이전트 호출  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────┬────────────────────────────────────┬──────────────┘
               │                                    │
    ┌──────────┴──────────┐              ┌──────────┴──────────┐
    │   미디어 처리 서비스  │              │   LangGraph 에이전트  │
    │  ┌────────────────┐ │              │  (대화 상태 관리)     │
    │  │ STT Service    │ │              └──────────┬──────────┘
    │  │ (Clova/Whisper)│ │                         │
    │  ├────────────────┤ │         ┌───────────────┼──────────────┐
    │  │ OCR Service    │ │         ▼               ▼              ▼
    │  │ (Clova OCR)    │ │    [Intent      [Record      [Query
    │  └────────────────┘ │    Router]      Agent]       Agent]
    └─────────────────────┘         │               │              │
                                    ▼               ▼              ▼
                              [Correct     [AgriLog     [Labor
                               Agent]       Agent]      Agent]
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             [PostgreSQL]     [ChromaDB]    [KakaoTalk
             (정형 데이터)    (벡터 검색)    Message API]
```

---

## 2. 대화 흐름 상세 (LangGraph)

### 2.1 그래프 구조

```
START
  │
  ▼
[router_node]  ← 인텐트 분류 (LLM)
  │
  ├── "record"    → [entity_extract_node] → [clarify_node?] → [record_node] → END
  ├── "correct"   → [find_target_node] → [ambiguity_check_node?] → [correct_node] → END
  ├── "query"     → [query_node] → [settlement_offer_node?] → END
  ├── "agri_log"  → [agri_log_node] → END
  ├── "labor"     → [labor_node] → END
  └── "unknown"   → [fallback_node] → END
```

### 2.2 출하 기록 흐름 (Record Flow)

```
사용자 입력: "청과로 한라봉 5킬 상짜리 50박스 보냈어"
    │
    ▼
[dialect_normalize]        "조생" → "조생 온주", "5킬" → "5kg"
    │
    ▼
[intent_classify]          → "record"
    │
    ▼
[entity_extract]           품종: 한라봉, 규격: 5kg/상, 수량: 50
                           거래처: 청과, 단가: None ← 누락!
    │
    ▼
[completeness_check]       단가 누락 감지
    │  is_complete=False
    ▼
[clarify_node]             "단가를 말씀해 주세요. 이전에 3만 원이었는데 동일한가요?"
    │
    │ 사용자: "3만 원으로 해"
    ▼
[entity_merge]             단가: 30,000 추가
    │
    ▼
[record_node]              DB 저장 (PostgreSQL)
    │
    ▼
[confirm_message]          "서귀포 청과 한라봉 5kg/상 50박스 단가 3만 원,
                           미수금 150만 원으로 기록했습니다 👍"
```

### 2.3 자연어 수정 흐름 (Correct Flow)

```
사용자 입력: "아까 청과로 보낸 거 50박스가 아니라 40박스야 수정해 줘"
    │
    ▼
[intent_classify]          → "correct"
    │
    ▼
[find_target_node]         최근 기록 + 키워드(청과, 50박스) 매칭
    │
    ├── 1건 매칭 → 바로 수정 진행
    ├── 2건+ 매칭 → [ambiguity_resolve_node] 후보 목록 제시
    └── 0건 매칭 → "해당 기록을 찾지 못했습니다" + 재입력 유도
    │
    ▼
[correct_node]             수량 50 → 40, 미수금 150만 → 120만 재계산
    │
    ▼
[confirm_message]          "서귀포 청과 한라봉 수량을 40박스로,
                           미수금을 120만 원으로 수정했습니다 ✏️"
```

---

## 3. 데이터 모델

### 3.1 핵심 엔티티 관계도

```
[farmers] 1──────────N [customers]
    │                       │
    │                       │
    1                       1
    │                       │
    N                       N
[shipments] N───────1 [customers]
    │
    1
    │
    N
[settlements]

[farmers] 1──N [agri_logs]
[farmers] 1──N [labor_records]
```

### 3.2 주요 테이블 스키마

**shipments (출하 기록)**
```sql
CREATE TABLE shipments (
    id              SERIAL PRIMARY KEY,
    farmer_id       INT NOT NULL REFERENCES farmers(id),
    customer_id     INT NOT NULL REFERENCES customers(id),
    variety         VARCHAR(50) NOT NULL,   -- 품종 (한라봉, 노지 등)
    grade           VARCHAR(20),            -- 등급 (상, 중, 하, 로얄과)
    weight_kg       DECIMAL(5,1),           -- 규격 (3, 5, 10 kg)
    quantity        INT NOT NULL,           -- 수량 (박스)
    unit_price      INT,                    -- 단가 (원)
    total_amount    INT GENERATED ALWAYS AS (quantity * unit_price) STORED,
    is_paid         BOOLEAN DEFAULT FALSE,
    paid_amount     INT DEFAULT 0,
    unpaid_amount   INT GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    memo            TEXT,                   -- 원문 음성 입력 보관
    raw_input       TEXT,                   -- STT 원문 보관 (디버깅용)
    -- Soft Delete
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

**customers (거래처)**
```sql
CREATE TABLE customers (
    id              SERIAL PRIMARY KEY,
    farmer_id       INT NOT NULL REFERENCES farmers(id),
    name            VARCHAR(100) NOT NULL,  -- 이름 (영철이, 서귀포 청과)
    alias           VARCHAR(100)[],         -- 별명 배열 (삼춘, 영철이 형)
    phone           VARCHAR(20),
    kakao_user_id   VARCHAR(100),           -- 카카오 발송용
    customer_type   VARCHAR(20),            -- 'direct' | 'wholesale' | 'acquaintance'
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

**settlements (정산)**
```sql
CREATE TABLE settlements (
    id              SERIAL PRIMARY KEY,
    shipment_id     INT NOT NULL REFERENCES shipments(id),
    amount          INT NOT NULL,           -- 입금액
    payment_method  VARCHAR(20),            -- 'transfer' | 'cash' | 'other'
    memo            TEXT,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## 4. 카카오 i Open Builder 연동

### 4.1 메시지 타입 사용 기준

| 상황 | 사용 타입 |
|------|-----------|
| 단순 확인/복창 | `simpleText` |
| 되묻기 (선택지 있음) | `simpleText` + `quickReplies` |
| 미수금 목록 | `listCard` |
| 정산서 미리보기 | `basicCard` |
| 오류 안내 | `simpleText` |

### 4.2 퀵 리플라이 품종 선택 (폴백 UI)

```json
{
  "quickReplies": [
    {"label": "🍊 노지", "action": "message", "messageText": "노지"},
    {"label": "🍋 황금향", "action": "message", "messageText": "황금향"},
    {"label": "🍑 한라봉", "action": "message", "messageText": "한라봉"},
    {"label": "❤️ 레드향", "action": "message", "messageText": "레드향"},
    {"label": "🌿 타이벡", "action": "message", "messageText": "타이벡"}
  ]
}
```

### 4.3 웹훅 처리 흐름

```
POST /api/v1/kakao/webhook
    │
    ▼
1. X-Hub-Signature 검증 (HMAC-SHA256)
    │
    ▼
2. 미디어 타입 판별
   ├── text → 직접 처리
   ├── audio → STT 변환 후 처리
   └── image → OCR 변환 후 처리
    │
    ▼
3. 방언 정규화 (dialect_parser)
    │
    ▼
4. LangGraph 에이전트 호출 (비동기, 5초 제한)
    │
    ├── 5초 이내 완료 → 즉시 응답
    └── 5초 초과 우려 → "처리 중이에요 🔄" 즉시 응답
                         → 완료 후 Push 메시지 발송
```

---

## 5. 방언·은어 처리 전략

### 5.1 처리 레이어

```
원문 입력
    │
    ▼
[1단계] 음성 전처리 (소음 필터링)
    │
    ▼
[2단계] 방언 사전 치환 (규칙 기반, O(1))
    예: "콘테나" → "컨테이너", "5킬" → "5kg", "삼만" → "30000"
    │
    ▼
[3단계] LLM 엔티티 추출 (의미 이해)
    예: "상짜리" → grade="상", "보냈어" → action="record"
    │
    ▼
[4단계] 정형 데이터 저장
```

### 5.2 방언 사전 관리

- 위치: `docs/dialect-glossary.md` + DB 테이블 `dialect_glossary`
- 추가 방법: 농장주 피드백 → PR → 사전 업데이트
- 사전 우선순위: DB > 파일 > 기본값

---

## 6. 정산서 공유 플로우

```
사용자: "청과 미수금 정산서 보내줘"
    │
    ▼
[query_agent] DB 조회: customer='청과', is_paid=False
    │
    ▼
응답: "서귀포 청과 미수금 내역:
       - 한라봉 5kg 상 45박스 × 3만원 = 135만원 (2026-01-15)
       총 미수금: 135만원
       
       [📄 정산서 카카오로 보내기] ← 버튼"
    │
    │ 사용자가 버튼 클릭
    ▼
[settlement_service] 정산서 메시지 생성
    │
    ▼
[kakao_message_api] 청과 담당자 카카오로 발송
    │
    ▼
"정산서를 서귀포 청과 담당자님께 발송했습니다 ✅
 계좌: 농협 xxx-xxxx-xxxx-xx (홍길동)"
```

---

## 7. 향후 확장 아키텍처 (참고용)

```
Phase ∞: 오픈뱅킹 자동 매칭

[은행 입금 알림] ──SMS/API──▶ [입금 감지 서비스]
                                       │
                                       ▼
                               [매칭 알고리즘]
                               금액 + 입금인명 → 미수금 레코드
                                       │
                                       ▼
                               자동 정산 처리 + 알림
```

---

*마지막 수정: 2026-05-27*
