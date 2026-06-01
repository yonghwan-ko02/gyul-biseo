@echo off
title 🍊 귤비서 Git 커밋 및 푸쉬 도구
chcp 65001 >nul

echo ==================================================
echo 🍊 귤비서(Gyul-Biseo) Git 커밋 및 푸쉬 자동화 도구
echo ==================================================
echo.

:: 1. Git 상태 표시
echo 🔍 현재 변경된 파일 상태를 확인합니다...
echo --------------------------------------------------
git status -s
echo --------------------------------------------------
echo.

:: 2. 커밋 메시지 입력 받기
set /p commit_msg="📝 커밋 메시지를 입력하세요 (엔터 입력 시 기본값 적용): "
if "%commit_msg%"=="" set commit_msg=귤비서 기능 개선 및 업데이트
echo.

:: 3. Git 작업 수행
echo ⏳ 변경 사항을 무대에 올리는 중 (git add .)...
git add .
if %errorlevel% neq 0 (
    echo ❌ git add 에 실패했습니다.
    goto error
)

echo ⏳ 변경 사항을 커밋하는 중 (git commit)...
git commit -m "%commit_msg%"
if %errorlevel% neq 0 (
    echo ❌ git commit 에 실패했습니다.
    goto error
)

echo ⏳ 원격 저장소로 푸쉬하는 중 (git push)...
git push
if %errorlevel% neq 0 (
    echo ❌ git push 에 실패했습니다.
    goto error
)

echo.
echo ==================================================
echo 🎉 Git 커밋 및 푸쉬가 성공적으로 완료되었습니다!
echo 📝 커밋 메시지: %commit_msg%
echo ==================================================
goto end

:error
echo.
echo ⚠️ Git 작업 중 오류가 발생하여 중단되었습니다.
echo ==================================================

:end
echo.
pause
