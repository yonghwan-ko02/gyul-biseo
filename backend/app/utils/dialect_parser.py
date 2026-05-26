"""
방언 및 현장 은어 정규화 파서

음성 입력 텍스트에서 제주 방언, 현장 은어를 표준어로 변환합니다.
사전은 DB에서 우선 로드하며, DB 미연결 시 파일 기반 사전을 폴백으로 사용합니다.

사용 예:
    normalized = normalize_dialect("청과로 한라봉 5킬 상짜리 오십 박스 보냈어")
    # → "청과로 한라봉 5kg 상 50 박스 보냈어"
"""
import re
from typing import Optional

# ─────────────────────────────────────────
# 기본 방언 사전 (파일 기반 폴백)
# DB 사전이 있으면 DB가 우선 적용됨
# ─────────────────────────────────────────
_BASE_DIALECT_MAP: dict[str, str] = {
    # 규격·단위
    "킬로": "kg",
    "킬": "kg",
    "키로": "kg",
    "콘테나": "컨테이너",
    "컨테나": "컨테이너",
    # 품종
    "노지귤": "노지 온주",
    "조생귤": "조생 온주",
    "타이벡귤": "타이벡 온주",
    "한라봉귤": "한라봉",
    "황금향귤": "황금향",
    "레드향귤": "레드향",
    # 등급
    "상짜리": "상",
    "중짜리": "중",
    "하짜리": "하",
    "로얄과": "로얄과",
    "로열과": "로얄과",
    # 거래
    "외상으로": "외상",
    "나중에 줄게": "외상",
    "현찰": "현금",
    # 숫자 (한글 → 숫자)
    "열": "10",
    "스물": "20",
    "스무": "20",
    "서른": "30",
    "마흔": "40",
    "쉰": "50",
    "예순": "60",
    "일흔": "70",
    "여든": "80",
    "아흔": "90",
    "백": "100",
}

# 금액 패턴 (삼만 원 → 30000원)
_KOREAN_NUMBER_MAP: dict[str, int] = {
    "일": 1, "이": 2, "삼": 3, "사": 4, "오": 5,
    "육": 6, "칠": 7, "팔": 8, "구": 9,
}
_UNIT_MAP: dict[str, int] = {
    "만": 10000, "십만": 100000, "백만": 1000000,
}


def normalize_dialect(text: str, extra_map: Optional[dict[str, str]] = None) -> str:
    """방언·은어를 표준어로 변환합니다.

    Args:
        text: 원문 입력 텍스트 (방언·구어체 포함)
        extra_map: DB에서 로드한 추가 사전 (우선 적용)

    Returns:
        방언이 표준어로 치환된 텍스트
    """
    result = text

    # 1. DB 사전 우선 적용
    if extra_map:
        for dialect, standard in sorted(extra_map.items(), key=lambda x: -len(x[0])):
            result = result.replace(dialect, standard)

    # 2. 기본 사전 적용 (긴 표현 먼저)
    for dialect, standard in sorted(_BASE_DIALECT_MAP.items(), key=lambda x: -len(x[0])):
        result = result.replace(dialect, standard)

    # 3. 금액 패턴 정규화 (예: "삼만 원" → "30000원")
    result = _normalize_amount(result)

    return result


def _normalize_amount(text: str) -> str:
    """한글 금액 표현을 숫자로 변환합니다.

    예: "삼만 원" → "30000원", "백오십만원" → "1500000원"
    """
    # 간단한 패턴: X만 원, X십만 원
    def replace_amount(match: re.Match) -> str:
        korean_num = match.group(1)
        unit = match.group(2)
        num = _KOREAN_NUMBER_MAP.get(korean_num, 0)
        unit_val = _UNIT_MAP.get(unit, 1)
        return str(num * unit_val) + "원"

    pattern = r"([일이삼사오육칠팔구])(만|십만|백만)\s*원"
    return re.sub(pattern, replace_amount, text)


def extract_quantity_from_text(text: str) -> Optional[int]:
    """텍스트에서 수량(박스 수)을 추출합니다.

    Args:
        text: 정규화된 텍스트

    Returns:
        수량 정수값 또는 None
    """
    # "50박스", "50 박스", "50개" 패턴
    match = re.search(r"(\d+)\s*(?:박스|개|상자)", text)
    if match:
        return int(match.group(1))
    return None
