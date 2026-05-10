## Suporte completo a Shows com horário fixo

Mudança em 3 camadas: banco, worker de polling e UI.

### 1. Migration (Supabase)

```sql
-- Adicionar próximos horários de show
ALTER TABLE attraction_live_status
  ADD COLUMN show_next_times TIMESTAMPTZ[];

-- Janela de alerta para deduplicação de lembretes de show
ALTER TABLE alerts
  ADD COLUMN show_window_minutes INTEGER;

-- Novo tipo de monitor
ALTER TYPE monitor_type ADD VALUE IF NOT EXISTS 'show_reminder';
```

Após a migration, `src/integrations/supabase/types.ts` será regenerado automaticamente.

### 2. Lógica de monitoramento

**`fn_poll_park_data` (Edge Function remota)**
- Ler `showtimes` retornado pela ThemeParks.wiki para entidades `SHOW` e gravar em `attraction_live_status.show_next_times` (array de `startTime` futuros).
- Continuar gravando `current_wait_minutes` apenas para rides.

**Worker de alerta de shows** — nova Edge Function `fn_check_show_reminders`:
- Roda a cada minuto (cron).
- Para cada `user_attraction_monitors` com `monitor_type = 'show_reminder'` e `is_active = true`:
  - Buscar `show_next_times` da atração.
  - Para cada horário futuro, calcular `delta = horário - now()` em minutos.
  - Disparar alerta quando `delta` cair em uma das janelas: `[60, 30, 5]` (com tolerância de ±1 min).
  - Antes de inserir, checar `alerts` existentes com mesmo `attraction_id`, `user_id`, `show_window_minutes` e horário-alvo dentro de ±2 min para deduplicar.
  - Inserir alerta com `alert_type = 'show_reminder'` (adicionar valor ao enum se não existir), `show_window_minutes` preenchido, `expires_at = horário_show`.

**Hook `useToggleMonitor`** (`src/lib/queries.ts`):
- Detectar `experience_type === 'show'` da atração e forçar `monitor_type = 'show_reminder'` ignorando `max_wait_minutes`.

### 3. UI

**`src/routes/_app.atracao.$id.tsx`**:
- Para shows, esconder o botão "Monitorar queda de fila" e exibir "Lembrar dos horários do show".
- Exibir lista de `show_next_times` com horários formatados.

**Card de show na lista de monitoramento** (`src/routes/_app.alertas.tsx` ou componente equivalente da lista):
- Detectar `experience_type === 'show'`.
- Exibir badge `SHOW` (cor: `bg-magic/20 text-magic`) em vez de `RIDE` (cor atual).
- Em vez de "X min de fila", mostrar:
  - Linha 1: horários compactos `14h00 · 16h30 · 18h00` (apenas futuros, max 4).
  - Linha 2: countdown para o próximo (`em 47 min`, `em 2h12`, ou `começou`).
- Atualizar o countdown a cada 30s via `setInterval` no componente.

### Detalhes técnicos

- **Formatação de horário**: usar `toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })` e substituir `:` por `h`.
- **Countdown**: helper `formatCountdown(ms)` → `em Nmin` / `em XhYY` / `começou`.
- **Cron do `fn_check_show_reminders`**: agendar via `pg_cron` chamando a edge function a cada minuto, com `apikey` no header.
- **Tipos TS**: após migration, `types.ts` ganha `show_next_times: string[] | null` e `show_window_minutes: number | null` automaticamente.

### Fora de escopo
- Edição/teste manual da `fn_poll_park_data` (somente atualização do parser de showtimes — código será atualizado e re-deployado, mas sem mudar contrato de upsert que já está correto).
- Notificação push/Telegram dos alertas de show: apenas insere em `alerts`; o caminho de entrega já existente cuida do envio.
