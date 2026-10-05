# Stage 1: build the React frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# Same-origin deploy: the SPA calls /api on the host that served it.
ENV VITE_API_URL=""
RUN npm run build

# Stage 2: FastAPI backend serving the API and the built SPA
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    ENVIRONMENT=production \
    SEED_DEMO_DATA=false \
    PORT=7860 \
    WEB_CONCURRENCY=2

WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt

RUN useradd --create-home --uid 1000 appuser
COPY --chown=appuser backend/app ./backend/app
COPY --chown=appuser --from=frontend-builder /app/frontend/dist ./frontend/dist
RUN mkdir -p /app/data && chown appuser /app/data
USER appuser

WORKDIR /app/backend
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/health', timeout=4)" || exit 1

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers ${WEB_CONCURRENCY} --proxy-headers --forwarded-allow-ips='*'"]
