import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, MessageSquare, Send, Loader2, Trash2 } from "lucide-react";
import type { KanbanCard } from "@/data/kanbanData";
import { useMoveCard, useDeleteCard, useCardComments, useAddComment } from "@/hooks/useKanbanData";
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
  const moveCard = useMoveCard();
  const addComment = useAddComment();
  const { data: comments, isLoading: loadingComments } = useCardComments(card?.id ?? "");

  if (!card) return null;

  const canMoveNext = currentPhaseId < totalPhases - 1;

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

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addComment.mutate(
      { cardId: card.id, content: commentText.trim() },
      {
        onSuccess: () => {
          setCommentText("");
          toast.success("Comentário adicionado!");
        },
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
              <p className="font-medium">{card.responsible || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Vencimento</span>
              <p className="font-medium">{card.dueLabel}</p>
            </div>
          </div>

          {card.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {card.tags.map((tag) => (
                <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Move to next phase */}
          {canMoveNext && (
            <>
              <Separator />
              <Button
                onClick={handleMoveNext}
                disabled={moveCard.isPending}
                className="w-full"
                variant="default"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Mover para próxima fase
              </Button>
            </>
          )}

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
