"""
LangGraph 대화 에이전트 상태 정의

에이전트 그래프의 모든 노드는 이 상태를 공유합니다.
상태 변경은 노드 반환값(dict)으로만 이루어져야 합니다.
"""
from typing import Annotated, Optional, Any
from pydantic import BaseModel, Field
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class PendingEntity(BaseModel):
    """추출 중이거나 완성 대기 중인 엔티티 (DB 미저장 상태)"""
    variety: Optional[str] = None        # 품종
    grade: Optional[str] = None          # 등급
    weight_kg: Optional[float] = None    # 규격 (kg)
    quantity: Optional[int] = None       # 수량 (박스)
    unit_price: Optional[int] = None     # 단가 (원)
    customer_name: Optional[str] = None  # 거래처명 (아직 ID 미확정)
    is_paid: Optional[bool] = None       # 정산 여부
    shipped_at: Optional[str] = None     # 출하 일시 (ISO 형식)
    memo: Optional[str] = None           # 추가 메모

    def missing_fields(self) -> list[str]:
        """필수 필드 중 누락된 것 반환 (되묻기용)"""
        required = {
            "variety": "품종",
            "quantity": "수량(박스)",
            "customer_name": "거래처",
        }
        return [label for field, label in required.items() if getattr(self, field) is None]

    def is_complete(self) -> bool:
        """필수 정보가 모두 채워졌는지 확인"""
        return len(self.missing_fields()) == 0


class AgentState(BaseModel):
    """귤비서 대화 에이전트 전역 상태.

    모든 LangGraph 노드는 이 상태를 읽고, dict를 반환하여 업데이트합니다.
    상태는 카카오톡 세션 단위로 유지됩니다.
    """
    # ── 대화 이력 (자동 append) ──────────────────────
    messages: Annotated[list[BaseMessage], add_messages] = Field(default_factory=list)

    # ── 세션 정보 ─────────────────────────────────────
    kakao_user_id: str                           # 카카오 사용자 ID
    farmer_id: Optional[int] = None             # DB의 farmer ID (첫 메시지 후 확정)

    # ── 인텐트 ────────────────────────────────────────
    intent: Optional[str] = None
    # "record" | "correct" | "delete" | "query" | "agri_log" | "labor" | "unknown"

    # ── 기록(Record) 관련 ─────────────────────────────
    pending_entity: Optional[PendingEntity] = None    # 입력 중인 엔티티
    clarification_count: int = 0                      # 현재 되묻기 횟수
    is_clarifying: bool = False                       # 되묻기 진행 중

    # ── 수정/삭제(Correct) 관련 ───────────────────────
    target_record_id: Optional[int] = None            # 수정 대상 레코드 ID
    correction_field: Optional[str] = None            # 수정할 필드명
    correction_value: Optional[Any] = None            # 수정할 값

    # ── 마지막 처리 결과 (컨텍스트 유지용) ──────────────
    last_processed_record_id: Optional[int] = None
    last_intent: Optional[str] = None

    # ── 원문 입력 보관 (디버깅·로깅용) ──────────────────
    raw_input: Optional[str] = None
    normalized_input: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True
