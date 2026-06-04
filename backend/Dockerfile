FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    STORAGE_DIR=/app/storage

WORKDIR /app

# OpenCV runtime deps (headless still needs libGL-adjacent libs on slim).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# The backend imports the sibling ai/ package, so copy both.
COPY ai/ /app/ai/
COPY backend/ /app/backend/

ENV PYTHONPATH=/app
WORKDIR /app/backend

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
