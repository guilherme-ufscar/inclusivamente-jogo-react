# Inclusiva Educa Web

Versão web (Docker) do núcleo pedagógico do Inclusiva Educa:

- **Persona → Ano → Matéria → Pílula → Nível → Atividade**
- Apenas **escolha única** e **múltipla escolha**
- Enunciado + **áudio** (painel) + validação de resposta no servidor
- Login JWT do painel: **preparado para depois** (rotas públicas no MVP)

## Subir com Docker

```bash
# 1) Gerar catálogo a partir dos JSON (já em content/json)
node scripts/import-json.mjs

# 2) (Opcional) Importar ScriptableObjects TEA/Infantil/Default
#    se content/unity-so ou _audio_check/repo/.../Education existir
node scripts/import-so.mjs

# 3) Subir stack
docker compose up --build
```

- **Web:** http://localhost:8080  
- **API:** http://localhost:3001/health  
- **Postgres:** localhost:5432 (`inclusiva` / `inclusiva`)

## Desenvolvimento local (sem Docker web)

```bash
# DB + API via compose
docker compose up db -d

# API
cd apps/api
npm install
npx prisma db push
# copiar catalog e:
set DATABASE_URL=postgresql://inclusiva:inclusiva@localhost:5432/inclusiva
npm run seed
npm run dev

# Web
cd apps/web
npm install
npm run dev
```

## Estrutura

```
apps/api     → Express + Prisma + PostgreSQL
apps/web     → React + Vite + Tailwind
content/json → atividades Unity (StreamingAssets)
content/import/catalog.json → catálogo normalizado
scripts/     → import + formatter de áudio
```

## Áudio

Mesma regra do Unity (`EnunciadoFormatter`):

`https://painel.inclusivamentemaiseduca.com.br/uploads/audios/{NOME}.wav`

## JWT (futuro)

Middleware `optionalAuth` em `apps/api/src/auth.js`.  
Quando o painel emitir JWT, validar o Bearer ali — o player não precisa mudar.
