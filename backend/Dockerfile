# Multi-stage Dockerfile for VisionGuard Backend
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Final runtime image
FROM python:3.12-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed wheels and binaries from builder stage
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy backend application code
COPY backend /app/backend

WORKDIR /app/backend

# Create storage directories and set permissions
RUN mkdir -p /app/data/uploads /app/data/annotated /app/data/reports /app/data/weights /app/data/evaluations && \
    chmod -R 777 /app/data

ENV PYTHONPATH=/app/backend \
    DATA_DIR=/app/data \
    YOLO_CONFIG_DIR=/app/data/weights \
    PYTHONUNBUFFERED=1 \
    PORT=10000

EXPOSE 10000

CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}
