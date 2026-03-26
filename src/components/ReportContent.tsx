import { useMemo } from "react";
import { useKanbanData, useResponsiblePeople } from "@/hooks/useKanbanData";
import { format, subDays, startOfDay, endOfDay, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Copy } from "lucide-react";
import { toast } from "sonner";
interface ReportContentProps {
  periodPreset: string;
  customStart: string | null;
  customEnd: string | null;
  selectedVariable: string | null;
  selectedValues: string[];
  selectedPhases: number[];
}

export function ReportContent({ periodPreset, customStart, customEnd, selectedVariable, selectedValues, selectedPhases }: ReportContentProps) {
  const { data: phases } = useKanbanData();
  const { data: people } = useResponsiblePeople();

  const dateRange = useMemo(() => {
    const now = new Date();
    if (periodPreset === "hoje") return { start: startOfDay(now), end: endOfDay(now) };
    if (periodPreset === "7dias") return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    if (periodPreset === "30dias") return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    if (customStart && customEnd) return { start: startOfDay(new Date(customStart)), end: endOfDay(new Date(customEnd)) };
    return null;
  }, [periodPreset, customStart, customEnd]);

  const allCards = useMemo(() => {
    if (!phases) return [];
    return phases.flatMap(p => p.cards.map(c => ({ ...c, phaseId: p.id, phaseTitle: p.title })));
  }, [phases]);

  // Apply filters cumulatively
  const filteredCards = useMemo(() => {
    let cards = allCards;

    // 1. Filter by time period
    if (dateRange) {
      cards = cards.filter(card => {
        const dateStr = card.createdAt;
        if (!dateStr) return true;
        const d = new Date(dateStr);
        return !isBefore(d, dateRange.start) && !isAfter(d, dateRange.end);
      });
    }

    // 2. Filter by selected phases
    if (selectedPhases.length > 0) {
      cards = cards.filter(card => selectedPhases.includes(card.phaseId));
    }

    // 3. Filter by selected variable values (only when values are explicitly selected)
    if (selectedVariable && selectedValues.length > 0) {
      cards = cards.filter(card => {
        switch (selectedVariable) {
          case "responsavel_atualizacao":
            return selectedValues.includes(card.updateResponsible || "(Sem responsável)");
          case "responsavel":
            return selectedValues.includes(card.responsible || "(Sem responsável)");
          case "tag":
            if (!card.tags || card.tags.length === 0) return selectedValues.includes("(Sem tag)");
            return card.tags.some(t => selectedValues.includes(t));
          case "sapron":
            if (selectedValues.includes("sim") && card.sapronAdded) return true;
            if (selectedValues.includes("nao") && !card.sapronAdded) return true;
            return false;
          default:
            return true;
        }
      });
    }

    return cards;
  }, [allCards, dateRange, selectedPhases, selectedVariable, selectedValues]);

  // Show cards when ANY filter is active
  const hasAnyFilter = !!dateRange || selectedPhases.length > 0 || !!selectedVariable;
  const hasVariableFilter = !!selectedVariable;

  const getPersonAvatar = (name: string) => {
    return (people ?? []).find(p => p.name === name);
  };

  // Group data: by variable if selected, otherwise by phase, otherwise flat list
  const groupedData = useMemo(() => {
    if (!hasAnyFilter) return [];

    if (hasVariableFilter) {
      const map: Record<string, typeof filteredCards> = {};
      for (const card of filteredCards) {
        let keys: string[] = [];
        switch (selectedVariable) {
          case "responsavel_atualizacao":
            keys = [card.updateResponsible || "(Sem responsável)"];
            break;
          case "responsavel":
            keys = [card.responsible || "(Sem responsável)"];
            break;
          case "tag":
            keys = (!card.tags || card.tags.length === 0) ? ["(Sem tag)"] : [...card.tags];
            break;
          case "sapron":
            keys = [card.sapronAdded ? "Marcado na Sapron" : "Não marcado na Sapron"];
            break;
        }
        for (const key of keys) {
          if (!map[key]) map[key] = [];
          map[key].push(card);
        }
      }
      return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
    }

    // Group by phase if phases selected, otherwise flat
    if (selectedPhases.length > 0) {
      const map: Record<string, typeof filteredCards> = {};
      for (const card of filteredCards) {
        const key = card.phaseTitle;
        if (!map[key]) map[key] = [];
        map[key].push(card);
      }
      return Object.entries(map).sort((a, b) => {
        const phaseA = a[1][0]?.phaseId ?? 0;
        const phaseB = b[1][0]?.phaseId ?? 0;
        return phaseA - phaseB;
      });
    }

    return [["Todos os cards", filteredCards] as [string, typeof filteredCards]];
  }, [selectedVariable, selectedValues, filteredCards, hasAnyFilter, hasVariableFilter, selectedPhases]);

  if (!hasAnyFilter) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">Selecione pelo menos um filtro para visualizar os cards.</p>
      </div>
    );
  }

  const showPersonAvatar = selectedVariable === "responsavel_atualizacao" || selectedVariable === "responsavel";

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Total: <strong className="text-foreground">{filteredCards.length}</strong> cards
        {dateRange && (
          <>
            {" · "}
            {format(dateRange.start, "dd/MM/yyyy", { locale: ptBR })} — {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
          </>
        )}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-2.5 font-semibold text-foreground">Grupo</th>
              <th className="text-center px-4 py-2.5 font-semibold text-foreground w-24">Cards</th>
              <th className="text-left px-4 py-2.5 font-semibold text-foreground w-32">Códigos</th>
            </tr>
          </thead>
          <tbody>
            {groupedData.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-muted-foreground">
                  Nenhum dado encontrado.
                </td>
              </tr>
            ) : (
              groupedData.map(([groupName, cards]) => {
                const personData = showPersonAvatar ? getPersonAvatar(groupName) : null;
                return (
                  <tr key={groupName} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors group/row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {personData && (
                          <Avatar className="h-6 w-6 shrink-0">
                            {personData.avatar_url ? <AvatarImage src={personData.avatar_url} alt={groupName} /> : null}
                            <AvatarFallback className="text-[9px] font-bold bg-primary/20 text-primary">
                              {groupName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="font-medium text-foreground">{groupName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center bg-primary/10 text-primary font-bold rounded-full h-7 min-w-[28px] px-2 text-xs">
                        {cards.length}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <HoverCard openDelay={100} closeDelay={200}>
                        <HoverCardTrigger asChild>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(cards.map(c => c.code).join(", "));
                              toast.success("Códigos copiados!");
                            }}
                            className="flex items-center gap-1 text-xs text-primary font-medium cursor-pointer hover:underline"
                          >
                            <Copy className="h-3 w-3" />
                            CARDs
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-64 p-3 max-h-60 overflow-y-auto" align="start">
                          <div className="space-y-1.5">
                            <span className="text-xs font-semibold text-foreground">{cards.length} card(s)</span>
                            {cards.map(c => (
                              <div key={c.id} className="flex items-center justify-between group/card">
                                <span className="text-xs font-mono text-foreground">{c.code}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(c.code);
                                    toast.success(`${c.code} copiado!`);
                                  }}
                                  className="opacity-0 group-hover/card:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
