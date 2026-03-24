import { useState } from "react";
import { useKanbanData, useKanbanRealtime } from "@/hooks/useKanbanData";
import { useAuth } from "@/hooks/useAuth";
import { KanbanColumn } from "./KanbanColumn";
import { CreateCardDialog } from "./CreateCardDialog";
import { CardDetailDialog } from "./CardDetailDialog";
import { Search, Filter, Plus, Loader2, LogOut } from "lucide-react";
import type { KanbanCard } from "@/data/kanbanData";

export function KanbanBoard() {
  const { signOut } = useAuth();
  const { data: phases, isLoading, error } = useKanbanData();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<{ card: KanbanCard; phaseId: number } | null>(null);

  const totalPhases = phases?.length ?? 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">
            Acompanhamento de Laudos
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Procurar cards"
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-56"
            />
          </div>
          <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            <Filter className="h-4 w-4" />
          </button>
          <button onClick={signOut} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex items-center gap-6 px-6 py-2 border-b border-border bg-card text-sm">
        <button className="font-semibold text-primary border-b-2 border-primary pb-1">
          Kanban
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-colors pb-1">
          Lista
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-colors pb-1">
          Relatórios
        </button>
      </nav>

      {/* Board */}
      <div className="flex-1 overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-destructive">
            Erro ao carregar dados.
          </div>
        ) : (
          <div className="flex gap-4 p-4 min-h-0 h-full">
            {(phases ?? []).map((phase) => (
              <KanbanColumn
                key={phase.id}
                phase={phase}
                onCardClick={(card) => setSelectedCard({ card, phaseId: phase.id })}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-6 left-6 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg hover:opacity-90 transition-opacity text-sm font-semibold"
      >
        <Plus className="h-4 w-4" />
        Criar novo card
      </button>

      <CreateCardDialog open={createOpen} onOpenChange={setCreateOpen} />

      <CardDetailDialog
        card={selectedCard?.card ?? null}
        currentPhaseId={selectedCard?.phaseId ?? 0}
        totalPhases={totalPhases}
        onOpenChange={(open) => { if (!open) setSelectedCard(null); }}
      />
    </div>
  );
}
