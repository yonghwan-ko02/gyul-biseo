"""
귤비서 커스텀 예외 클래스 정의

새 예외 추가 시 반드시 이 파일에 정의하고,
main.py의 전역 예외 핸들러에 등록하세요.

오류 코드 네이밍: UPPER_SNAKE_CASE
"""


class GyulBiseoError(Exception):
    """귤비서 기본 예외 클래스. 모든 커스텀 예외는 이 클래스를 상속."""

    def __init__(self, message: str, code: str = "GYUL_BISEO_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


# ─────────────────────────────────────────
# AI / 에이전트 오류
# ─────────────────────────────────────────


class EntityExtractionError(GyulBiseoError):
    """LLM 엔티티 추출 실패 (파싱 불가 입력)"""

    def __init__(self, message: str = "입력에서 정보를 추출할 수 없습니다.") -> None:
        super().__init__(message, "ENTITY_EXTRACTION_ERROR")


class IntentClassificationError(GyulBiseoError):
    """인텐트 분류 실패"""

    def __init__(self, message: str = "요청 의도를 파악하지 못했습니다.") -> None:
        super().__init__(message, "INTENT_CLASSIFICATION_ERROR")


class ClarificationLimitError(GyulBiseoError):
    """되묻기 횟수 초과 (MAX_CLARIFICATION_ROUNDS 도달)"""

    def __init__(self, message: str = "정보 확인이 어렵습니다. 다시 말씀해 주세요.") -> None:
        super().__init__(message, "CLARIFICATION_LIMIT_EXCEEDED")


# ─────────────────────────────────────────
# 데이터 오류
# ─────────────────────────────────────────


class RecordNotFoundError(GyulBiseoError):
    """수정/삭제 대상 레코드를 찾을 수 없음"""

    def __init__(self, message: str = "해당 기록을 찾을 수 없습니다.") -> None:
        super().__init__(message, "RECORD_NOT_FOUND")


class AmbiguousRecordError(GyulBiseoError):
    """수정 대상 레코드가 2개 이상이어서 명확화 필요"""

    def __init__(self, message: str = "해당하는 기록이 여러 개 있습니다. 어떤 건지 더 말씀해 주시겠어요?") -> None:
        super().__init__(message, "AMBIGUOUS_RECORD")


class CustomerNotFoundError(GyulBiseoError):
    """거래처를 찾을 수 없음"""

    def __init__(self, name: str = "") -> None:
        msg = f"'{name}' 거래처를 찾을 수 없습니다." if name else "거래처를 찾을 수 없습니다."
        super().__init__(msg, "CUSTOMER_NOT_FOUND")


# ─────────────────────────────────────────
# 외부 서비스 오류
# ─────────────────────────────────────────


class STTServiceError(GyulBiseoError):
    """음성 인식 서비스 오류"""

    def __init__(self, message: str = "음성을 인식하지 못했습니다. 다시 말씀해 주세요.") -> None:
        super().__init__(message, "STT_SERVICE_ERROR")


class OCRServiceError(GyulBiseoError):
    """OCR 서비스 오류"""

    def __init__(self, message: str = "사진에서 글자를 인식하지 못했습니다.") -> None:
        super().__init__(message, "OCR_SERVICE_ERROR")


class KakaoMessageError(GyulBiseoError):
    """카카오 메시지 발송 실패"""

    def __init__(self, message: str = "메시지 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.") -> None:
        super().__init__(message, "KAKAO_MESSAGE_ERROR")


class KakaoSignatureError(GyulBiseoError):
    """카카오 웹훅 서명 검증 실패"""

    def __init__(self, message: str = "잘못된 요청입니다.") -> None:
        super().__init__(message, "KAKAO_SIGNATURE_ERROR")
