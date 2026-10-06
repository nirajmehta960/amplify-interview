# ── Multi-stage build for smaller image ──

# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

WORKDIR /app

# Install system deps for PDF/DOCX parsing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY app/ app/

# Nginx reverse-proxies to this port on the EC2 host
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Run with uvicorn
CMD exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${PORT} \
    --workers 1 \
    --timeout-keep-alive 30 \
    --log-level info
