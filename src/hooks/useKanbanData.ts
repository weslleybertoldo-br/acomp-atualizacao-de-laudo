import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { KanbanCard, KanbanPhase } from "@/data/kanbanData";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

function buildDueLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const day = format(date, "dd", { locale: ptBR });
  const month = format(date, "MMM", { locale: ptBR });

  if (isToday(date)) return `Venc ${month}, ${day} · hoje`;
  if (isPast(date)) {
    const dist = formatDistanceToNow(date, { locale: ptBR });
    return `Venc ${month}, ${day} · há ${dist}`;
  }
  const dist = formatDistanceToNow(date, { locale: ptBR });
  return `Venc ${month}, ${day} · em ${dist}`;
}

export function useKanbanData() {
  return useQuery({
    queryKey: ["kanban"],
    queryFn: async (): Promise<KanbanPhase[]> => {
      const { data: phases, error: phasesError } = await supabase
        .from("kanban_phases")
        .select("*")
        .order("sort_order");

      if (phasesError) throw phasesError;

      const { data: cards, error: cardsError } = await supabase
        .from("kanban_cards")
        .select("*")
        .order("sort_order");

      if (cardsError) throw cardsError;

      return (phases ?? []).map((phase) => ({
        id: phase.id,
        title: phase.title,
        cards: (cards ?? [])
          .filter((c) => c.phase_id === phase.id)
          .map((c) => ({
            id: c.id,
            code: c.code,
            status: c.status as KanbanCard["status"],
            statusLabel: c.status_label ?? undefined,
            responsible: c.responsible,
            dueDate: c.due_date,
            dueLabel: c.due_label,
            comments: c.comments,
            attachments: c.attachments,
            tags: c.tags ?? [],
          })),
      }));
    },
  });
}

export function useCreateCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (codes: string[]) => {
      const today = new Date().toISOString().split("T")[0];
      const dueLabel = buildDueLabel(today);

      const rows = codes.map((code, i) => ({
        code: code.trim(),
        phase_id: 0,
        status: "on" as const,
        responsible: "",
        due_date: today,
        due_label: dueLabel,
        sort_order: i,
      }));

      const { error } = await supabase.from("kanban_cards").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from("kanban_cards")
        .delete()
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
    },
  });
}

export function useMoveCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, newPhaseId }: { cardId: string; newPhaseId: number }) => {
      const { error } = await supabase
        .from("kanban_cards")
        .update({ phase_id: newPhaseId })
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
    },
  });
}

export function useCardComments(cardId: string) {
  return useQuery({
    queryKey: ["card-comments", cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_comments")
        .select("*")
        .eq("card_id", cardId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!cardId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, content }: { cardId: string; content: string }) => {
      const { error } = await supabase
        .from("card_comments")
        .insert({ card_id: cardId, content });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["card-comments", variables.cardId] });
    },
  });
}
