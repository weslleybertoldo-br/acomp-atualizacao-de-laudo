import { MessageSquare, Paperclip, Calendar } from "lucide-react";
import type { KanbanCard as KanbanCardType } from "@/data/kanbanData";
import { useKanbanTags } from "@/hooks/useKanbanData";

interface KanbanCardItemProps {
  card: KanbanCardType;
  onClick: () => void;
}

export function KanbanCardItem({ card, onClick }: KanbanCardItemProps) {
  const { data: allTags } = useKanbanTags();

  return (
    <div
      onClick={onClick}
      className="rounded-lg bg-card border border-border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-2.5"
    >
      {/* Header: code + tags */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <p className="text-sm font-bold text-foreground">{card.code}</p>
        {(card.tags ?? []).map((tagName) => {
          const tagData = (allTags ?? []).find(t => t.name === tagName);
          return (
            <span
              key={tagName}
              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: tagData?.color || "#3b82f6" }}
            >
              {tagName}
            </span>
          );
        })}
      </div>

      {/* Responsible */}
      <div className="text-xs text-muted-foreground">
        <span className="uppercase tracking-wide text-[10px] font-semibold text-muted-foreground/70">
          Responsável
        </span>
        <p className="mt-0.5 font-medium text-foreground/80">{card.responsible || "—"}</p>
      </div>

      {/* Due date / Sent date */}
      {card.dueLabel && (
        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-medium text-[11px]">
            {card.dueLabel}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 pt-1 border-t border-border text-muted-foreground text-xs">
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {card.comments}
        </span>
        <span className="flex items-center gap-1">
          <Paperclip className="h-3 w-3" />
          {card.attachments}
        </span>
      </div>
    </div>
  );
}
