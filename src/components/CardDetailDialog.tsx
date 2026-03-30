import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, ArrowRight, MessageSquare, Send, Loader2, Trash2, CalendarIcon, X, Plus, User, Check, Link as LinkIcon, Copy, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanbanCard } from "@/data/kanbanData";
import {
  useMoveCard, useDeleteCard, useUpdateCard, useCardComments, useAddComment, useDeleteComment,
  useResponsiblePeople, useAddResponsiblePerson, useDeleteResponsiblePerson,
  useKanbanTags, useAddKanbanTag, useDeleteKanbanTag, buildDueLabel
} from "@/hooks/useKanbanData";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CardDetailDialogProps {
  card: KanbanCard | null;
  currentPhaseId: number;
  totalPhases: number;
  onOpenChange: (open: boolean) => void;
}

const TAG_COLORS = [
  "#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
];

export function CardDetailDialog({ card, currentPhaseId, totalPhases, onOpenChange }: CardDetailDialogProps) {
  const [commentText, setCommentText] = useState("");
  const [editingCode, setEditingCode] = useState(false);
  const [codeText, setCodeText] = useState("");
  const [newPersonName, setNewPersonName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [newDriveLink, setNewDriveLink] = useState("");
  const moveCard = useMoveCard();
  const deleteCard = useDeleteCard();
  const updateCard = useUpdateCard();
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const { data: people } = useResponsiblePeople();
  const addPerson = useAddResponsiblePerson();
  const deletePerson = useDeleteResponsiblePerson();
  const { data: allTags } = useKanbanTags();
  const addTag = useAddKanbanTag();
  const deleteTag = useDeleteKanbanTag();
  const { data: comments, isLoading: loadingComments } = useCardComments(card?.id ?? "");

  if (!card) return null;

  const canMoveNext = currentPhaseId < totalPhases - 1;
  const canMovePrev = currentPhaseId > 0;
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

  const handleMovePrev = () => {
    moveCard.mutate(
      { cardId: card.id, newPhaseId: currentPhaseId - 1 },
      {
        onSuccess: () => {
          toast.success(`Card ${card.code} retornado para a fase anterior!`);
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

  const handleToggleTag = (tagName: string) => {
    const currentTags = card.tags ?? [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter(t => t !== tagName)
      : [...currentTags, tagName];
    updateCard.mutate(
      { cardId: card.id, updates: { tags: newTags } },
      { onSuccess: () => toast.success("Tags atualizadas!") }
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

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copiado!"),
      () => toast.error("Erro ao copiar link.")
    );
  };

  return (
    <Dialog open={!!card} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {editingCode ? (
              <div className="flex items-center gap-1">
                <Input
                  value={codeText}
                  onChange={(e) => setCodeText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (codeText.trim()) {
                        updateCard.mutate(
                          { cardId: card.id, updates: { code: codeText.trim() } },
                          { onSuccess: () => { setEditingCode(false); toast.success("Código atualizado!"); } }
                        );
                      }
                    } else if (e.key === "Escape") setEditingCode(false);
                  }}
                  className="h-8 text-lg font-bold w-40"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                  if (codeText.trim()) {
                    updateCard.mutate(
                      { cardId: card.id, updates: { code: codeText.trim() } },
                      { onSuccess: () => { setEditingCode(false); toast.success("Código atualizado!"); } }
                    );
                  }
                }}>
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <span className="text-lg group/code inline-flex items-center gap-1">
                {card.code}
                <button
                  className="opacity-0 group-hover/code:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                  onClick={() => { setCodeText(card.code); setEditingCode(true); }}
                  title="Editar código"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {/* Tags next to code */}
            {(card.tags ?? []).map((tagName) => {
              const tagData = (allTags ?? []).find(t => t.name === tagName);
              return (
                <span
                  key={tagName}
                  className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white inline-flex items-center gap-1 group/tag cursor-default"
                  style={{ backgroundColor: tagData?.color || "#3b82f6" }}
                >
                  {tagName}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleTag(tagName); }}
                    className="opacity-0 group-hover/tag:opacity-100 hover:text-red-200 transition-opacity"
                    title="Remover tag do card"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}
            {/* Add/manage tags */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <Plus className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-2 pointer-events-auto" align="start">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground px-1">Gerenciar Tags</p>
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      <Input
                        placeholder="Nova tag..."
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTagName.trim()) {
                            addTag.mutate({ name: newTagName.trim(), color: newTagColor }, {
                              onSuccess: () => { setNewTagName(""); toast.success("Tag criada!"); },
                              onError: () => toast.error("Erro ou tag já existe."),
                            });
                          }
                        }}
                        className="h-7 text-xs"
                      />
                      <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => {
                        if (newTagName.trim()) {
                          addTag.mutate({ name: newTagName.trim(), color: newTagColor }, {
                            onSuccess: () => { setNewTagName(""); toast.success("Tag criada!"); },
                            onError: () => toast.error("Erro ou tag já existe."),
                          });
                        }
                      }}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex gap-1 flex-wrap px-1">
                      {TAG_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setNewTagColor(c)}
                          className={cn(
                            "h-5 w-5 rounded-full border-2 transition-all",
                            newTagColor === c ? "border-foreground scale-110" : "border-transparent"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {(allTags ?? []).map((t) => {
                      const isSelected = (card.tags ?? []).includes(t.name);
                      return (
                        <div key={t.id} className="flex items-center justify-between group">
                          <button
                            onClick={() => handleToggleTag(t.name)}
                            className={cn(
                              "flex-1 text-left text-xs px-2 py-1.5 rounded hover:bg-secondary flex items-center gap-2",
                              isSelected && "font-semibold"
                            )}
                          >
                            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                            {t.name}
                            {isSelected && <Check className="h-3 w-3 ml-auto text-primary" />}
                          </button>
                          <button
                            onClick={() => deleteTag.mutate(t.id, { onSuccess: () => toast.success("Tag removida da lista!") })}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                    {(allTags ?? []).length === 0 && (
                      <p className="text-[10px] text-muted-foreground px-2 py-1">Nenhuma tag cadastrada.</p>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Responsável</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="mt-0.5 h-8 text-xs justify-start w-full">
                    {card.responsible ? (() => {
                      const personData = (people ?? []).find(p => p.name === card.responsible);
                      return personData?.avatar_url ? (
                        <Avatar className="h-5 w-5 mr-1.5 shrink-0">
                          <AvatarImage src={personData.avatar_url} alt={card.responsible} />
                          <AvatarFallback className="text-[8px] font-bold bg-primary/20 text-primary">
                            {card.responsible.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <User className="h-3 w-3 mr-1.5" />
                      );
                    })() : (
                      <User className="h-3 w-3 mr-1.5" />
                    )}
                    {card.responsible || "Selecionar..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 pointer-events-auto" align="start">
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      <Input
                        placeholder="Novo nome..."
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newPersonName.trim()) {
                            addPerson.mutate(newPersonName.trim(), {
                              onSuccess: () => { setNewPersonName(""); toast.success("Pessoa adicionada!"); },
                              onError: () => toast.error("Erro ou nome já existe."),
                            });
                          }
                        }}
                        className="h-7 text-xs"
                      />
                      <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => {
                        if (newPersonName.trim()) {
                          addPerson.mutate(newPersonName.trim(), {
                            onSuccess: () => { setNewPersonName(""); toast.success("Pessoa adicionada!"); },
                            onError: () => toast.error("Erro ou nome já existe."),
                          });
                        }
                      }}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Separator />
                    {card.responsible && (
                      <button
                        onClick={() => {
                          updateCard.mutate(
                            { cardId: card.id, updates: { responsible: "" } },
                            { onSuccess: () => toast.success("Responsável removido!") }
                          );
                        }}
                        className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-destructive/10 text-destructive flex items-center gap-1.5"
                      >
                        <X className="h-3 w-3" /> Remover responsável
                      </button>
                    )}
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
                      {(people ?? []).map((p) => (
                        <div key={p.id} className="flex items-center justify-between group">
                          <button
                            onClick={() => {
                              updateCard.mutate(
                                { cardId: card.id, updates: { responsible: p.name } },
                                { onSuccess: () => toast.success("Responsável atualizado!") }
                              );
                            }}
                            className={cn(
                              "flex-1 text-left text-xs px-2 py-1.5 rounded hover:bg-secondary flex items-center gap-2",
                              card.responsible === p.name && "bg-primary/10 font-semibold text-primary"
                            )}
                          >
                            <Avatar className="h-5 w-5 shrink-0">
                              {(p as any).avatar_url ? (
                                <AvatarImage src={(p as any).avatar_url} alt={p.name} />
                              ) : null}
                              <AvatarFallback className="text-[8px] font-bold bg-primary/20 text-primary">
                                {p.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {p.name}
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Certeza que deseja excluir "${p.name}" da lista?`)) {
                                deletePerson.mutate(p.id, { onSuccess: () => toast.success("Pessoa removida da lista!") });
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {(people ?? []).length === 0 && (
                        <p className="text-[10px] text-muted-foreground px-2 py-1">Nenhuma pessoa cadastrada.</p>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Data</span>
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

          {/* Move to next phase */}
          {(canMovePrev || canMoveNext) && (
            <>
              <Separator />
              <div className="flex gap-2">
                {canMovePrev && (
                  <Button onClick={handleMovePrev} disabled={moveCard.isPending} className="flex-1" variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Fase anterior
                  </Button>
                )}
                {canMoveNext && (
                  <Button onClick={handleMoveNext} disabled={moveCard.isPending} className="flex-1" variant="default">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Próxima fase
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Responsável pela atualização de laudo */}
          <Separator />
          <div className="space-y-3">
            <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">
              Responsável pela atualização de laudo
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs justify-start w-full">
                  {card.updateResponsible ? (() => {
                    const personData = (people ?? []).find(p => p.name === card.updateResponsible);
                    return personData?.avatar_url ? (
                      <Avatar className="h-5 w-5 mr-1.5 shrink-0">
                        <AvatarImage src={personData.avatar_url} alt={card.updateResponsible} />
                        <AvatarFallback className="text-[8px] font-bold bg-primary/20 text-primary">
                          {card.updateResponsible!.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <User className="h-3 w-3 mr-1.5" />
                    );
                  })() : (
                    <User className="h-3 w-3 mr-1.5" />
                  )}
                  {card.updateResponsible || "Selecionar..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 pointer-events-auto" align="start">
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    <Input
                      placeholder="Novo nome..."
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newPersonName.trim()) {
                          addPerson.mutate(newPersonName.trim(), {
                            onSuccess: () => { setNewPersonName(""); toast.success("Pessoa adicionada!"); },
                            onError: () => toast.error("Erro ou nome já existe."),
                          });
                        }
                      }}
                      className="h-7 text-xs"
                    />
                    <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => {
                      if (newPersonName.trim()) {
                        addPerson.mutate(newPersonName.trim(), {
                          onSuccess: () => { setNewPersonName(""); toast.success("Pessoa adicionada!"); },
                          onError: () => toast.error("Erro ou nome já existe."),
                        });
                      }
                    }}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Separator />
                  {card.updateResponsible && (
                    <button
                      onClick={() => {
                        updateCard.mutate(
                          { cardId: card.id, updates: { update_responsible: "" } },
                          { onSuccess: () => toast.success("Responsável removido!") }
                        );
                      }}
                      className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-destructive/10 text-destructive flex items-center gap-1.5"
                    >
                      <X className="h-3 w-3" /> Remover responsável
                    </button>
                  )}
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {(people ?? []).map((p) => (
                      <div key={p.id} className="flex items-center justify-between group">
                        <button
                          onClick={() => {
                            updateCard.mutate(
                              { cardId: card.id, updates: { update_responsible: p.name } },
                              { onSuccess: () => toast.success("Responsável pela atualização definido!") }
                            );
                          }}
                          className={cn(
                            "flex-1 text-left text-xs px-2 py-1.5 rounded hover:bg-secondary flex items-center gap-2",
                            card.updateResponsible === p.name && "bg-primary/10 font-semibold text-primary"
                          )}
                        >
                          <Avatar className="h-5 w-5 shrink-0">
                            {(p as any).avatar_url ? (
                              <AvatarImage src={(p as any).avatar_url} alt={p.name} />
                            ) : null}
                            <AvatarFallback className="text-[8px] font-bold bg-primary/20 text-primary">
                              {p.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {p.name}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Certeza que deseja excluir "${p.name}" da lista?`)) {
                              deletePerson.mutate(p.id, { onSuccess: () => toast.success("Pessoa removida da lista!") });
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {(people ?? []).length === 0 && (
                      <p className="text-[10px] text-muted-foreground px-2 py-1">Nenhuma pessoa cadastrada.</p>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Laudo adicionado na Sapron */}
          <div>
            <Button
              variant={card.sapronAdded ? "default" : "outline"}
              size="sm"
              className="w-full h-9 text-xs justify-start gap-2"
              onClick={() => {
                updateCard.mutate(
                  { cardId: card.id, updates: { sapron_added: !card.sapronAdded } },
                  { onSuccess: () => toast.success(card.sapronAdded ? "Desmarcado!" : "Laudo marcado como adicionado na Sapron!") }
                );
              }}
            >
              <div className={cn(
                "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                card.sapronAdded ? "bg-primary-foreground border-primary-foreground" : "border-input"
              )}>
                {card.sapronAdded && <Check className="h-3 w-3 text-primary" />}
              </div>
              Laudo adicionado na Sapron
            </Button>
          </div>

          {/* Link do Drive */}
          <div className="space-y-2">
            <span className="text-muted-foreground text-xs uppercase tracking-wide font-semibold">
              Link do Drive
            </span>
            <div className="flex gap-1">
              <Input
                placeholder="Adicionar link..."
                value={newDriveLink}
                onChange={(e) => setNewDriveLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newDriveLink.trim()) {
                    const currentLinks = card.driveLinks ?? [];
                    updateCard.mutate(
                      { cardId: card.id, updates: { drive_links: [...currentLinks, newDriveLink.trim()] } },
                      { onSuccess: () => { setNewDriveLink(""); toast.success("Link adicionado!"); } }
                    );
                  }
                }}
                className="h-8 text-xs"
              />
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => {
                if (newDriveLink.trim()) {
                  const currentLinks = card.driveLinks ?? [];
                  updateCard.mutate(
                    { cardId: card.id, updates: { drive_links: [...currentLinks, newDriveLink.trim()] } },
                    { onSuccess: () => { setNewDriveLink(""); toast.success("Link adicionado!"); } }
                  );
                }
              }}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {(card.driveLinks ?? []).length > 0 && (
              <div className="space-y-1">
                {(card.driveLinks ?? []).map((link, i) => (
                  <div key={i} className="flex items-start gap-1.5 group/link min-w-0">
                    <LinkIcon className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-xs text-primary break-all flex-1 min-w-0">{link}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(link); }}
                      className="p-0.5 text-muted-foreground hover:text-primary shrink-0"
                      title="Copiar link"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        const currentLinks = card.driveLinks ?? [];
                        const newLinks = currentLinks.filter((_, idx) => idx !== i);
                        updateCard.mutate(
                          { cardId: card.id, updates: { drive_links: newLinks } },
                          { onSuccess: () => toast.success("Link removido!") }
                        );
                      }}
                      className="p-0.5 text-muted-foreground hover:text-destructive shrink-0"
                      title="Excluir link"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {(comments ?? []).map((c) => (
                  <div key={c.id} className="rounded-lg bg-secondary p-3 text-sm space-y-1.5 group/comment">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 shrink-0">
                        {(c as any).user_avatar ? (
                          <AvatarImage src={(c as any).user_avatar} alt={c.user_name || "avatar"} />
                        ) : null}
                        <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">
                          {(c.user_name || c.user_email || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {c.user_name || c.user_email || "Usuário"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteComment.mutate(
                          { commentId: c.id, cardId: card.id },
                          { onSuccess: () => toast.success("Comentário excluído!"), onError: () => toast.error("Erro ao excluir.") }
                        )}
                        className="p-1 text-muted-foreground hover:text-destructive shrink-0"
                        title="Excluir comentário"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-foreground/80 pl-9 whitespace-pre-wrap break-words">
                      {c.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                        /^https?:\/\//.test(part) ? (
                          <button key={i} type="button" onClick={(e) => { e.stopPropagation(); copyToClipboard(part); }} className="text-primary underline hover:text-primary/80 break-all cursor-pointer inline" title="Clique para copiar">{part}</button>
                        ) : part
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete card */}
          <Separator />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={deleteCard.isPending} className="w-full" variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir card
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Certeza que deseja excluir?</AlertDialogTitle>
                <AlertDialogDescription>
                  O card <strong>{card.code}</strong> será excluído permanentemente. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
