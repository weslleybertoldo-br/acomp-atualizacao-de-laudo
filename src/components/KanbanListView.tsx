import { formatDistanceToNow, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useKanbanTags, useResponsiblePeople } from "@/hooks/useKanbanData";
import type { KanbanPhase, KanbanCard } from "@/data/kanbanData";

interface KanbanListViewProps {
  phases: KanbanPhase[];
  onCardClick: (card: KanbanCard, phaseId: number) => void;
}

function TagDot({ tagName, allTags }: { tagName: string; allTags: { name: string; color: string }[] }) {
  const tag = allTags.find(t => t.name === tagName);
  const color = tag?.color || "#6b7280";
  const abbrev = tagName.slice(0, 2);

  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 cursor-default"
      style={{ backgroundColor: color }}
      title={tagName}
    >
      {abbrev}
    </div>
  );
}

export function KanbanListView({ phases, onCardClick }: KanbanListViewProps) {
  const { data: allTags } = useKanbanTags();
  const { data: responsiblePeople } = useResponsiblePeople();

  // Flatten all cards with their phase info
  const rows = phases.flatMap(phase =>
    phase.cards.map(card => ({ card, phase }))
  );

  const getResponsibleAvatar = (name: string) => {
    return responsiblePeople?.find(p => p.name === name)?.avatar_url;
  };

  const getTimeInPhase = (card: KanbanCard) => {
    // Use updated_at approximation via created_at
    const created = new Date(card.dueDate + "T00:00:00");
    const hours = Math.abs(differenceInHours(new Date(), created));
    if (hours < 1) return "< 1 hora";
    if (hours < 24) return `${hours} horas`;
    const days = Math.floor(hours / 24);
    return `${days} dia${days > 1 ? "s" : ""}`;
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground text-xs">
            <th className="px-4 py-3 font-medium">Fase atual</th>
            <th className="px-4 py-3 font-medium">Título</th>
            <th className="px-4 py-3 font-medium">Data de vencimento</th>
            <th className="px-4 py-3 font-medium">Responsáveis</th>
            <th className="px-4 py-3 font-medium">Etiquetas</th>
            <th className="px-4 py-3 font-medium text-right">Tempo na fase</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-12 text-muted-foreground">
                Nenhum card encontrado.
              </td>
            </tr>
          ) : (
            rows.map(({ card, phase }) => {
              const avatar = getResponsibleAvatar(card.responsible);
              return (
                <tr
                  key={card.id}
                  className="border-b border-border hover:bg-secondary/40 cursor-pointer transition-colors"
                  onClick={() => onCardClick(card, phase.id)}
                >
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground truncate max-w-[180px] block">
                      {phase.title}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {card.code}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {card.dueLabel || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {card.responsible ? (
                      <div className="flex items-center gap-2">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={card.responsible}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {card.responsible.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs text-foreground truncate max-w-[140px]">
                          {card.responsible}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {card.tags.length > 0 ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        {card.tags.map((tag, i) => (
                          <TagDot key={i} tagName={tag} allTags={allTags ?? []} />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {getTimeInPhase(card)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
