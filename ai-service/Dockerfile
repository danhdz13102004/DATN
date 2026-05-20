# Production Dockerfile
FROM python:3.11-slim AS base
COPY docker-apt-sources.list /etc/apt/sources.list.d/docker-apt-sources.list
RUN echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/99retries && \
    apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
