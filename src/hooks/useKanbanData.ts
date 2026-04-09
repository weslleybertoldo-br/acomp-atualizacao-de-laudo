import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { KanbanCard, KanbanPhase } from "@/data/kanbanData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Get current date in Brasília timezone (UTC-3) as a Date at midnight UTC */
function getBrasiliaToday(): Date {
  const now = new Date();
  // Brasília is UTC-3
  const brasiliaOffset = -3 * 60; // minutes
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const brasiliaMs = utcMs + brasiliaOffset * 60000;
  const brasilia = new Date(brasiliaMs);
  return new Date(Date.UTC(brasilia.getFullYear(), brasilia.getMonth(), brasilia.getDate()));
}

/** Calculate exact days difference between a date string and today in Brasília */
function daysDiff(dateStr: string): number {
  const date = new Date(Date.UTC(
    parseInt(dateStr.slice(0, 4)),
    parseInt(dateStr.slice(5, 7)) - 1,
    parseInt(dateStr.slice(8, 10))
  ));
  const today = getBrasiliaToday();
  return Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDaysDistance(days: number): string {
  const absDays = Math.abs(days);
  if (absDays === 0) return "hoje";
  if (absDays === 1) return days > 0 ? "há 1 dia" : "em 1 dia";
  if (absDays < 30) return days > 0 ? `há ${absDays} dias` : `em ${absDays} dias`;
  const months = Math.floor(absDays / 30);
  const remainDays = absDays % 30;
  if (months === 1 && remainDays === 0) return days > 0 ? "há 1 mês" : "em 1 mês";
  if (months === 1) return days > 0 ? `há 1 mês e ${remainDays} dia${remainDays > 1 ? "s" : ""}` : `em 1 mês e ${remainDays} dia${remainDays > 1 ? "s" : ""}`;
  if (remainDays === 0) return days > 0 ? `há ${months} meses` : `em ${months} meses`;
  return days > 0 ? `há ${months} meses e ${remainDays} dia${remainDays > 1 ? "s" : ""}` : `em ${months} meses e ${remainDays} dia${remainDays > 1 ? "s" : ""}`;
}

export function buildDueLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const day = format(date, "dd", { locale: ptBR });
  const month = format(date, "MMM", { locale: ptBR });
  const days = daysDiff(dateStr);

  const dist = formatDaysDistance(days);
  if (days === 0) return `Venc ${month}, ${day} · hoje`;
  if (days > 0) return `Venc ${month}, ${day} · ${dist}`;
  return `Venc ${month}, ${day} · ${dist}`;
}

export function buildSentLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const dayMonth = format(date, "dd/MM", { locale: ptBR });
  const days = daysDiff(dateStr);

  const dist = formatDaysDistance(days);
  if (days === 0) return `Enviado dia ${dayMonth} · hoje`;
  if (days > 0) return `Enviado dia ${dayMonth} · ${dist}`;
  return `Enviado dia ${dayMonth} · ${dist}`;
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
        .order("created_at", { ascending: true });

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
            exceptions: (c as any).exceptions ?? "",
            createdAt: c.created_at,
          })),
      }));
    },
  });
}

export function useCreateCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: { raw: string; driveLinks?: string[]; exceptions?: string }[]) => {
      const rows = inputs.map((input, i) => {
        const { code, date } = parseCardInput(input.raw);
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
          drive_links: input.driveLinks ?? [],
          exceptions: input.exceptions ?? "",
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
      updates: { due_date?: string | null; due_label?: string | null; tags?: string[]; responsible?: string; status_label?: string | null; code?: string; update_responsible?: string; sapron_added?: boolean; drive_links?: string[]; exceptions?: string };
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
