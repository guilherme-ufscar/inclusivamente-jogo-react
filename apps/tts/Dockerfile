FROM python:3.11-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

ENV PORT=3002
ENV VOICE=pt-BR-FranciscaNeural
ENV CACHE_DIR=/cache
EXPOSE 3002

CMD ["python", "server.py"]
