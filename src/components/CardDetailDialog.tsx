import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowRight, MessageSquare, Send, Loader2, Trash2, CalendarIcon, X, Plus, Tag, User, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanbanCard } from "@/data/kanbanData";
import { useMoveCard, useDeleteCard, useUpdateCard, useCardComments, useAddComment, buildDueLabel } from "@/hooks/useKanbanData";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CardDetailDialogProps {
  card: KanbanCard | null;
  currentPhaseId: number;
  totalPhases: number;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<KanbanCard["status"], string> = {
  on: "bg-badge-on",
  standby: "bg-badge-standby",
  expired: "bg-badge-expired",
};

const statusLabels: Record<KanbanCard["status"], string> = {
  on: "On",
  standby: "Stand By",
  expired: "Expirado",
};

export function CardDetailDialog({ card, currentPhaseId, totalPhases, onOpenChange }: CardDetailDialogProps) {
  const [commentText, setCommentText] = useState("");
  const [newTag, setNewTag] = useState("");
  const [editingResponsible, setEditingResponsible] = useState(false);
  const [responsibleText, setResponsibleText] = useState("");
  const moveCard = useMoveCard();
  const deleteCard = useDeleteCard();
  const updateCard = useUpdateCard();
  const addComment = useAddComment();
  const { data: comments, isLoading: loadingComments } = useCardComments(card?.id ?? "");

  if (!card) return null;

  const canMoveNext = currentPhaseId < totalPhases - 1;
  const currentDate = card.dueDate ? new Date(card.dueDate + "T00:00:00") : undefined;

  const handleMoveNext = () => {
    moveCard.mutate(
      { cardId: card.id, newPhaseId: currentPhaseId + 1 },
      {
        onSuccess: () => {
          toast.success(`Card ${card.code} movido para a próxima fase!`);
          onOpenChange(false);
        },
        onError: () => toast.error("Erro ao mover card."),
      }
    );
  };

  const handleDelete = () => {
    deleteCard.mutate(card.id, {
      onSuccess: () => {
        toast.success(`Card ${card.code} excluído!`);
        onOpenChange(false);
      },
      onError: () => toast.error("Erro ao excluir card."),
    });
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const dateStr = format(date, "yyyy-MM-dd");
      updateCard.mutate(
        { cardId: card.id, updates: { due_date: dateStr, due_label: buildDueLabel(dateStr) } },
        { onSuccess: () => toast.success("Data atualizada!"), onError: () => toast.error("Erro ao atualizar data.") }
      );
    }
  };

  const handleRemoveDate = () => {
    updateCard.mutate(
      { cardId: card.id, updates: { due_date: null, due_label: null } },
      { onSuccess: () => toast.success("Data removida!"), onError: () => toast.error("Erro ao remover data.") }
    );
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (!tag || card.tags.includes(tag)) return;
    updateCard.mutate(
      { cardId: card.id, updates: { tags: [...card.tags, tag] } },
      { onSuccess: () => { setNewTag(""); toast.success("Tag adicionada!"); }, onError: () => toast.error("Erro ao adicionar tag.") }
    );
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateCard.mutate(
      { cardId: card.id, updates: { tags: card.tags.filter((t) => t !== tagToRemove) } },
      { onSuccess: () => toast.success("Tag removida!"), onError: () => toast.error("Erro ao remover tag.") }
    );
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addComment.mutate(
      { cardId: card.id, content: commentText.trim() },
      {
        onSuccess: () => { setCommentText(""); toast.success("Comentário adicionado!"); },
        onError: () => toast.error("Erro ao adicionar comentário."),
      }
    );
  };

  return (
    <Dialog open={!!card} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">{card.code}</span>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-primary-foreground ${statusColors[card.status]}`}
            >
              {card.statusLabel || statusLabels[card.status]}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Responsável</span>
              {editingResponsible ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Input
                    value={responsibleText}
                    onChange={(e) => setResponsibleText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateCard.mutate(
                          { cardId: card.id, updates: { responsible: responsibleText.trim() } },
                          { onSuccess: () => { setEditingResponsible(false); toast.success("Responsável atualizado!"); } }
                        );
                      } else if (e.key === "Escape") {
                        setEditingResponsible(false);
                      }
                    }}
                    className="h-7 text-xs"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      updateCard.mutate(
                        { cardId: card.id, updates: { responsible: responsibleText.trim() } },
                        { onSuccess: () => { setEditingResponsible(false); toast.success("Responsável atualizado!"); } }
                      );
                    }}
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="font-medium">{card.responsible || "—"}</p>
                  <button
                    onClick={() => { setResponsibleText(card.responsible || ""); setEditingResponsible(true); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  {card.responsible && (
                    <button
                      onClick={() => {
                        updateCard.mutate(
                          { cardId: card.id, updates: { responsible: "" } },
                          { onSuccess: () => toast.success("Responsável removido!") }
                        );
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Vencimento</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("justify-start text-left font-normal h-8 text-xs", !currentDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {currentDate ? format(currentDate, "dd/MM/yyyy") : "Definir data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={currentDate}
                      onSelect={handleDateChange}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {currentDate && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRemoveDate}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
              <Tag className="h-3 w-3" />
              Tags
            </h4>
            <div className="flex gap-1.5 flex-wrap">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1"
                >
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input
                placeholder="Nova tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                className="h-8 text-xs"
              />
              <Button size="sm" variant="outline" onClick={handleAddTag} disabled={!newTag.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Move to next phase */}
          {canMoveNext && (
            <>
              <Separator />
              <Button onClick={handleMoveNext} disabled={moveCard.isPending} className="w-full" variant="default">
                <ArrowRight className="h-4 w-4 mr-2" />
                Mover para próxima fase
              </Button>
            </>
          )}

          {/* Delete card */}
          <Separator />
          <Button onClick={handleDelete} disabled={deleteCard.isPending} className="w-full" variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir card
          </Button>

          {/* Comments section */}
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Comentários
            </h4>

            <div className="flex gap-2">
              <Textarea
                placeholder="Adicionar comentário..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handleAddComment}
                disabled={!commentText.trim() || addComment.isPending}
                className="shrink-0 self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (comments ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Nenhum comentário ainda.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(comments ?? []).map((c) => (
                  <div key={c.id} className="rounded-lg bg-secondary p-2.5 text-sm space-y-1">
                    <p>{c.content}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
