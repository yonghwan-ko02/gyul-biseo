"""
카카오 i Open Builder 웹훅 엔드포인트

모든 사용자 입력(텍스트/음성/사진)은 이 엔드포인트를 통해 처리됩니다.
카카오 웹훅 응답은 반드시 5초 이내에 반환해야 합니다.

응답 지연 시 전략:
  1. "처리 중이에요 🔄" 즉시 응답
  2. 에이전트 결과를 Push 메시지로 별도 발송
"""
import asyncio
import hashlib
import hmac
import structlog
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse

from app.config import settings
from app.utils.exceptions import KakaoSignatureError

logger = structlog.get_logger()
router = APIRouter()


def verify_kakao_signature(body: bytes, signature: str) -> bool:
    """카카오 웹훅 요청의 HMAC-SHA256 서명을 검증합니다."""
    expected = hmac.new(
        settings.KAKAO_CHANNEL_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def build_simple_text_response(text: str, quick_replies: list | None = None) -> dict:
    """단순 텍스트 카카오 응답을 생성합니다."""
    response: dict = {
        "version": "2.0",
        "template": {
            "outputs": [{"simpleText": {"text": text}}]
        },
    }
    if quick_replies:
        response["template"]["quickReplies"] = quick_replies
    return response


def build_variety_quick_replies() -> list[dict]:
    """품종 선택 퀵 리플라이 버튼 목록 (현장 소음 폴백용)"""
    varieties = ["🍊 노지", "🌿 타이벡", "🍑 한라봉", "🍋 황금향", "❤️ 레드향", "🍊 천혜향"]
    return [
        {"label": v, "action": "message", "messageText": v.split(" ")[1]}
        for v in varieties
    ]


@router.post("/webhook")
async def kakao_webhook(request: Request) -> JSONResponse:
    """카카오 i Open Builder 스킬 서버 웹훅.

    모든 사용자 메시지(텍스트/음성/이미지)가 이 엔드포인트로 수신됩니다.
    5초 타임아웃 제한을 준수해야 합니다.
    """
    body = await request.body()

    # 1. 서명 검증 (운영 환경에서만 강제)
    if settings.ENVIRONMENT == "production":
        signature = request.headers.get("X-Hub-Signature", "")
        if not verify_kakao_signature(body, signature):
            raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()

    # 2. 사용자 정보 추출
    user_request = payload.get("userRequest", {})
    kakao_user_id = user_request.get("user", {}).get("id", "")
    utterance = user_request.get("utterance", "")

    logger.info(
        "카카오 웹훅 수신",
        kakao_user_id=kakao_user_id[:8] + "...",  # 개인정보 마스킹
        utterance_length=len(utterance),
    )

    # 3. 에이전트 호출 (타임아웃 적용)
    try:
        from app.agents.graph import process_message

        result_text = await asyncio.wait_for(
            process_message(
                kakao_user_id=kakao_user_id,
                utterance=utterance,
                payload=payload,
            ),
            timeout=settings.KAKAO_WEBHOOK_TIMEOUT_SECONDS,
        )
        return JSONResponse(build_simple_text_response(result_text))

    except asyncio.TimeoutError:
        # 5초 초과 시 즉시 응답 후 Push 메시지로 결과 전달 (향후 구현)
        logger.warning("에이전트 타임아웃 발생", kakao_user_id=kakao_user_id[:8] + "...")
        return JSONResponse(
            build_simple_text_response(
                "처리 중이에요 🔄\n잠시 후 결과를 알려드릴게요.",
            )
        )

    except Exception as e:
        logger.error("웹훅 처리 오류", error=str(e))
        return JSONResponse(
            build_simple_text_response(
                "죄송합니다, 잠시 문제가 생겼어요 🙏\n다시 한번 말씀해 주시겠어요?",
            )
        )
