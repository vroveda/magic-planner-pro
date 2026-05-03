import { useEffect, useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, ArrowRight, GripVertical, Wand2, ListOrdered, Crown,
  RollerCoaster, Drama, HandHeart, Music, Sparkle, Sparkles,
} from "lucide-react";
import type { Attraction } from "@/lib/queries";

const TYPE_META: Record<string, { icon: typeof RollerCoaster; label: string }> = {
  ride: { icon: RollerCoaster, label: "Atração" },
  show: { icon: Drama, label: "Show" },
  meet_greet: { icon: HandHeart, label: "Meet & Greet" },
  parade: { icon: Music, label: "Parada" },
  fireworks: { icon: Sparkle, label: "Fogos" },
  other: { icon: Sparkles, label: "Outro" },
};

const TYPE_ORDER: Attraction["experience_type"][] = ["ride", "meet_greet", "show", "parade", "fireworks", "other"];

export function RouteOrderStep({
  parkName, attractions, initialIds, onBack, onSave, saving,
}: {
  parkName: string;
  attractions: Attraction[];
  initialIds: string[];
  onBack: () => void;
  onSave: (orderedIds: string[]) => void;
  saving?: boolean;
}) {
  const [ids, setIds] = useState<string[]>(initialIds);

  useEffect(() => { setIds(initialIds); }, [initialIds.join(",")]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function suggestOrder() {
    const map = new Map(attractions.map((a) => [a.id, a]));
    const sorted = [...ids].sort((aId, bId) => {
      const a = map.get(aId)!; const b = map.get(bId)!;
      if (a.is_must_do !== b.is_must_do) return a.is_must_do ? -1 : 1;
      const ai = TYPE_ORDER.indexOf(a.experience_type);
      const bi = TYPE_ORDER.indexOf(b.experience_type);
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    });
    setIds(sorted);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setIds((cur) => arrayMove(cur, cur.indexOf(String(active.id)), cur.indexOf(String(over.id))));
  }

  const map = new Map(attractions.map((a) => [a.id, a]));

  return (
    <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-1">
        <span><ListOrdered className="inline h-3.5 w-3.5 mr-1" />Ordenar roteiro</span>
        <button onClick={suggestOrder} className="inline-flex items-center gap-1 text-magic underline">
          <Wand2 className="h-3.5 w-3.5" /> Sugestão do App
        </button>
      </div>
      <h2 className="font-display text-2xl font-bold text-magic">{parkName}</h2>
      <p className="text-sm text-muted-foreground">Arraste para reordenar como você quer fazer.</p>

      <div className="mt-4 max-h-[55vh] overflow-y-auto -mx-2 px-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {ids.map((id, idx) => {
                const a = map.get(id);
                if (!a) return null;
                return <SortableRow key={id} id={id} index={idx} attraction={a} />;
              })}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-magic">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <button onClick={() => onSave(ids)} disabled={saving || ids.length === 0}
          className="ml-auto flex items-center gap-1 rounded-2xl bg-gradient-gold px-5 py-3 text-sm font-extrabold text-magic shadow-gold disabled:opacity-50">
          {saving ? "Salvando…" : "Salvar roteiro"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SortableRow({ id, index, attraction }: { id: string; index: number; attraction: Attraction }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  const meta = TYPE_META[attraction.experience_type];
  const Icon = meta?.icon ?? Sparkles;
  return (
    <li ref={setNodeRef} style={style}
      className={`flex items-center gap-2 rounded-2xl border border-border bg-card p-3 ${isDragging ? "shadow-magic" : "shadow-soft"}`}>
      <button {...attributes} {...listeners}
        className="touch-none flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-magic cursor-grab active:cursor-grabbing"
        aria-label="Arrastar para reordenar">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-magic text-white font-display font-bold text-xs">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-bold text-magic leading-tight truncate">{attraction.name}</p>
          {attraction.is_must_do && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-gold text-magic px-1.5 py-0.5 text-[9px] font-extrabold">
              <Crown className="h-2.5 w-2.5" /> IMPERDÍVEL
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-0.5">
          <Icon className="h-3 w-3" /> {meta?.label}
        </p>
      </div>
    </li>
  );
}
