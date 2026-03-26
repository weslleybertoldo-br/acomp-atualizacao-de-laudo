import { useState } from "react";
import { useKanbanData, useKanbanRealtime, useBulkDeleteCards } from "@/hooks/useKanbanData";
import { useAuth } from "@/hooks/useAuth";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanListView } from "./KanbanListView";
import { KanbanReports } from "./KanbanReports";
import { CreateCardDialog } from "./CreateCardDialog";
import { CardDetailDialog } from "./CardDetailDialog";
import { FilterPopover, type KanbanFilters, emptyFilters, applyFilters } from "./FilterPopover";
import { Search, Plus, Loader2, LogOut, Trash2, CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { KanbanCard } from "@/data/kanbanData";

export function KanbanBoard() {
  const { signOut } = useAuth();
  useKanbanRealtime();
  const { data: phases, isLoading, error } = useKanbanData();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"kanban" | "lista" | "relatorios">("kanban");
  const [filters, setFilters] = useState<KanbanFilters>(emptyFilters);
  const [selectedCardInfo, setSelectedCardInfo] = useState<{ cardId: string; phaseId: number } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const bulkDelete = useBulkDeleteCards();

  const selectedCard = (() => {
    if (!selectedCardInfo || !phases) return null;
    for (const phase of phases) {
      const card = phase.cards.find(c => c.id === selectedCardInfo.cardId);
      if (card) return { card, phaseId: phase.id };
    }
    return null;
  })();

  const searchFiltered = (phases ?? []).map(phase => ({
    ...phase,
    cards: phase.cards.filter(card =>
      !searchTerm || card.code.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  }));
  const filteredPhases = applyFilters(searchFiltered, filters);

  const totalPhases = phases?.length ?? 0;
  const allCardIds = filteredPhases.flatMap(p => p.cards.map(c => c.id));

  const toggleCard = (id: string) => {
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedCardIds(new Set(allCardIds));
  const deselectAll = () => setSelectedCardIds(new Set());

  const handleBulkDelete = () => {
    if (selectedCardIds.size === 0) return;
    bulkDelete.mutate([...selectedCardIds], {
      onSuccess: () => {
        toast.success(`${selectedCardIds.size} card(s) excluído(s)!`);
        setSelectedCardIds(new Set());
        setSelectionMode(false);
      },
      onError: () => toast.error("Erro ao excluir cards."),
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedCardIds(new Set());
  };

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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-56"
            />
          </div>
          <FilterPopover filters={filters} onChange={setFilters} phases={phases ?? []} />
          <button
            onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
            className={`p-2 rounded-lg transition-colors ${selectionMode ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"}`}
            title={selectionMode ? "Sair da seleção" : "Selecionar cards"}
          >
            <CheckSquare className="h-4 w-4" />
          </button>
          <button onClick={signOut} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Selection bar */}
      {selectionMode && (
        <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-primary/5 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-medium text-foreground">{selectedCardIds.size} selecionado(s)</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectedCardIds.size === allCardIds.length ? deselectAll : selectAll}>
              {selectedCardIds.size === allCardIds.length ? "Desmarcar todos" : "Selecionar todos"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={handleBulkDelete}
              disabled={selectedCardIds.size === 0 || bulkDelete.isPending}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Excluir ({selectedCardIds.size})
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={exitSelectionMode}>
              <X className="h-3 w-3 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <nav className="flex items-center gap-6 px-6 py-2 border-b border-border bg-card text-sm">
        {(["kanban", "lista", "relatorios"] as const).map((tab) => {
          const labels = { kanban: "Kanban", lista: "Lista", relatorios: "Relatórios" };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1 transition-colors ${activeTab === tab ? "font-semibold text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {labels[tab]}
            </button>
          );
        })}
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
        ) : activeTab === "kanban" ? (
          <div className="flex gap-4 p-4 min-h-0 h-full">
            {filteredPhases.map((phase) => (
              <KanbanColumn
                key={phase.id}
                phase={phase}
                selectionMode={selectionMode}
                selectedCardIds={selectedCardIds}
                onToggleCard={toggleCard}
                onCardClick={(card) => {
                  if (!selectionMode) {
                    setSelectedCardInfo({ cardId: card.id, phaseId: phase.id });
                  }
                }}
              />
            ))}
          </div>
        ) : activeTab === "lista" ? (
          <KanbanListView
            phases={filteredPhases}
            onCardClick={(card, phaseId) => setSelectedCardInfo({ cardId: card.id, phaseId })}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Relatórios em breve.
          </div>
        )}
      </div>

      {/* FAB */}
      {!selectionMode && (
        <button
          onClick={() => setCreateOpen(true)}
          className="fixed bottom-6 left-6 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg hover:opacity-90 transition-opacity text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Criar novo card
        </button>
      )}

      <CreateCardDialog open={createOpen} onOpenChange={setCreateOpen} />

      <CardDetailDialog
        card={selectedCard?.card ?? null}
        currentPhaseId={selectedCard?.phaseId ?? 0}
        totalPhases={totalPhases}
        onOpenChange={(open) => { if (!open) setSelectedCardInfo(null); }}
      />
    </div>
  );
}
