import { MessageSquare, Paperclip, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { KanbanCard as KanbanCardType } from "@/data/kanbanData";
import { useKanbanTags, useResponsiblePeople } from "@/hooks/useKanbanData";
import { cn } from "@/lib/utils";

interface KanbanCardItemProps {
  card: KanbanCardType;
  onClick: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggle?: () => void;
}

export function KanbanCardItem({ card, onClick, selectionMode, isSelected, onToggle }: KanbanCardItemProps) {
  const { data: allTags } = useKanbanTags();
  const { data: people } = useResponsiblePeople();

  const personData = card.responsible ? (people ?? []).find(p => p.name === card.responsible) : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg bg-card border border-border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-2.5",
        selectionMode && isSelected && "ring-2 ring-primary border-primary bg-primary/5"
      )}
    >
      {/* Header: checkbox + code + tags */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {selectionMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggle?.()}
            onClick={(e) => e.stopPropagation()}
            className="mr-1"
          />
        )}
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
        <div className="mt-0.5 flex items-center gap-1.5">
          {card.responsible ? (
            <>
              <Avatar className="h-5 w-5 shrink-0">
                {personData?.avatar_url ? (
                  <AvatarImage src={personData.avatar_url} alt={card.responsible} />
                ) : null}
                <AvatarFallback className="text-[8px] font-bold bg-primary/20 text-primary">
                  {card.responsible.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground/80">{card.responsible}</span>
            </>
          ) : (
            <span className="font-medium text-foreground/80">—</span>
          )}
        </div>
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
