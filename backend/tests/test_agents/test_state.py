"""
AgentState 단위 테스트
"""
import pytest
from app.agents.state import AgentState, PendingEntity


class TestPendingEntity:
    """PendingEntity 필수 필드 검증 테스트"""

    def test_complete_entity_is_valid(self) -> None:
        entity = PendingEntity(
            variety="한라봉",
            quantity=50,
            customer_name="서귀포 청과",
            unit_price=30000,
        )
        assert entity.is_complete() is True
        assert entity.missing_fields() == []

    def test_missing_variety(self) -> None:
        entity = PendingEntity(quantity=50, customer_name="청과")
        assert entity.is_complete() is False
        assert "품종" in entity.missing_fields()

    def test_missing_quantity_and_customer(self) -> None:
        entity = PendingEntity(variety="한라봉")
        missing = entity.missing_fields()
        assert "수량(박스)" in missing
        assert "거래처" in missing

    def test_empty_entity_has_all_required_missing(self) -> None:
        entity = PendingEntity()
        missing = entity.missing_fields()
        assert len(missing) == 3  # variety, quantity, customer_name


class TestAgentState:
    """AgentState 초기화 및 기본 동작 테스트"""

    def test_default_state(self) -> None:
        state = AgentState(kakao_user_id="test_user_123")
        assert state.kakao_user_id == "test_user_123"
        assert state.intent is None
        assert state.is_clarifying is False
        assert state.clarification_count == 0
        assert state.messages == []
