import { useState } from "react";
import { Filter, X, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useKanbanTags, useResponsiblePeople } from "@/hooks/useKanbanData";
import type { KanbanPhase } from "@/data/kanbanData";

export interface KanbanFilters {
  phaseIds: number[];
  tags: string[];
  responsibles: string[];
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

export const emptyFilters: KanbanFilters = {
  phaseIds: [],
  tags: [],
  responsibles: [],
  dateFrom: undefined,
  dateTo: undefined,
};

export function hasActiveFilters(f: KanbanFilters) {
  return f.phaseIds.length > 0 || f.tags.length > 0 || f.responsibles.length > 0 || !!f.dateFrom || !!f.dateTo;
}

export function applyFilters(phases: KanbanPhase[], filters: KanbanFilters): KanbanPhase[] {
  return phases
    .filter(p => filters.phaseIds.length === 0 || filters.phaseIds.includes(p.id))
    .map(phase => ({
      ...phase,
      cards: phase.cards.filter(card => {
        if (filters.tags.length > 0 && !card.tags.some(t => filters.tags.includes(t))) return false;
        if (filters.responsibles.length > 0 && !filters.responsibles.includes(card.responsible)) return false;
        if (filters.dateFrom || filters.dateTo) {
          const d = card.dueDate ? new Date(card.dueDate + "T00:00:00") : null;
          if (!d) return false;
          if (filters.dateFrom && d < filters.dateFrom) return false;
          if (filters.dateTo && d > filters.dateTo) return false;
        }
        return true;
      }),
    }));
}

interface FilterPopoverProps {
  filters: KanbanFilters;
  onChange: (f: KanbanFilters) => void;
  phases: KanbanPhase[];
}

export function FilterPopover({ filters, onChange, phases }: FilterPopoverProps) {
  const { data: allTags } = useKanbanTags();
  const { data: people } = useResponsiblePeople();
  const [open, setOpen] = useState(false);
  const [datePopover, setDatePopover] = useState<"from" | "to" | null>(null);

  const active = hasActiveFilters(filters);
  const activeCount = filters.phaseIds.length + filters.tags.length + filters.responsibles.length + (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);

  const togglePhase = (id: number) => {
    const next = filters.phaseIds.includes(id)
      ? filters.phaseIds.filter(p => p !== id)
      : [...filters.phaseIds, id];
    onChange({ ...filters, phaseIds: next });
  };

  const toggleTag = (name: string) => {
    const next = filters.tags.includes(name)
      ? filters.tags.filter(t => t !== name)
      : [...filters.tags, name];
    onChange({ ...filters, tags: next });
  };

  const toggleResponsible = (name: string) => {
    const next = filters.responsibles.includes(name)
      ? filters.responsibles.filter(r => r !== name)
      : [...filters.responsibles, name];
    onChange({ ...filters, responsibles: next });
  };

  // Get unique tags from all cards across all phases
  const allCardTags = Array.from(new Set(phases.flatMap(p => p.cards.flatMap(c => c.tags))));
  const tagList = allTags ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "p-2 rounded-lg transition-colors relative",
            active ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"
          )}
          title="Filtrar"
        >
          <Filter className="h-4 w-4" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Filtros</span>
          {active && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => onChange(emptyFilters)}>
              <X className="h-3 w-3 mr-1" /> Limpar
            </Button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
          {/* Date filter */}
          <div className="p-4 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data de vencimento</span>
            <div className="flex gap-2">
              <Popover open={datePopover === "from"} onOpenChange={(o) => setDatePopover(o ? "from" : null)}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-8 text-xs flex-1 justify-start", !filters.dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yy", { locale: ptBR }) : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(d) => { onChange({ ...filters, dateFrom: d ?? undefined }); setDatePopover(null); }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Popover open={datePopover === "to"} onOpenChange={(o) => setDatePopover(o ? "to" : null)}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-8 text-xs flex-1 justify-start", !filters.dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {filters.dateTo ? format(filters.dateTo, "dd/MM/yy", { locale: ptBR }) : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(d) => { onChange({ ...filters, dateTo: d ?? undefined }); setDatePopover(null); }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Phase filter */}
          <div className="p-4 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fase</span>
            <div className="flex flex-wrap gap-1.5">
              {phases.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePhase(p.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
                    filters.phaseIds.includes(p.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                  )}
                >
                  {p.title.replace(/^Fase \d+ - /, "")}
                </button>
              ))}
            </div>
          </div>

          {/* Tag filter */}
          <div className="p-4 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Etiquetas</span>
            <div className="flex flex-wrap gap-1.5">
              {tagList.length === 0 && allCardTags.length === 0 ? (
                <span className="text-xs text-muted-foreground">Nenhuma tag</span>
              ) : (
                [...new Set([...tagList.map(t => t.name), ...allCardTags])].map(tagName => {
                  const tag = tagList.find(t => t.name === tagName);
                  return (
                    <button
                      key={tagName}
                      onClick={() => toggleTag(tagName)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
                        filters.tags.includes(tagName)
                          ? "text-white border-transparent"
                          : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                      )}
                      style={filters.tags.includes(tagName) ? { backgroundColor: tag?.color || "#6b7280" } : undefined}
                    >
                      {tagName}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Responsible filter */}
          <div className="p-4 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Responsável</span>
            <div className="flex flex-col gap-1">
              {(people ?? []).map(person => (
                <button
                  key={person.id}
                  onClick={() => toggleResponsible(person.name)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors",
                    filters.responsibles.includes(person.name)
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  {person.avatar_url ? (
                    <img src={person.avatar_url} alt={person.name} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                      {person.name.charAt(0)}
                    </div>
                  )}
                  {person.name}
                </button>
              ))}
              {(people ?? []).length === 0 && (
                <span className="text-xs text-muted-foreground">Nenhum responsável</span>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
