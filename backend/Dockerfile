FROM python:3.12-slim

# XGBoost on linux dynamically links libgomp.so.1 — must be installed at OS
# level. Without this, `import xgboost` raises OSError on first request.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source under /app/backend/ so internal imports `from backend.X` resolve
# when Railway Root Directory is set to `backend` (build context = backend/).
COPY . ./backend/

EXPOSE 8000

# Railway/Render inject $PORT dynamically. Shell form needed for env-var
# expansion. Default 8000 for local `docker run` without -e PORT.
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
