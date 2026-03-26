import { useState, useMemo } from "react";
import { useKanbanData, useResponsiblePeople } from "@/hooks/useKanbanData";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, subDays, subWeeks, subMonths, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type PeriodPreset = "hoje" | "7dias" | "30dias" | "custom";
type ReportType = "responsavel_atualizacao" | "responsavel" | "fase" | "tag" | "sapron" | "cards_periodo";

const REPORT_OPTIONS: { value: ReportType; label: string }[] = [
  { value: "responsavel_atualizacao", label: "Cards por responsável de atualização de laudo" },
  { value: "responsavel", label: "Cards por responsável" },
  { value: "fase", label: "Cards por fase" },
  { value: "tag", label: "Cards por tag" },
  { value: "sapron", label: "Laudo adicionado na Sapron" },
  { value: "cards_periodo", label: "Cards criados no período" },
];

export function KanbanReports() {
  const { data: phases } = useKanbanData();
  const { data: people } = useResponsiblePeople();
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("30dias");
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [activeReport, setActiveReport] = useState<ReportType>("responsavel_atualizacao");

  const dateRange = useMemo(() => {
    const now = new Date();
    if (periodPreset === "hoje") return { start: startOfDay(now), end: endOfDay(now) };
    if (periodPreset === "7dias") return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    if (periodPreset === "30dias") return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    if (customStart && customEnd) return { start: startOfDay(customStart), end: endOfDay(customEnd) };
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
    switch (activeReport) {
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
  }, [activeReport, filteredCards]);

  const getPersonAvatar = (name: string) => {
    return (people ?? []).find(p => p.name === name);
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Período:</span>
        {([
          { value: "hoje", label: "Hoje" },
          { value: "7dias", label: "Últimos 7 dias" },
          { value: "30dias", label: "Últimos 30 dias" },
          { value: "custom", label: "Personalizado" },
        ] as { value: PeriodPreset; label: string }[]).map(p => (
          <Button
            key={p.value}
            variant={periodPreset === p.value ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setPeriodPreset(p.value)}
          >
            {p.label}
          </Button>
        ))}
        {periodPreset === "custom" && (
          <div className="flex items-center gap-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {customStart ? format(customStart, "dd/MM/yyyy") : "Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {customEnd ? format(customEnd, "dd/MM/yyyy") : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Report type selector */}
      <div className="flex flex-wrap gap-2">
        {REPORT_OPTIONS.map(opt => (
          <Button
            key={opt.value}
            variant={activeReport === opt.value ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setActiveReport(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Total: <strong className="text-foreground">{filteredCards.length}</strong> cards no período
        {" · "}
        {format(dateRange.start, "dd/MM/yyyy", { locale: ptBR })} — {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
      </div>

      {/* Report table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-2.5 font-semibold text-foreground">
                {activeReport === "responsavel_atualizacao" ? "Responsável (atualização)" :
                 activeReport === "responsavel" ? "Responsável" :
                 activeReport === "fase" ? "Fase" :
                 activeReport === "tag" ? "Tag" :
                 activeReport === "sapron" ? "Status Sapron" :
                 "Período"}
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
                const personData = (activeReport === "responsavel_atualizacao" || activeReport === "responsavel")
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
