# Inclusiva Educa Web — Entrega

Projeto pronto para rodar com **Docker**.

## Subir (Windows)

1. Abra o **Docker Desktop**
2. Dê duplo clique em **`Iniciar.bat`**
3. Abra **http://localhost:8080**

## Subir em comandos

```bash
cd jogo-inclusivamente
node scripts/build-catalog.mjs
docker compose up --build -d
```

- **Web:** http://localhost:8080  
- **API:** http://localhost:3001/health  

> **Requisito:** Docker Desktop ligado.

## Contagem atual do catálogo

**Somente atividades com áudio confirmado no painel** (filtro automático).

| Persona | Atividades |
|---------|------------|
| DI + TEA | 970 |
| TEA + DI | 230 |
| Pedro | 59 |
| Padrão | 52 |
| TEA | 28 |
| Infantil | 27 |
| **Total** | **1.366** |

Atividades sem WAV em  
`https://painel.inclusivamentemaiseduca.com.br/uploads/audios/`  
são removidas no `scripts/filter-with-audio.mjs` (rodado pelo `build-catalog.mjs`).

## O que está incluso

| Camada | Tecnologia |
|--------|------------|
| Web | React + Vite + Tailwind (UI infantil) |
| API | Node + Express + Prisma |
| DB | PostgreSQL 16 |
| Orquestração | Docker Compose |

### Navegação pedagógica

**Persona → Ano → Matéria → Pílula → Nível → Atividade**

### Tipos de atividade

- **Escolha única** (`single`)
- **Múltipla escolha** (`multiple`)

Minigames Unity (boliche, arqueiro, ordem de balões, etc.) foram **reformulados** para um desses dois tipos.

### Conteúdo reaproveitado

- Enunciados
- Opções e gabarito (validação no servidor)
- Áudio: `https://painel.inclusivamentemaiseduca.com.br/uploads/audios/{nome}.wav`
- Hierarquia por persona/ano/matéria

### Login JWT

Preparação em `apps/api/src/auth.js` — **ainda público** (sem login).  
Integrar depois com `painel.inclusivamentemaiseduca.com.br`.

## Estrutura de pastas

```
jogo-inclusivamente/
├── docker-compose.yml
├── apps/
│   ├── api/          # REST + seed
│   └── web/          # Frontend
├── content/
│   ├── json/         # 1259 atividades StreamingAssets
│   └── import/       # catalog.json gerado
├── scripts/
│   ├── build-catalog.mjs
│   ├── import-json.mjs
│   ├── import-so.mjs
│   ├── enunciado-formatter.mjs
│   └── reformulate.mjs
├── README.md
└── ENTREGA.md
```

## Comandos úteis

```bash
docker compose logs -f api    # logs da API / seed
docker compose down           # parar
docker compose up --build -d  # rebuild
npm run import                # só regenerar catálogo
```

## Verificação rápida

1. http://localhost:8080 abre a home com personas  
2. Entrar em **DI + TEA** → 1º Ano → Português → pílula → nível → jogar  
3. Botão 🔊 toca o enunciado  
4. Resposta correta avança; errada permite tentar de novo  

## Notas

- **Default/Padrão:** atividades de ordem (ex.: alfabeto) viram escolha única (“qual item vem primeiro?”).
- **Backgrounds:**
  - Usa imagens reais do painel quando existem (`game-assets/...png` geradas no Unity).
  - Para o restante: pack de **15 fundos ilustrados** temáticos (sala, parque, feira, etc.) gerados pela mesma API do projeto.
  - Letras/números nas opções: cards grandes coloridos (estilo minijogo).
  - Palavras conhecidas (gato, casa, bola…): ícones visuais.
- Fonte Unity de referência: repo privado `guilherme-ufscar/inclusivamentegame`.
- Scripts de mídia: `fetch-bg-map.mjs`, `ensure-theme-bgs.mjs`, `apply-media.mjs`.
