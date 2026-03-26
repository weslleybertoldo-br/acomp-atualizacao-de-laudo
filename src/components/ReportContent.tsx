import { useMemo } from "react";
import { useKanbanData, useResponsiblePeople } from "@/hooks/useKanbanData";
import { format, subDays, startOfDay, endOfDay, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
        if (!card.dueDate) return true;
        const d = new Date(card.dueDate);
        return !isBefore(d, dateRange.start) && !isAfter(d, dateRange.end);
      });
    }

    // 2. Filter by selected phases
    if (selectedPhases.length > 0) {
      cards = cards.filter(card => selectedPhases.includes(card.phaseId));
    }

    // 3. Filter by selected variable values
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

  // Require at least a variable with values selected to show cards
  const hasVariableFilter = !!(selectedVariable && selectedValues.length > 0);

  const getPersonAvatar = (name: string) => {
    return (people ?? []).find(p => p.name === name);
  };

  // Group by variable — only show data when variable+values are selected
  const groupedData = useMemo(() => {
    if (!hasVariableFilter) return [];

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
          keys = (!card.tags || card.tags.length === 0) ? ["(Sem tag)"] : card.tags.filter(t => selectedValues.includes(t));
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
  }, [selectedVariable, selectedValues, filteredCards, hasVariableFilter]);

  if (!hasVariableFilter) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">Selecione uma variável e seus valores para visualizar os cards.</p>
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
              <th className="text-left px-4 py-2.5 font-semibold text-foreground">Códigos</th>
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
                  <tr key={groupName} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
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
                      <div className="flex flex-wrap gap-1">
                        {cards.map(c => (
                          <span key={c.id} className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-mono">
                            {c.code}
                          </span>
                        ))}
                      </div>
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
