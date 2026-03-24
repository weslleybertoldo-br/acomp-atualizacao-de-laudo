import { Plus } from "lucide-react";
import type { KanbanPhase, KanbanCard } from "@/data/kanbanData";
import { KanbanCardItem } from "./KanbanCard";

const phaseAccentClasses: Record<number, string> = {
  0: "border-t-muted-foreground/30",
  1: "border-t-phase-1",
  2: "border-t-phase-2",
  3: "border-t-phase-3",
  4: "border-t-phase-4",
};

interface KanbanColumnProps {
  phase: KanbanPhase;
  onCardClick: (card: KanbanCard) => void;
  selectionMode?: boolean;
  selectedCardIds?: Set<string>;
  onToggleCard?: (id: string) => void;
}

export function KanbanColumn({ phase, onCardClick, selectionMode, selectedCardIds, onToggleCard }: KanbanColumnProps) {
  return (
    <div
      className={`flex flex-col min-w-[300px] max-w-[320px] rounded-xl bg-secondary/50 border border-border border-t-[3px] ${phaseAccentClasses[phase.id] ?? "border-t-primary"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-foreground">{phase.title}</h3>
          <span className="text-xs font-semibold bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
            {phase.cards.length}
          </span>
        </div>
        <button className="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5 px-3 pb-3 overflow-y-auto flex-1 max-h-[calc(100vh-180px)]">
        {phase.cards.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">
            Nenhum card nesta fase.
          </p>
        ) : (
          phase.cards.map((card) => (
            <KanbanCardItem
              key={card.id}
              card={card}
              onClick={() => selectionMode ? onToggleCard?.(card.id) : onCardClick(card)}
              selectionMode={selectionMode}
              isSelected={selectedCardIds?.has(card.id)}
              onToggle={() => onToggleCard?.(card.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
