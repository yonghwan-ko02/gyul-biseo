"""
헬스체크 엔드포인트

배포 환경의 로드밸런서나 모니터링 시스템이 사용합니다.
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/health")
async def health_check() -> JSONResponse:
    """서비스 정상 동작 확인"""
    return JSONResponse({"status": "ok", "service": "gyul-biseo"})


@router.get("/")
async def root() -> JSONResponse:
    """루트 엔드포인트"""
    return JSONResponse(
        {
            "service": "귤비서 API",
            "version": "0.1.0",
            "docs": "/docs",
        }
    )
