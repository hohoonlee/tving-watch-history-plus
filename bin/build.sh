#!/bin/bash

# TVING Watch History Plus - 빌드 스크립트
# Chrome Web Store 배포용 zip 파일 생성

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${PROJECT_DIR}/out"
DIST_DIR="${PROJECT_DIR}/dist"

# manifest.json에서 버전 읽기
VERSION=$(grep -o '"version": *"[^"]*"' "${PROJECT_DIR}/manifest.json" | cut -d'"' -f4)
ZIP_NAME="tving-watch-history-plus.v${VERSION}.zip"

echo "빌드 시작... (v${VERSION})"

# dist 디렉토리 정리
rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}/icons"

# 필수 파일 복사
cp "${PROJECT_DIR}/manifest.json" "${DIST_DIR}/"
cp "${PROJECT_DIR}/content.js" "${DIST_DIR}/"
cp "${PROJECT_DIR}/content.css" "${DIST_DIR}/"
cp "${PROJECT_DIR}/background.js" "${DIST_DIR}/"
cp "${PROJECT_DIR}/icons/"*.png "${DIST_DIR}/icons/" 2>/dev/null || true

# zip 파일 생성
cd "${DIST_DIR}"
zip -r "${OUT_DIR}/${ZIP_NAME}" .

echo "빌드 완료: ${OUT_DIR}/${ZIP_NAME}"
