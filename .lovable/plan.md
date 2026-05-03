## Objetivo

Refinar o fluxo de definição do roteiro de um dia em `_app.roteiro.$dayId` / `ParkRoutePicker`:

1. Renomear "Usar sugerido" → "Sugestão do App" com ícone discreto de magia.
2. Pedir primeiro a hora prevista de chegada ao parque.
3. Permitir selecionar atrações sem reordenar (sem subir item ao topo ao marcar).
4. Agrupar atrações por tipo (Atração, Show, Meet & Greet, Parada, Fogos, Outro).
5. Mostrar legenda dos ícones (tipo + Lightning Lane) no topo.

---

## Mudanças

### 1. Banco — nova coluna `planned_arrival_time`
Migração na tabela `trip_park_days`:
- adicionar `planned_arrival_time time` (nullable).
- regerar `src/integrations/supabase/types.ts` automaticamente.

Adicionar mutation `useSetPlannedArrival(dayId, time)` em `src/lib/queries.ts`.

### 2. `src/components/ParkRoutePicker.tsx` — refatoração

**Header**
- Trocar texto "Usar sugerido" por "Sugestão do App" + ícone `Wand2` (lucide) discreto antes do texto.

**Legenda dos ícones (novo bloco no topo)**
Card compacto colapsável (aberto por padrão na 1ª visita) listando:
- Tipos: Atração (RollerCoaster), Show (Drama), Meet & Greet (HandHeart), Parada (Music), Fogos (Sparkle), Outro (Sparkles).
- Lightning Lane: Multi Pass (Zap), Single Pass (Gauge), Fila Virtual (Smartphone).
Texto curto ao lado de cada ícone.

**Lista**
- Remover lógica `ordered` que coloca selecionados no topo. Renderizar `attractions` na ordem original (mantida pelo backend: must-do primeiro, depois nome).
- Agrupar por `experience_type` na ordem fixa: `ride`, `show`, `meet_greet`, `parade`, `fireworks`, `other`. Cada grupo com cabeçalho (ícone + nome do tipo + contagem `selecionadas/total`).
- Remover número de prioridade/order do card. Substituir o badge numérico por um indicador simples de check (círculo vazio / check dourado quando selecionado).
- Manter aviso de altura, badges de IMPERDÍVEL, ícones de tipo/LL no card (já que a legenda explica).

**Props**
- Sem mudança na assinatura externa, exceto: nova prop opcional `arrivalTime?: string` (apenas para exibição do título "Chegada às HH:MM" se quiser; não obrigatório).

### 3. `src/routes/_app.roteiro.$dayId.tsx` — fluxo em 2 passos

Quando `showPicker`:
- **Passo A — Hora de chegada**: se `day.planned_arrival_time` é nulo (ou em modo edição e o usuário clicou "alterar"), mostrar um card simples com:
  - Título "Que horas você pretende chegar em {parque}?"
  - `<input type="time">` com default `09:00`.
  - Botão "Continuar" → salva via `useSetPlannedArrival` e avança para Passo B.
- **Passo B — Escolher atrações**: render `ParkRoutePicker` (já refatorado). Mostra acima um chip "Chegada às HH:MM • alterar" que volta ao Passo A.

Estado local: `step: 'arrival' | 'picker'`. Inicializa em `arrival` se `planned_arrival_time` é nulo, senão `picker`.

Salvar atrações continua via `replaceRoute.mutateAsync` no botão "Salvar roteiro".

### 4. Persistência da ordem de prioridade
A ordem do array `value` (e `route_items.order_index`) passa a refletir a ordem em que o usuário clicou nas atrações (não mais visualmente reordenada). Em uma etapa futura o usuário poderá priorizar arrastando — fora do escopo deste passo.

---

## Arquivos afetados

- migração SQL: adicionar `planned_arrival_time` em `trip_park_days`
- `src/integrations/supabase/types.ts` (regenerado)
- `src/lib/queries.ts` — nova mutation `useSetPlannedArrival`
- `src/components/ParkRoutePicker.tsx` — legenda, agrupamento, sem reordenação, "Sugestão do App" + Wand2
- `src/routes/_app.roteiro.$dayId.tsx` — fluxo 2 passos com input de hora

Sem mudanças em `_app.setup.tsx` (a hora é definida sob demanda quando o usuário entra em "Definir roteiro" do dia).
