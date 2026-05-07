# Multi-stage build keeps the final image lean: deps compile/install in stage 1,
# only the resulting site-packages + binary are copied to a clean runtime stage.
# Saves apt cache, pip cache, build tools, and __pycache__ from the final layer.

FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY requirements.txt .
# --no-cache-dir: don't keep downloaded wheels
# --no-compile: skip .pyc generation (Python compiles on first import; saves ~20 MB)
RUN pip install --no-cache-dir --no-compile --prefix=/install -r requirements.txt


FROM python:3.12-slim AS runtime

# XGBoost on linux dynamically links libgomp.so.1. Required at runtime; no
# build-essential, no apt cache.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Pull installed packages from builder stage.
COPY --from=builder /install /usr/local

WORKDIR /app

# Copy source under /app/backend/ so internal imports `from backend.X` resolve
# when Railway Root Directory is set to `backend` (build context = backend/).
COPY . ./backend/

EXPOSE 8000

# Railway/Render inject $PORT dynamically. Shell form needed for env-var
# expansion. Default 8000 for local `docker run` without -e PORT.
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
