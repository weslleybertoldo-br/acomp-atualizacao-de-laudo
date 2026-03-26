import { useMemo } from "react";
import { useKanbanData, useResponsiblePeople } from "@/hooks/useKanbanData";
import { format, subDays, startOfDay, endOfDay, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type ReportType = "responsavel_atualizacao" | "responsavel" | "fase" | "tag" | "sapron" | "cards_periodo";

const REPORT_LABELS: Record<ReportType, string> = {
  responsavel_atualizacao: "Responsável (atualização)",
  responsavel: "Responsável",
  fase: "Fase",
  tag: "Tag",
  sapron: "Status Sapron",
  cards_periodo: "Período",
};

interface ReportContentProps {
  reportType: ReportType;
  periodPreset: string;
  customStart: string | null;
  customEnd: string | null;
}

export function ReportContent({ reportType, periodPreset, customStart, customEnd }: ReportContentProps) {
  const { data: phases } = useKanbanData();
  const { data: people } = useResponsiblePeople();

  const dateRange = useMemo(() => {
    const now = new Date();
    if (periodPreset === "hoje") return { start: startOfDay(now), end: endOfDay(now) };
    if (periodPreset === "7dias") return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    if (periodPreset === "30dias") return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    if (customStart && customEnd) return { start: startOfDay(new Date(customStart)), end: endOfDay(new Date(customEnd)) };
    return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
  }, [periodPreset, customStart, customEnd]);

  const allCards = useMemo(() => {
    if (!phases) return [];
    return phases.flatMap(p => p.cards.map(c => ({ ...c, phaseId: p.id, phaseTitle: p.title })));
  }, [phases]);

  const filteredCards = useMemo(() => {
    return allCards.filter(card => {
      const createdAt = new Date(card.dueDate || "");
      if (!card.dueDate) return true;
      return !isBefore(createdAt, dateRange.start) && !isAfter(createdAt, dateRange.end);
    });
  }, [allCards, dateRange]);

  const reportData = useMemo(() => {
    switch (reportType) {
      case "responsavel_atualizacao": {
        const map: Record<string, typeof filteredCards> = {};
        for (const card of filteredCards) {
          const name = card.updateResponsible || "(Sem responsável)";
          if (!map[name]) map[name] = [];
          map[name].push(card);
        }
        return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
      }
      case "responsavel": {
        const map: Record<string, typeof filteredCards> = {};
        for (const card of filteredCards) {
          const name = card.responsible || "(Sem responsável)";
          if (!map[name]) map[name] = [];
          map[name].push(card);
        }
        return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
      }
      case "fase": {
        const map: Record<string, typeof filteredCards> = {};
        for (const card of filteredCards) {
          const name = card.phaseTitle;
          if (!map[name]) map[name] = [];
          map[name].push(card);
        }
        return Object.entries(map).sort((a, b) => {
          const phaseA = a[1][0]?.phaseId ?? 0;
          const phaseB = b[1][0]?.phaseId ?? 0;
          return phaseA - phaseB;
        });
      }
      case "tag": {
        const map: Record<string, typeof filteredCards> = {};
        for (const card of filteredCards) {
          if (!card.tags || card.tags.length === 0) {
            const key = "(Sem tag)";
            if (!map[key]) map[key] = [];
            map[key].push(card);
          } else {
            for (const tag of card.tags) {
              if (!map[tag]) map[tag] = [];
              map[tag].push(card);
            }
          }
        }
        return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
      }
      case "sapron": {
        const marked = filteredCards.filter(c => c.sapronAdded);
        const notMarked = filteredCards.filter(c => !c.sapronAdded);
        return [
          ["Marcado como adicionado", marked] as [string, typeof filteredCards],
          ["Não marcado", notMarked] as [string, typeof filteredCards],
        ];
      }
      case "cards_periodo": {
        return [["Cards no período", filteredCards] as [string, typeof filteredCards]];
      }
      default:
        return [];
    }
  }, [reportType, filteredCards]);

  const getPersonAvatar = (name: string) => {
    return (people ?? []).find(p => p.name === name);
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Total: <strong className="text-foreground">{filteredCards.length}</strong> cards no período
        {" · "}
        {format(dateRange.start, "dd/MM/yyyy", { locale: ptBR })} — {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-2.5 font-semibold text-foreground">
                {REPORT_LABELS[reportType] ?? "Grupo"}
              </th>
              <th className="text-center px-4 py-2.5 font-semibold text-foreground w-24">Cards</th>
              <th className="text-left px-4 py-2.5 font-semibold text-foreground">Códigos</th>
            </tr>
          </thead>
          <tbody>
            {reportData.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-muted-foreground">
                  Nenhum dado encontrado para o período selecionado.
                </td>
              </tr>
            ) : (
              reportData.map(([groupName, cards]) => {
                const personData = (reportType === "responsavel_atualizacao" || reportType === "responsavel")
                  ? getPersonAvatar(groupName)
                  : null;
                return (
                  <tr key={groupName} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {personData && (
                          <Avatar className="h-6 w-6 shrink-0">
                            {personData.avatar_url ? (
                              <AvatarImage src={personData.avatar_url} alt={groupName} />
                            ) : null}
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
