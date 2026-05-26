"""
애플리케이션 설정 관리

pydantic-settings를 사용하여 환경 변수를 타입 안전하게 관리합니다.
새 환경 변수 추가 시 이 파일과 .env.example을 함께 업데이트하세요.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── 앱 기본 설정 ──────────────────────────────────
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "change-me-in-production"
    LOG_LEVEL: str = "INFO"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # ── OpenAI ───────────────────────────────────────
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o"

    # ── 카카오 ───────────────────────────────────────
    KAKAO_REST_API_KEY: str = ""
    KAKAO_CHANNEL_SECRET: str = ""
    KAKAO_BOT_ID: str = ""
    KAKAO_SEND_FROM_KAKAO_ID: str = ""

    # ── Naver Clova (STT / OCR) ───────────────────────
    NAVER_CLIENT_ID: str = ""
    NAVER_CLIENT_SECRET: str = ""
    NAVER_STT_URL: str = "https://naveropenapi.apigw.ntruss.com/recog/v1/stt"
    NAVER_OCR_URL: str = ""
    NAVER_OCR_SECRET: str = ""

    # ── PostgreSQL ────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://gyul_user:gyul_dev_password@localhost:5432/gyul_biseo"

    # ── ChromaDB ──────────────────────────────────────
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001

    # ── 농장 기본 정보 (정산서용) ─────────────────────
    FARMER_BANK_NAME: str = ""
    FARMER_BANK_ACCOUNT: str = ""
    FARMER_BANK_HOLDER: str = ""

    # ── 에이전트 설정 ─────────────────────────────────
    KAKAO_WEBHOOK_TIMEOUT_SECONDS: float = 4.5   # 5초 제한보다 여유있게
    MAX_CLARIFICATION_ROUNDS: int = 2             # 최대 되묻기 횟수


@lru_cache
def get_settings() -> Settings:
    """설정 싱글톤 반환 (캐싱)"""
    return Settings()


settings = get_settings()
