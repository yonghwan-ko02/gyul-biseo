"""
귤비서 FastAPI 메인 애플리케이션 엔트리포인트

이 파일은 애플리케이션을 초기화하고 미들웨어, 라우터를 등록합니다.
새 라우터 추가 시 반드시 이 파일에 include_router()를 추가하세요.
"""
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db.session import init_db
from app.api.v1 import kakao, records, settlements, agri_log, labor
from app.api import health
from app.utils.exceptions import GyulBiseoError, RecordNotFoundError, AmbiguousRecordError

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 시작/종료 시 실행되는 컨텍스트 매니저"""
    # 시작
    logger.info("귤비서 서버 시작 중...", environment=settings.ENVIRONMENT)
    await init_db()
    logger.info("DB 초기화 완료")
    yield
    # 종료
    logger.info("귤비서 서버 종료")


app = FastAPI(
    title="귤비서 API",
    description="감귤 농가 맞춤형 대화형 비즈니스 데이터 관리 솔루션",
    version="0.1.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# ─────────────────────────────────────────
# 미들웨어 등록
# ─────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────
# 전역 예외 핸들러
# ─────────────────────────────────────────
@app.exception_handler(RecordNotFoundError)
async def record_not_found_handler(request: Request, exc: RecordNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"success": False, "error": exc.code, "message": exc.message},
    )


@app.exception_handler(AmbiguousRecordError)
async def ambiguous_record_handler(request: Request, exc: AmbiguousRecordError) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={"success": False, "error": exc.code, "message": exc.message},
    )


@app.exception_handler(GyulBiseoError)
async def gyul_biseo_error_handler(request: Request, exc: GyulBiseoError) -> JSONResponse:
    logger.error("귤비서 오류 발생", code=exc.code, message=exc.message)
    return JSONResponse(
        status_code=400,
        content={"success": False, "error": exc.code, "message": exc.message},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("예상치 못한 오류", error=str(exc))
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "INTERNAL_SERVER_ERROR",
            "message": "일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        },
    )


# ─────────────────────────────────────────
# 라우터 등록
# ─────────────────────────────────────────
app.include_router(health.router, tags=["Health"])
app.include_router(kakao.router, prefix="/api/v1/kakao", tags=["Kakao"])
app.include_router(records.router, prefix="/api/v1/records", tags=["Records"])
app.include_router(settlements.router, prefix="/api/v1/settlements", tags=["Settlements"])
app.include_router(agri_log.router, prefix="/api/v1/agri-log", tags=["AgriLog"])
app.include_router(labor.router, prefix="/api/v1/labor", tags=["Labor"])
