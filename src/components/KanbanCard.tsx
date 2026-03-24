import { MessageSquare, Paperclip, Calendar } from "lucide-react";
import type { KanbanCard as KanbanCardType } from "@/data/kanbanData";

const statusColors: Record<KanbanCardType["status"], string> = {
  on: "bg-badge-on",
  standby: "bg-badge-standby",
  expired: "bg-badge-expired",
};

const statusLabels: Record<KanbanCardType["status"], string> = {
  on: "On",
  standby: "Stand By",
  expired: "Expirado",
};

export function KanbanCardItem({ card }: { card: KanbanCardType }) {
  return (
    <div className="rounded-lg bg-card border border-border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-2.5">
      {/* Header: status + tags */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-primary-foreground ${statusColors[card.status]}`}
        >
          {card.statusLabel || statusLabels[card.status]}
        </span>
        {card.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Code */}
      <p className="text-sm font-bold text-foreground">{card.code}</p>

      {/* Responsible */}
      <div className="text-xs text-muted-foreground">
        <span className="uppercase tracking-wide text-[10px] font-semibold text-muted-foreground/70">
          Responsável
        </span>
        <p className="mt-0.5 font-medium text-foreground/80">{card.responsible}</p>
      </div>

      {/* Due date */}
      <div className="flex items-center gap-1.5 text-xs">
        <Calendar className="h-3 w-3 text-muted-foreground" />
        <span className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-medium text-[11px]">
          {card.dueLabel}
        </span>
      </div>

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
