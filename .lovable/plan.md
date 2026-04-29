## Verificações concluídas

- **Notion**: lido (DISNEY APP, MVP, Fluxo do Usuário, Motor de Alertas, Arquitetura). Schema do Notion tratado como referência, não documentação.
- **Supabase**: conectado e populado.
  - 4 parques (Magic Kingdom, EPCOT, Hollywood Studios, Animal Kingdom) com `external_id` da ThemeParks.wiki, slug, timezone.
  - 109 atrações com `area`, `experience_type`, `thrill_level`, `min_height_cm`, `lightning_lane_type`, `has_show_schedule`, `coordinates_lat/lng`, `short_description`, `strategic_tip`, `is_must_do` (24 must-do no total).
  - 1 profile já existente (admin do criador).
  - `attraction_live_status` e `attraction_wait_history` ainda vazios — serão preenchidos pelos crons do MVP.
- **Login**: vou implementar autenticação real (email/senha) já que existe um profile admin cadastrado.

---

## Escopo do MVP

1. **Login (e-mail + senha)** — sem cadastro público, só o admin já criado entra.
2. Onboarding em cards (Fluxo do Usuário — Fase 2): chegada, hotel Disney, ingresso, adultos, crianças + faixa de altura, parques, datas por parque, seleção/ordenação de atrações.
3. Sem planos/upgrade. Botão discreto "Resetar viagem" em Configurações.
4. Roteiro curado vindo de `attractions` (filtrado por `is_must_do` + escolhas do usuário).
5. Dados ao vivo: ThemeParks.wiki + queue-times.com.
6. Motor de Alertas com Score de Condição.
7. Geolocalização (perímetro do parque, distância até atração com fator 1.4×, inferência de visita).
8. Notificações via Telegram bot.
9. Marcação de atrações visitadas (manual + inferência).
10. Resumo de fim do dia.
11. Mantém identidade visual atual (azul #0A1045, dourado #FFD700, Nunito/Fredoka), mobile-first, pt-BR.

---

## Plano de implementação

### 1. Autenticação
- Tela `/login` com e-mail + senha (`supabase.auth.signInWithPassword`).
- Layout protegido `_app` com `beforeLoad` redirecionando para `/login` se sem sessão; sessão persistida no `localStorage`.
- Hook `useAuth()` com `onAuthStateChange` configurado antes do `getSession()`.
- Sem cadastro/recuperação no MVP (admin já existe). Botão "Sair" em Configurações.
- `/` (welcome) público; após "Começar", se logado vai para `/setup` ou `/hoje`, se não logado vai para `/login`.

### 2. Estado e camada de dados
- Remover `AppProvider`/`UpgradeModal`/`PlanBadge`/`parks.ts` mock.
- TanStack Query como cache; hooks centralizados em `src/lib/queries.ts`:
  - `useParks()`, `useAttractions(parkId)`, `useTrip()`, `useTripParkDays()`, `useRoute(tripParkDayId)`, `useRouteItems()`, `useMonitors()`, `useAlerts()`, `useLiveStatus()`, `useWaitHistory()`.
- Realtime: `attraction_live_status` e `alerts` assinados no cliente para atualização ao vivo.

### 3. Onboarding em cards (`/setup`)
- State machine com 9 cards e barra de progresso.
- Persistência incremental: cria/atualiza `trips`, `trip_park_days`, `routes`, `route_items` ao avançar (RLS já garante escopo por `auth.uid()`).
- Aviso de altura por criança ao listar atrações restritas (sem bloquear).
- Modos "Montar o meu" e "Usar sugerido" (must-do) na seleção por parque.

### 4. App principal
- `/hoje`: dia ativo, parque ativo, próximo passo do roteiro, status de geolocalização, atalho para alertas.
- `/roteiro`: lista ordenada com badge de Score de Condição, wait atual, "✅ Feito!", "Pular".
- `/filas`: monitor com tendência (↑/↓/→) e cor pelo Score (🟢🟡⚪🟠🔴).
- `/atracao/$id`: detalhe + dica curada + status LL + ações de monitorar.
- `/alertas`: histórico (`alerts`) com aceitar/recusar (grava `alert_actions`).
- `/config`: Telegram, geolocalização, sair, "Resetar viagem".

### 5. Integrações em tempo real (server functions + server routes)
Conforme a regra do projeto: **usar TanStack Start (`createServerFn` + server routes), não Edge Functions do Supabase**.

- **Server function** `syncLiveStatus` chamada por endpoint cron `/api/public/cron/live-status` (a cada ~2 min) — busca ThemeParks.wiki, faz upsert em `attraction_live_status`, registra `data_sync_runs`.
- **Server function** `syncWaitHistory` via `/api/public/cron/wait-history` (diário) — atualiza `attraction_wait_history` a partir do queue-times.com.
- **Server function** `evaluateAlerts` via `/api/public/cron/evaluate-alerts` (a cada ~3 min) — para cada `user_attraction_monitors` ativo: calcula Score, cruza com `user_locations` mais recente, aplica filtro de elegibilidade + tempo de deslocamento, insere `alerts`, dispara Telegram.
- **Server route** `/api/public/telegram` — webhook do bot; valida `secret_token`, atualiza `alert_actions` e `routes` quando o usuário aceita uma troca.
- Endpoints `/api/public/cron/*` protegidos por header `x-cron-secret` (secret novo `CRON_SECRET`). Agendados externamente (pg_cron ou cron-job.org apontando para `project--71afac29-...lovable.app`).

### 6. Geolocalização (cliente)
- `src/lib/geo.ts` com `watchPosition`, throttle de 30s, grava em `user_locations` (descarta `accuracy > 100m`).
- Check-in automático: ao entrar no perímetro do `trip_park_day` ativo, marca `is_active_day=true`.
- Inferência de visita: >5 min a <30 m de uma atração pendente → prompt "Você acabou de fazer X?" → grava `visited_at` em `route_items`.

### 7. Motor de Alertas
- Lógica central no servidor (`evaluateAlerts`).
- Score de Condição (cliente + servidor):

```text
desvio = (current - hist) / hist
> +0.30  → 🔴 Evitar
+0.10..+0.30 → 🟠 Ruim
-0.10..+0.10 → ⚪ Normal
-0.30..-0.10 → 🟡 Boa
< -0.30 → 🟢 Excelente
```

- Tipos 1–4 conforme página "Motor de Alertas".
- Modo de respeito: ao gravar `alert_actions.action='declined'`, suprimir alertas similares por 30 min.

### 8. Telegram
- Tela `/config` com input de chat_id (instruções para `/start` no bot).
- Salvar em `profiles.telegram_chat_id`.
- Secrets a pedir após aprovação: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`.
- Webhook em `https://project--71afac29-5bb1-4bba-9841-fed42fffaebe.lovable.app/api/public/telegram`.

### 9. Visual / i18n
- Mantém paleta e tipografia atuais.
- Tom de voz "amigo experiente" em pt-BR.
- Bottom nav: Hoje · Roteiro · Filas · Alertas · Config.

### 10. Limpeza
- Remover `UpgradeModal`, `PlanBadge`, lógica de planos, `src/lib/app-state.tsx`, `src/lib/parks.ts`, e as rotas atuais `/parques`, `/roteiro`, `/filas`, `/alertas`, `/telegram` (substituídas pelas novas).

---

## Detalhes técnicos

### Mapas de schema usados
- Roteiro do usuário: `routes` (1 por `trip_park_day`) + `route_items` (atração + `position` + `visited_at`).
- Parque do dia: `trip_park_days` com `is_active_day` controlado por geolocalização.
- Monitoramento: `user_attraction_monitors` (`monitor_type`, `desired_lightning_lane_time`, `max_wait_minutes`).
- Eventos de alerta: `alerts` + `alert_actions`.
- Snapshots históricos do Score: `attraction_condition_snapshots` (gravado pelo cron junto com live status).

### Fluxo pós-login
```text
sessão? não → /login
sessão? sim → tem trip ativa?
              não → /setup
              sim → /hoje
```

---

## Confirmações antes de implementar

1. Posso pedir os 3 secrets agora (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`)? Os dois últimos posso gerar pra você.
2. Os crons rodam onde? Posso usar pg_cron do Supabase chamando `/api/public/cron/*` via `net.http_post` (recomendado), ou você prefere agendar via cron-job.org?
3. Confirma que **não quer** cadastro público nem recuperação de senha no MVP (só você entra)?

Se tudo estiver OK, aprove e eu começo pelo bloco 1 (auth + login) → 2 (data layer) → 3 (onboarding) e seguindo a ordem.