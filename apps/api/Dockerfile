FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

ENV PORT=3001
EXPOSE 3001

# catalog.json mounted at runtime: /app/content/import/catalog.json
CMD ["sh", "-c", "npx prisma db push && node prisma/seed.js && node src/index.js"]
