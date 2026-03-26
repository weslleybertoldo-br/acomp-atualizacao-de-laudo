import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { KanbanCard, KanbanPhase } from "@/data/kanbanData";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

export function buildDueLabel(dateStr: string): string {
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

export function buildSentLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const dayMonth = format(date, "dd/MM", { locale: ptBR });

  if (isToday(date)) return `Enviado dia ${dayMonth} · hoje`;
  if (isPast(date)) {
    const dist = formatDistanceToNow(date, { locale: ptBR });
    return `Enviado dia ${dayMonth} · há ${dist}`;
  }
  const dist = formatDistanceToNow(date, { locale: ptBR });
  return `Enviado dia ${dayMonth} · em ${dist}`;
}

/**
 * Parse input like "16/2HFO1001" into { code: "HFO1001", date: "2026-02-16" }
 * Also accepts plain codes like "LAU0050"
 */
export function parseCardInput(input: string): { code: string; date: string | null } {
  const trimmed = input.trim();

  // Match pattern: DD/M or DD/MM optionally followed by space, then letters (code start)
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\s*([A-Za-z].*)$/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    const year = new Date().getFullYear();
    const code = match[3].trim();
    return { code, date: `${year}-${month}-${day}` };
  }

  return { code: trimmed, date: null };
}

/** Subscribe to realtime changes and auto-invalidate queries */
export function useKanbanRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("kanban-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "kanban_cards" }, () => {
        queryClient.invalidateQueries({ queryKey: ["kanban"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "card_comments" }, (payload) => {
        const cardId = (payload.new as any)?.card_id || (payload.old as any)?.card_id;
        if (cardId) {
          queryClient.invalidateQueries({ queryKey: ["card-comments", cardId] });
        }
        queryClient.invalidateQueries({ queryKey: ["kanban"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "responsible_people" }, () => {
        queryClient.invalidateQueries({ queryKey: ["responsible-people"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "kanban_tags" }, () => {
        queryClient.invalidateQueries({ queryKey: ["kanban-tags"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "kanban_phases" }, () => {
        queryClient.invalidateQueries({ queryKey: ["kanban"] });
      })
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
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

      const { data: commentCounts, error: ccError } = await supabase
        .from("card_comments")
        .select("card_id");
      
      const countMap: Record<string, number> = {};
      if (!ccError && commentCounts) {
        for (const c of commentCounts) {
          countMap[c.card_id] = (countMap[c.card_id] || 0) + 1;
        }
      }

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
            dueLabel: c.due_label ?? "",
            comments: countMap[c.id] || 0,
            attachments: c.attachments,
            tags: c.tags ?? [],
            updateResponsible: c.update_responsible ?? "",
            sapronAdded: c.sapron_added ?? false,
            driveLinks: c.drive_links ?? [],
          })),
      }));
    },
  });
}

export function useCreateCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: string[]) => {
      const rows = inputs.map((raw, i) => {
        const { code, date } = parseCardInput(raw);
        const dateStr = date || new Date().toISOString().split("T")[0];
        const label = date ? buildSentLabel(dateStr) : buildDueLabel(dateStr);

        return {
          code,
          phase_id: 0,
          status: "on" as const,
          responsible: "",
          due_date: dateStr,
          due_label: label,
          sort_order: i,
        };
      });

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

export function useBulkDeleteCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardIds: string[]) => {
      const { error } = await supabase
        .from("kanban_cards")
        .delete()
        .in("id", cardIds);
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

export function useUpdateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cardId,
      updates,
    }: {
      cardId: string;
      updates: { due_date?: string | null; due_label?: string | null; tags?: string[]; responsible?: string; status_label?: string | null; code?: string; update_responsible?: string; sapron_added?: boolean; drive_links?: string[] };
    }) => {
      const { error } = await supabase
        .from("kanban_cards")
        .update(updates)
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
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || null;
      const userEmail = user?.email || null;
      const userId = user?.id || null;
      const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

      const { error } = await supabase
        .from("card_comments")
        .insert({
          card_id: cardId,
          content,
          user_id: userId,
          user_name: userName,
          user_email: userEmail,
          user_avatar: userAvatar,
        });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["card-comments", variables.cardId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, cardId }: { commentId: string; cardId: string }) => {
      const { error } = await supabase
        .from("card_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
      return cardId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["card-comments", variables.cardId] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
    },
  });
}

export function useResponsiblePeople() {
  return useQuery({
    queryKey: ["responsible-people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsible_people")
        .select("*")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddResponsiblePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("responsible_people")
        .insert({ name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responsible-people"] });
    },
  });
}

export function useDeleteResponsiblePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("responsible_people")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responsible-people"] });
    },
  });
}

export function useKanbanTags() {
  return useQuery({
    queryKey: ["kanban-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kanban_tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddKanbanTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { error } = await supabase
        .from("kanban_tags")
        .insert({ name: name.trim(), color });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-tags"] });
    },
  });
}

export function useDeleteKanbanTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("kanban_tags")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-tags"] });
    },
  });
}
