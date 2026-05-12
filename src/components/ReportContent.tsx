import { useMemo } from "react";
import { useKanbanData, useResponsiblePeople, useCardEvents, type CardEvent, type CardEventType } from "@/hooks/useKanbanData";
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

// Mapa variavel -> tipos de evento que respondem por ela quando ha filtro de periodo
const VARIABLE_EVENT_TYPES: Record<string, CardEventType[]> = {
  responsavel_atualizacao: ["update_responsible_changed"],
  responsavel: ["responsible_changed"],
  tag: ["tag_added"],
  sapron: ["sapron_marked", "sapron_unmarked"],
};

export function ReportContent({ periodPreset, customStart, customEnd, selectedVariable, selectedValues, selectedPhases }: ReportContentProps) {
  const { data: phases } = useKanbanData();
  const { data: people } = useResponsiblePeople();

  const dateRange = useMemo(() => {
    const now = new Date();
    if (periodPreset === "hoje") return { start: startOfDay(now), end: endOfDay(now) };
    if (periodPreset === "7dias") return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    if (periodPreset === "30dias") return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    if (customStart && customEnd) {
      // Parse YYYY-MM-DD como data LOCAL (evita UTC shift que joga 11/05 -> 10/05 em BRT)
      const parseLocal = (iso: string) => {
        const [y, m, d] = iso.split("-").map(Number);
        return new Date(y, m - 1, d);
      };
      return { start: startOfDay(parseLocal(customStart)), end: endOfDay(parseLocal(customEnd)) };
    }
    return null;
  }, [periodPreset, customStart, customEnd]);

  const allCards = useMemo(() => {
    if (!phases) return [];
    return phases.flatMap(p => p.cards.map(c => ({ ...c, phaseId: p.id, phaseTitle: p.title })));
  }, [phases]);

  const cardById = useMemo(() => {
    const map: Record<string, typeof allCards[number]> = {};
    for (const c of allCards) map[c.id] = c;
    return map;
  }, [allCards]);

  // Filtros ativos
  const hasVariableFilter = !!selectedVariable;
  const hasAnyFilter = !!dateRange || selectedPhases.length > 0 || hasVariableFilter;

  // Modo eventos: periodo + variavel selecionados => consulta audit log
  const useEventsMode = !!dateRange && hasVariableFilter;
  const eventTypes = useEventsMode ? (VARIABLE_EVENT_TYPES[selectedVariable!] ?? []) : [];

  const { data: events } = useCardEvents({
    startIso: useEventsMode && dateRange ? dateRange.start.toISOString() : null,
    endIso: useEventsMode && dateRange ? dateRange.end.toISOString() : null,
    eventTypes,
  });

  // Cards filtrados pelo modo "cards atuais" (sem periodo ou sem variavel)
  const filteredCardsFallback = useMemo(() => {
    let cards = allCards;
    if (dateRange) {
      cards = cards.filter(card => {
        const dateStr = card.createdAt;
        if (!dateStr) return true;
        const d = new Date(dateStr);
        return !isBefore(d, dateRange.start) && !isAfter(d, dateRange.end);
      });
    }
    if (selectedPhases.length > 0) {
      cards = cards.filter(card => selectedPhases.includes(card.phaseId));
    }
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

  const getPersonAvatar = (name: string) => (people ?? []).find(p => p.name === name);

  // Agrupamento do modo EVENTOS: agrupa por valor atribuido no periodo, dedup card por grupo
  const eventGroups = useMemo<Array<[string, Array<{ id: string; code: string; phaseId: number; phaseTitle: string; eventAt: string }>]>>(() => {
    if (!useEventsMode || !events) return [];

    const map: Record<string, Map<string, { id: string; code: string; phaseId: number; phaseTitle: string; eventAt: string }>> = {};

    for (const ev of events as CardEvent[]) {
      const card = cardById[ev.card_id];
      if (!card) continue; // card pode ter sido deletado
      if (selectedPhases.length > 0 && !selectedPhases.includes(card.phaseId)) continue;

      let key: string | null = null;
      switch (selectedVariable) {
        case "responsavel_atualizacao":
          // Atribuicao no periodo + valor AINDA ativo no card (trocou/removeu => some)
          if (!ev.new_value) continue;
          if (card.updateResponsible !== ev.new_value) continue;
          key = ev.new_value;
          break;
        case "responsavel":
          if (!ev.new_value) continue;
          if (card.responsible !== ev.new_value) continue;
          key = ev.new_value;
          break;
        case "tag":
          // Tag adicionada no periodo + ainda presente no card
          if (!ev.new_value) continue;
          if (!(card.tags ?? []).includes(ev.new_value)) continue;
          key = ev.new_value;
          break;
        case "sapron":
          // Estado atual deve bater com o evento
          if (ev.event_type === "sapron_marked") {
            if (!card.sapronAdded) continue;
            key = "Marcado na Sapron";
          } else if (ev.event_type === "sapron_unmarked") {
            if (card.sapronAdded) continue;
            key = "Desmarcado da Sapron";
          }
          break;
      }
      if (!key) continue;

      // Filtro de valores selecionados (quando user filtra valores especificos)
      if (selectedValues.length > 0) {
        if (selectedVariable === "sapron") {
          const wantsMarked = selectedValues.includes("sim");
          const wantsUnmarked = selectedValues.includes("nao");
          if (ev.event_type === "sapron_marked" && !wantsMarked) continue;
          if (ev.event_type === "sapron_unmarked" && !wantsUnmarked) continue;
        } else {
          if (!selectedValues.includes(key)) continue;
        }
      }

      if (!map[key]) map[key] = new Map();
      // Dedup por card_id, mantem evento mais antigo do periodo (events ja vem desc)
      if (!map[key].has(card.id)) {
        map[key].set(card.id, {
          id: card.id,
          code: card.code,
          phaseId: card.phaseId,
          phaseTitle: card.phaseTitle,
          eventAt: ev.created_at,
        });
      }
    }

    return Object.entries(map)
      .map(([k, v]) => [k, Array.from(v.values())] as [string, Array<{ id: string; code: string; phaseId: number; phaseTitle: string; eventAt: string }>])
      .sort((a, b) => b[1].length - a[1].length);
  }, [useEventsMode, events, cardById, selectedVariable, selectedValues, selectedPhases]);

  // Agrupamento do modo CARDS (sem periodo ou sem variavel) -> mantem logica antiga
  const cardGroups = useMemo<Array<[string, typeof filteredCardsFallback]>>(() => {
    if (useEventsMode) return [];
    if (!hasAnyFilter) return [];

    if (hasVariableFilter) {
      const map: Record<string, typeof filteredCardsFallback> = {};
      for (const card of filteredCardsFallback) {
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

    if (selectedPhases.length > 0) {
      const map: Record<string, typeof filteredCardsFallback> = {};
      for (const card of filteredCardsFallback) {
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

    return [["Todos os cards", filteredCardsFallback]];
  }, [useEventsMode, hasAnyFilter, hasVariableFilter, filteredCardsFallback, selectedVariable, selectedPhases]);

  if (!hasAnyFilter) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">Selecione pelo menos um filtro para visualizar os cards.</p>
      </div>
    );
  }

  const showPersonAvatar = selectedVariable === "responsavel_atualizacao" || selectedVariable === "responsavel";
  const totalCount = useEventsMode
    ? eventGroups.reduce((acc, [, arr]) => acc + arr.length, 0)
    : (cardGroups[0]?.[0] === "Todos os cards" ? cardGroups[0][1].length : cardGroups.reduce((acc, [, arr]) => acc + arr.length, 0));

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Total: <strong className="text-foreground">{totalCount}</strong> {useEventsMode ? "atribuições" : "cards"}
        {dateRange && (
          <>
            {" · "}
            {format(dateRange.start, "dd/MM/yyyy", { locale: ptBR })} — {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
          </>
        )}
        {useEventsMode && (
          <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">
            por data da atualização
          </span>
        )}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-2.5 font-semibold text-foreground">Grupo</th>
              <th className="text-center px-4 py-2.5 font-semibold text-foreground w-24">{useEventsMode ? "Cards" : "Cards"}</th>
              <th className="text-left px-4 py-2.5 font-semibold text-foreground w-32">Códigos</th>
            </tr>
          </thead>
          <tbody>
            {(useEventsMode ? eventGroups : cardGroups).length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-muted-foreground">
                  Nenhum dado encontrado.
                </td>
              </tr>
            ) : useEventsMode ? (
              eventGroups.map(([groupName, items]) => {
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
                        {items.length}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <HoverCard openDelay={100} closeDelay={200}>
                        <HoverCardTrigger asChild>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(items.map(c => c.code).join(", "));
                              toast.success("Códigos copiados!");
                            }}
                            className="flex items-center gap-1 text-xs text-primary font-medium cursor-pointer hover:underline"
                          >
                            <Copy className="h-3 w-3" />
                            CARDs
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-72 p-3 max-h-72 overflow-y-auto" align="start">
                          <div className="space-y-1.5">
                            <span className="text-xs font-semibold text-foreground">{items.length} card(s)</span>
                            {items.map(c => (
                              <div key={c.id} className="flex items-center justify-between group/card gap-2">
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-mono text-foreground truncate">{c.code}</span>
                                  <span className="text-[10px] text-muted-foreground">{format(new Date(c.eventAt), "dd/MM HH:mm", { locale: ptBR })}</span>
                                </div>
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
            ) : (
              cardGroups.map(([groupName, cards]) => {
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
