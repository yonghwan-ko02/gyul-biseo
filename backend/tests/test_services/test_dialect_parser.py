"""
방언 파서 단위 테스트

새 방언 표현 발견 시 테스트 케이스를 먼저 추가하고,
이후 dialect_parser.py를 수정하세요. (TDD 권장)
"""
import pytest
from app.utils.dialect_parser import normalize_dialect, extract_quantity_from_text


class TestDialectNormalization:
    """방언·은어 정규화 테스트"""

    @pytest.mark.parametrize(
        "input_text, expected_fragment",
        [
            ("5킬 박스", "5kg 박스"),
            ("5킬로 상짜리", "5kg 상"),
            ("콘테나로 보냄", "컨테이너로 보냄"),
            ("컨테나로 보냄", "컨테이너로 보냄"),
            ("노지귤 50박스", "노지 온주 50박스"),
            ("한라봉귤 상짜리", "한라봉 상"),
            ("로열과 10박스", "로얄과 10박스"),
            ("삼만 원 받았어", "30000원 받았어"),
        ],
    )
    def test_basic_normalization(self, input_text: str, expected_fragment: str) -> None:
        result = normalize_dialect(input_text)
        assert expected_fragment in result, f"입력: {input_text!r} → 결과: {result!r}"

    def test_extra_map_takes_priority(self) -> None:
        """DB 사전이 기본 사전보다 우선 적용되는지 확인"""
        extra_map = {"나까마": "도매 중간상인"}
        result = normalize_dialect("나까마한테 보냄", extra_map=extra_map)
        assert "도매 중간상인" in result

    def test_no_change_for_standard_text(self) -> None:
        """표준어 입력은 변경 없이 반환"""
        text = "한라봉 5kg 상 50박스 30000원"
        result = normalize_dialect(text)
        assert result == text


class TestQuantityExtraction:
    """수량 추출 테스트"""

    @pytest.mark.parametrize(
        "text, expected",
        [
            ("50박스", 50),
            ("50 박스", 50),
            ("100개", 100),
            ("30상자 보냈어", 30),
        ],
    )
    def test_quantity_extraction(self, text: str, expected: int) -> None:
        result = extract_quantity_from_text(text)
        assert result == expected

    def test_no_quantity_returns_none(self) -> None:
        result = extract_quantity_from_text("오늘 밭에 비료 줬어")
        assert result is None
