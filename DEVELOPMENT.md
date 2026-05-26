# 귤비서 개발 방법론 & 코딩 표준

> 이 문서는 프로젝트 전체에 걸쳐 **일관성** 있는 개발을 위해 모든 기여자가 반드시 숙지·준수해야 하는 살아있는 참조 문서입니다.  
> AI 코딩 어시스턴트(Antigravity 등)도 이 문서를 우선 참조하여 코드를 생성해야 합니다.

---

## 목차

1. [개발 철학](#1-개발-철학)
2. [브랜치 전략](#2-브랜치-전략)
3. [커밋 컨벤션](#3-커밋-컨벤션)
4. [Python 코딩 표준](#4-python-코딩-표준)
5. [에이전트(LangGraph) 개발 패턴](#5-에이전트langgraph-개발-패턴)
6. [오류 처리 표준](#6-오류-처리-표준)
7. [API 설계 원칙](#7-api-설계-원칙)
8. [데이터베이스 규칙](#8-데이터베이스-규칙)
9. [테스트 전략](#9-테스트-전략)
10. [보안 체크리스트](#10-보안-체크리스트)
11. [성능 지침](#11-성능-지침)
12. [축소·리팩토링 판단 기준](#12-축소리팩토링-판단-기준)

---

## 1. 개발 철학

### 핵심 원칙 (절대 타협 불가)

| 원칙 | 설명 |
|------|------|
| **농장주 최우선** | 모든 기능은 50~70대 사용자가 실수 없이 쓸 수 있는지 먼저 검증 |
| **음성 중심 설계** | UI/UX의 기본 흐름은 항상 "음성 → 처리 → 복창"이어야 함 |
| **데이터 안전성** | 출하·정산 데이터는 절대 소실되지 않아야 함 (Soft Delete 원칙) |
| **점진적 확장** | MVP → 기능 추가. 한 번에 모든 것을 만들려 하지 말 것 |
| **명시적 복창** | AI 응답은 반드시 처리 결과를 요약 복창하여 사용자가 확인 가능하게 함 |

### 개발 단계 (Phase)

```
Phase 1 (MVP): 음성 기록 → DB 저장 → 기본 조회
Phase 2:       Natural Language CRUD (수정/삭제)
Phase 3:       정산서 생성 → 카카오톡 발송
Phase 4:       영농일지 자동화 + 인력 관리
Phase 5:       대시보드 웹뷰 + 분석 차트
Phase ∞:       오픈뱅킹 자동 매칭 (향후)
```

> **현재 Phase를 항상 `CHANGELOG.md` 상단에 명시할 것**

---

## 2. 브랜치 전략

```
main           ← 항상 배포 가능한 상태 유지
├── develop    ← 통합 개발 브랜치
│   ├── feature/record-agent       ← 기능 개발
│   ├── feature/settlement-share
│   ├── fix/stt-noise-handling     ← 버그 수정
│   └── chore/update-deps          ← 의존성·설정 변경
└── hotfix/urgent-fix              ← 긴급 수정 (main에서 분기)
```

### 브랜치 명명 규칙

- `feature/{기능명}` — 새 기능
- `fix/{버그명}` — 버그 수정
- `refactor/{대상}` — 리팩토링
- `chore/{작업명}` — 설정, 의존성, 빌드
- `docs/{문서명}` — 문서 작업
- `test/{테스트명}` — 테스트 추가

---

## 3. 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/) 준수.

```
<type>(<scope>): <subject>

[optional body]
[optional footer]
```

### Type 목록

| Type | 사용 시점 |
|------|-----------|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서만 변경 |
| `style` | 포매팅, 세미콜론 등 (로직 변경 없음) |
| `refactor` | 기능 변경 없는 코드 개선 |
| `test` | 테스트 추가·수정 |
| `chore` | 빌드·의존성·CI 변경 |
| `perf` | 성능 개선 |

### Scope 목록 (이 프로젝트 한정)

`agent`, `api`, `db`, `stt`, `ocr`, `kakao`, `settlement`, `agri-log`, `labor`, `frontend`

### 예시

```
feat(agent): 출하 기록 에이전트 누락 정보 되묻기 로직 추가
fix(stt): 현장 소음 환경 fallback 퀵 리플라이 처리 오류 수정
docs(prd): PRD V3 방언 사전 섹션 추가
```

---

## 4. Python 코딩 표준

### 환경

- Python **3.11** 이상
- 린터: `ruff` (flake8 + isort 대체)
- 포매터: `black` (line-length=88)
- 타입 체커: `mypy` (strict 모드)

### 설정 (`pyproject.toml`)

```toml
[tool.ruff]
line-length = 88
select = ["E", "W", "F", "I", "B", "C4", "UP"]
ignore = ["E501"]

[tool.black]
line-length = 88
target-version = ["py311"]

[tool.mypy]
python_version = "3.11"
strict = true
ignore_missing_imports = true
```

### 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 변수·함수 | `snake_case` | `get_unpaid_amount()` |
| 클래스 | `PascalCase` | `ShipmentRecord` |
| 상수 | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT = 3` |
| 파일 | `snake_case.py` | `dialect_parser.py` |
| DB 컬럼 | `snake_case` | `unpaid_amount` |
| API 경로 | `kebab-case` | `/api/v1/agri-log` |

### 타입 힌트 필수

```python
# ✅ 올바른 예
async def get_customer_debt(
    customer_id: int,
    db: AsyncSession,
) -> CustomerDebtResponse:
    ...

# ❌ 금지
def get_customer_debt(customer_id, db):
    ...
```

### 모듈 임포트 순서

```python
# 1. 표준 라이브러리
import os
from datetime import datetime
from typing import Optional

# 2. 서드파티
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from langgraph.graph import StateGraph

# 3. 내부 모듈
from app.models.shipment import Shipment
from app.schemas.shipment import ShipmentCreate
from app.services.kakao_service import send_kakao_message
```

### Docstring 형식 (Google Style)

```python
async def extract_shipment_entities(text: str) -> ShipmentEntity:
    """음성 텍스트에서 출하 엔티티를 추출합니다.

    제주 방언 및 현장 은어를 정규화한 후 LLM으로 엔티티를 파싱합니다.

    Args:
        text: 사용자가 입력한 원문 텍스트 (방언·구어체 포함 가능)

    Returns:
        파싱된 출하 엔티티 (품종, 규격, 수량, 단가, 거래처)

    Raises:
        EntityExtractionError: LLM 파싱 실패 시
        DialectNormalizationError: 방언 전처리 실패 시

    Example:
        >>> entity = await extract_shipment_entities(
        ...     "청과로 한라봉 5킬 상짜리 오십 박스 보냈어"
        ... )
        >>> entity.variety  # "한라봉"
        >>> entity.quantity  # 50
    """
```

---

## 5. 에이전트(LangGraph) 개발 패턴

### 상태(State) 설계 원칙

```python
# backend/app/agents/state.py
from typing import Annotated, Optional
from pydantic import BaseModel
from langgraph.graph.message import add_messages

class AgentState(BaseModel):
    """대화 에이전트의 전역 상태.
    
    모든 노드는 이 상태를 읽고 업데이트한다.
    """
    # 대화 이력 (자동 append)
    messages: Annotated[list, add_messages]
    
    # 현재 처리 중인 인텐트
    intent: Optional[str] = None  
    # "record" | "correct" | "query" | "agri_log" | "labor" | "clarify"
    
    # 추출된 엔티티 (아직 DB 미저장)
    pending_entity: Optional[dict] = None
    
    # 수정 대상 레코드 ID
    target_record_id: Optional[int] = None
    
    # 카카오 사용자 ID
    kakao_user_id: str
    
    # 되묻기 중인지 여부
    is_clarifying: bool = False
    
    # 마지막으로 처리한 레코드 ID (수정/삭제 컨텍스트용)
    last_processed_record_id: Optional[int] = None
```

### 노드(Node) 작성 규칙

```python
# 모든 노드는 async 함수
# 입력: AgentState → 출력: dict (상태 업데이트 분량)

async def record_node(state: AgentState) -> dict:
    """출하 기록을 DB에 저장하는 노드."""
    # 1. 엔티티 검증
    entity = state.pending_entity
    if not entity:
        return {"messages": [AIMessage("기록할 내용을 말씀해 주세요.")]}
    
    # 2. DB 저장
    # 3. 복창 메시지 생성
    # 4. 상태 업데이트 반환
    return {
        "messages": [AIMessage(confirmation_msg)],
        "pending_entity": None,
        "last_processed_record_id": saved_record.id,
    }
```

### 인텐트 라우터 패턴

```python
# 라우터는 단순 문자열 반환 (LangGraph 조건부 엣지용)
def route_intent(state: AgentState) -> str:
    intent = state.intent
    if intent == "record":
        return "record_node"
    elif intent == "correct":
        return "correct_node"
    elif intent == "query":
        return "query_node"
    elif state.is_clarifying:
        return "clarify_node"
    else:
        return "router_node"  # 재분류
```

### 되묻기(Clarification) 처리 원칙

1. **최대 2회** 되묻기 후 미완성이면 "죄송합니다, 다시 한번 말씀해 주시겠어요?" 처리
2. 되묻기 시 **퀵 리플라이 버튼**을 함께 제공 (품종 선택 등)
3. 컨텍스트는 `pending_entity`에 누적 저장
4. 되묻기 완료 후 반드시 **전체 내용 복창**

---

## 6. 오류 처리 표준

### 오류 계층 구조

```python
# backend/app/utils/exceptions.py

class GyulBiseoError(Exception):
    """귤비서 기본 예외 클래스"""
    def __init__(self, message: str, code: str):
        self.message = message
        self.code = code
        super().__init__(message)

# AI/에이전트 오류
class EntityExtractionError(GyulBiseoError):
    """LLM 엔티티 추출 실패"""
    pass

class IntentClassificationError(GyulBiseoError):
    """인텐트 분류 실패"""
    pass

class ClarificationLimitError(GyulBiseoError):
    """되묻기 횟수 초과"""
    pass

# 데이터 오류
class RecordNotFoundError(GyulBiseoError):
    """수정/삭제 대상 레코드 없음"""
    pass

class AmbiguousRecordError(GyulBiseoError):
    """수정 대상 레코드가 2개 이상 (명확화 필요)"""
    pass

# 외부 서비스 오류
class STTServiceError(GyulBiseoError):
    """음성 인식 서비스 오류"""
    pass

class KakaoMessageError(GyulBiseoError):
    """카카오 메시지 발송 실패"""
    pass
```

### 오류 처리 원칙

| 상황 | 처리 방법 |
|------|-----------|
| STT 실패 | 퀵 리플라이 버튼으로 폴백, 사용자에게 안내 |
| LLM 파싱 실패 | 되묻기 1회 → 실패 시 "다시 말씀해 주세요" |
| DB 저장 실패 | 3회 재시도 → 실패 시 임시 메모리 저장 + 알림 |
| 카카오 발송 실패 | 즉시 재시도 → 실패 시 대화창에 텍스트로 표시 |
| 수정 대상 모호 | 후보 목록을 보여주고 번호 선택 유도 |

### FastAPI 전역 예외 핸들러

```python
# backend/app/main.py

@app.exception_handler(RecordNotFoundError)
async def record_not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": exc.code, "message": exc.message}
    )

@app.exception_handler(GyulBiseoError)
async def gyul_biseo_error_handler(request, exc):
    logger.error(f"[{exc.code}] {exc.message}")
    return JSONResponse(
        status_code=400,
        content={"error": exc.code, "message": exc.message}
    )
```

### 카카오톡 응답 오류 메시지 톤

> 농장주 눈높이에 맞는 친근하고 명확한 언어 사용

```
✅ 성공: "서귀포 청과 한라봉 45박스 미수금 135만 원으로 저장했습니다 👍"
⚠️ 되묻기: "품종이 노지인지 황금향인지 말씀해 주시겠어요?"
❌ 실패: "죄송합니다, 방금 말씀이 잘 안 들렸어요. 다시 한번 말씀해 주세요."
🔄 재시도: "잠깐 문제가 생겼어요. 곧 다시 시도할게요 🙏"
```

---

## 7. API 설계 원칙

### URL 구조

```
/api/v1/{resource}/{id}/{sub-resource}
```

### 응답 형식 통일

```python
# 성공
{
    "success": true,
    "data": { ... },
    "message": "처리 완료"
}

# 오류
{
    "success": false,
    "error": "RECORD_NOT_FOUND",
    "message": "해당 출하 기록을 찾을 수 없습니다."
}

# 목록
{
    "success": true,
    "data": [...],
    "pagination": {
        "total": 100,
        "page": 1,
        "size": 20
    }
}
```

### 카카오 웹훅 응답 형식

카카오 i Open Builder 스킬 서버 응답 형식 준수:

```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "서귀포 청과 한라봉 45박스 저장 완료!"
        }
      }
    ],
    "quickReplies": [
      {"label": "노지", "action": "message", "messageText": "노지"},
      {"label": "황금향", "action": "message", "messageText": "황금향"}
    ]
  }
}
```

---

## 8. 데이터베이스 규칙

### Soft Delete 원칙 (필수)

> **출하·정산 데이터는 절대 물리 삭제하지 않는다.**

```python
# 모든 핵심 모델에 추가
class BaseModel(Base):
    __abstract__ = True
    
    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(default=None)
    is_deleted: Mapped[bool] = mapped_column(default=False)

# 삭제 시
record.is_deleted = True
record.deleted_at = datetime.utcnow()
# 물리 DELETE 금지!
```

### 마이그레이션 규칙

- Alembic으로만 스키마 변경
- 마이그레이션 파일에 **되돌리기(downgrade) 함수 반드시 작성**
- 컬럼 삭제는 3단계로: ①사용 중단 ②데이터 백업 ③실제 삭제

### 인덱스 필수 컬럼

```sql
-- 자주 조회하는 컬럼에 인덱스 필수
CREATE INDEX idx_shipment_customer_id ON shipments(customer_id);
CREATE INDEX idx_shipment_created_at ON shipments(created_at);
CREATE INDEX idx_shipment_is_deleted ON shipments(is_deleted);
CREATE INDEX idx_settlement_unpaid ON settlements(is_paid, customer_id);
```

---

## 9. 테스트 전략

### 테스트 피라미드

```
         [E2E 테스트]
          (카카오 시뮬레이터)
         ────────────────
       [통합 테스트]
       (API + DB + Agent)
      ──────────────────────
    [단위 테스트]
    (파서, 엔티티 추출, 서비스)
   ──────────────────────────────
```

### 필수 테스트 케이스

**방언 파서 테스트**
```python
# tests/test_services/test_dialect_parser.py

@pytest.mark.parametrize("input,expected", [
    ("콘테나", "컨테이너"),
    ("조생", "조생 온주"),
    ("로얄과", "로얄과"),
    ("오십 박스", 50),
    ("삼만원", 30000),
])
def test_dialect_normalization(input, expected):
    result = normalize_dialect(input)
    assert result == expected
```

**에이전트 되묻기 테스트**
```python
async def test_clarification_triggered_on_missing_variety():
    """품종 누락 시 되묻기가 발동되는지 확인"""
    state = AgentState(
        messages=[HumanMessage("영철이네 귤 20박스 보냄")],
        kakao_user_id="test_user"
    )
    result = await agent_graph.ainvoke(state)
    assert result["is_clarifying"] == True
    assert "품종" in result["messages"][-1].content
```

**Natural Language CRUD 테스트**
```python
async def test_correct_quantity_by_natural_language():
    """자연어로 수량 수정이 정확히 처리되는지 확인"""
    # 먼저 기록 생성
    # 그 다음 수정 메시지 전송
    # 수정된 값 DB 확인
```

### 테스트 실행

```bash
# 전체
pytest backend/tests/ -v

# 특정 모듈
pytest backend/tests/test_agents/ -v

# 커버리지
pytest --cov=app --cov-report=html backend/tests/
```

### 커버리지 목표

| 레이어 | 목표 |
|--------|------|
| 방언 파서 | 95%+ |
| 엔티티 추출 | 90%+ |
| API 엔드포인트 | 85%+ |
| 에이전트 노드 | 80%+ |

---

## 10. 보안 체크리스트

- [ ] 카카오 웹훅 서명 검증 필수 (`X-Hub-Signature`)
- [ ] API 키는 절대 코드에 하드코딩 금지 (`.env`만 사용)
- [ ] `.env` 파일 `.gitignore`에 반드시 포함
- [ ] SQL 쿼리는 반드시 파라미터 바인딩 사용 (SQLAlchemy ORM)
- [ ] 사용자 음성 데이터는 처리 후 즉시 삭제
- [ ] 정산서 공유 시 거래처 정보 노출 최소화
- [ ] 관리자 API에 JWT 인증 적용

---

## 11. 성능 지침

### 카카오 웹훅 응답 시간 제한

> 카카오 i Open Builder: **5초 이내** 응답 필수  
> 초과 시 타임아웃 오류 발생

```python
# 5초 제한 내 처리 전략
# 1. LLM 호출은 비동기(async/await) 필수
# 2. DB 쿼리는 asyncpg 비동기 드라이버 사용
# 3. 5초 초과 우려 시 "처리 중..." 즉시 응답 후 푸시 메시지로 결과 전달
```

### 캐싱 전략

```python
# 방언 사전: 서버 시작 시 메모리 로드 (변경 드묾)
# 거래처 목록: Redis/In-memory 캐시 (5분 TTL)
# LLM 동일 입력: 결과 캐시 고려 (비용 절감)
```

---

## 12. 축소·리팩토링 판단 기준

### 코드 축소(Simplification)가 필요한 신호

| 신호 | 기준 |
|------|------|
| 함수 길이 | 50줄 초과 시 분리 검토 |
| 중첩 깊이 | 3단계 이상 중첩 시 추출 |
| 파라미터 수 | 5개 초과 시 객체로 묶기 |
| 중복 코드 | 3회 이상 반복 시 함수화 |
| 에이전트 노드 | 단일 책임 벗어나면 분리 |

### 리팩토링 우선순위

1. **안전성 먼저**: 출하·정산 데이터 처리 코드는 보수적으로 리팩토링
2. **테스트 먼저**: 리팩토링 전 해당 기능 테스트 커버리지 80% 확보
3. **기능 보존**: 리팩토링은 기능 변경이 아님을 PR에 명시

### AI 코드 생성 시 주의사항

> AI(Antigravity 등)가 코드를 생성할 때 반드시 지켜야 할 사항:

1. **이 문서(DEVELOPMENT.md)를 먼저 읽고 패턴에 맞게 생성**
2. **오류 처리 없이 해피패스만 구현하지 말 것**
3. **타입 힌트 없는 코드 생성 금지**
4. **새 파일 생성 시 디렉터리 구조(README.md) 준수**
5. **DB 데이터 물리 삭제 코드 절대 생성 금지**
6. **카카오 응답은 5초 제한 고려한 비동기 코드로 생성**

---

*이 문서는 프로젝트 진행에 따라 지속적으로 업데이트됩니다. 마지막 수정: 2026-05-27*
