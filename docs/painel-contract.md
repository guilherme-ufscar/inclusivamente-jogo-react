# Contrato Painel ↔ Jogo (Inclusiva Educa)

Documento vivo. Repo `guilherme-ufscar/inclusivamente` é privado; base atual = reverse engineering do bundle de produção + probe HTTP.

## Entrada do aluno

```
POST /api/auth/login → { token, user }
se role === "student" && sondagem_completed:
  redirect → https://game.inclusivamentemaiseduca.com.br/?token={JWT}
```

Nosso web captura `?token=`, grava em `localStorage.inclusiva_jwt` + `localStorage.token`, remove da URL.

## Validação

```
GET /api/auth/me
Authorization: Bearer {token}
```

Via proxy do jogo: `GET /api/painel/auth/me`

## Personas (user.persona)

| N | Slug |
|---|------|
| 0 | padrao |
| 1 | tea |
| 2 | di_tea |
| 3 | di_severa |
| 4 | visual |

## Idioma

`user.language`: `pt-br` | `en-us` | … → app `pt` | `en` | `es`

## Sessão com/sem tutor

Escolha **antes** do ano. Enviado em cada atividade como `has_tutor: boolean`.

## activity_id (formato painel)

```
{ano}_{disciplina}_{pilula}_{nivel}_{atividade}
ex.: 1_lp_3_2_construindo_palavras
```

Parser no painel: `split("_")` → ano, disciplina, pílula, nível, resto.

## Endpoints de atividades (probe)

| Método | Path | Auth |
|--------|------|------|
| POST | `/activities` | Bearer |
| POST | `/activities/start` | Bearer |
| POST | `/activities/create` | Bearer |
| POST | `/activities/:id/finish` | Bearer `{ time_spent }` |
| GET | `/students/:id/activities` | Bearer |
| GET | `/activities/history` | Bearer |

### Payload de criação (proposto / tentado pelo jogo)

```json
{
  "activity_id": "1_lp_3_2_construindo_palavras",
  "has_tutor": true,
  "started_at": "ISO-8601",
  "difficulty_perceived": "easy|medium|hard",
  "autonomy_level": "high|medium|low",
  "internal_id": "id-local-opcional",
  "language": "pt"
}
```

### Payload de finish (proposto)

```json
{
  "time_spent": 87,
  "correct_count": 3,
  "errors_count": 1,
  "completed_at": "ISO-8601",
  "difficulty_perceived": "medium",
  "autonomy_level": "high",
  "has_tutor": true
}
```

## Campos lidos no módulo Atividades

`activity_id`, `has_tutor`, `started_at`, `completed_at`, `correct_count`, `errors_count`, `time_spent`, `difficulty_perceived`, `autonomy_level`, `tutor_observations`

## Proxy local

```
Web → /api/painel/* → apps/api → https://painel.inclusivamentemaiseduca.com.br/api/*
```

Env: `PAINEL_API_URL`, `VITE_PAINEL_API`, `VITE_REQUIRE_AUTH=1` (força login)

## Fase 0 restante (com token real)

1. Dump de `GET /auth/me`
2. Confirmar qual POST create retorna 200 e o `id` interno
3. Confirmar body mínimo de finish
4. Atualizar este doc
