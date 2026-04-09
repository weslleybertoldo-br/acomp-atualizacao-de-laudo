import { useState } from "react";
import { Plus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { KanbanPhase, KanbanCard } from "@/data/kanbanData";
import { KanbanCardItem } from "./KanbanCard";

const phaseAccentClasses: Record<number, string> = {
  0: "border-t-muted-foreground/30",
  1: "border-t-phase-1",
  2: "border-t-phase-2",
  3: "border-t-phase-3",
  4: "border-t-phase-4",
  5: "border-t-phase-5",
};

type SortOrder = "oldest" | "newest";

interface KanbanColumnProps {
  phase: KanbanPhase;
  onCardClick: (card: KanbanCard) => void;
  selectionMode?: boolean;
  selectedCardIds?: Set<string>;
  onToggleCard?: (id: string) => void;
}

export function KanbanColumn({ phase, onCardClick, selectionMode, selectedCardIds, onToggleCard }: KanbanColumnProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("oldest");

  const sortedCards = [...phase.cards].sort((a, b) => {
    const dateA = new Date(a.dueDate || a.createdAt || "").getTime();
    const dateB = new Date(b.dueDate || b.createdAt || "").getTime();
    return sortOrder === "oldest" ? dateA - dateB : dateB - dateA;
  });

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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSortOrder(prev => prev === "oldest" ? "newest" : "oldest")}
            className="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors"
            title={sortOrder === "oldest" ? "Mais antigos primeiro" : "Mais novos primeiro"}
          >
            {sortOrder === "oldest" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
          </button>
          <button className="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5 px-3 pb-3 overflow-y-auto flex-1 max-h-[calc(100vh-180px)]">
        {sortedCards.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">
            Nenhum card nesta fase.
          </p>
        ) : (
          sortedCards.map((card) => (
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
