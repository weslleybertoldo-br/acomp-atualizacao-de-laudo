import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { KanbanCard, KanbanPhase } from "@/data/kanbanData";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

type DateParts = {
  year: number;
  month: number;
  day: number;
};

const DAY_MS = 1000 * 60 * 60 * 24;

function parseDateParts(dateStr: string): DateParts {
  return {
    year: Number(dateStr.slice(0, 4)),
    month: Number(dateStr.slice(5, 7)),
    day: Number(dateStr.slice(8, 10)),
  };
}

function partsToUtcDate({ year, month, day }: DateParts): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function partsToLocalDate({ year, month, day }: DateParts): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function extractDateParts(date: Date): DateParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function compareDateParts(a: DateParts, b: DateParts): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

function formatDatePartsToIso({ year, month, day }: DateParts): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getBrasiliaTodayParts(): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const values = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  ) as Record<string, string>;

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

/** Get current date in Brasília timezone as a Date at midnight UTC */
function getBrasiliaToday(): Date {
  return partsToUtcDate(getBrasiliaTodayParts());
}

function getBrasiliaTodayString(): string {
  return formatDatePartsToIso(getBrasiliaTodayParts());
}

function diffDatePartsInDays(start: DateParts, end: DateParts): number {
  return Math.round((partsToUtcDate(end).getTime() - partsToUtcDate(start).getTime()) / DAY_MS);
}

function getMonthDayDistance(dateStr: string): { months: number; days: number } {
  const target = parseDateParts(dateStr);
  const today = getBrasiliaTodayParts();
  const [earlier, later] = compareDateParts(target, today) <= 0 ? [target, today] : [today, target];

  let months = (later.year - earlier.year) * 12 + (later.month - earlier.month);
  let anchor = extractDateParts(addMonths(partsToLocalDate(earlier), months));

  if (compareDateParts(anchor, later) > 0) {
    months -= 1;
    anchor = extractDateParts(addMonths(partsToLocalDate(earlier), months));
  }

  return {
    months,
    days: diffDatePartsInDays(anchor, later),
  };
}

/** Calculate exact days difference between a date string and today in Brasília */
function daysDiff(dateStr: string): number {
  const date = partsToUtcDate(parseDateParts(dateStr));
  const today = getBrasiliaToday();
  return Math.round((today.getTime() - date.getTime()) / DAY_MS);
}

function formatDaysDistance(days: number, dateStr: string): string {
  const absDays = Math.abs(days);
  if (absDays === 0) return "hoje";
  if (absDays === 1) return days > 0 ? "há 1 dia" : "em 1 dia";
  if (absDays < 30) return days > 0 ? `há ${absDays} dias` : `em ${absDays} dias`;

  const { months, days: remainDays } = getMonthDayDistance(dateStr);
  const monthLabel = months === 1 ? "1 mês" : `${months} meses`;

  if (remainDays === 0) return days > 0 ? `há ${monthLabel}` : `em ${monthLabel}`;

  return days > 0
    ? `há ${monthLabel} e ${remainDays} dia${remainDays > 1 ? "s" : ""}`
    : `em ${monthLabel} e ${remainDays} dia${remainDays > 1 ? "s" : ""}`;
}

function resolveDueLabel(dateStr: string | null, storedLabel: string | null): string {
  if (!dateStr) return storedLabel ?? "";
  return storedLabel?.startsWith("Enviado") ? buildSentLabel(dateStr) : buildDueLabel(dateStr);
}

export function buildDueLabel(dateStr: string): string {
  const date = partsToLocalDate(parseDateParts(dateStr));
  const day = format(date, "dd", { locale: ptBR });
  const month = format(date, "MMM", { locale: ptBR });
  const days = daysDiff(dateStr);

  const dist = formatDaysDistance(days, dateStr);
  return `Venc ${month}, ${day} · ${dist}`;
}

export function buildSentLabel(dateStr: string): string {
  const date = partsToLocalDate(parseDateParts(dateStr));
  const dayMonth = format(date, "dd/MM", { locale: ptBR });
  const days = daysDiff(dateStr);

  const dist = formatDaysDistance(days, dateStr);
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
    const year = getBrasiliaTodayParts().year;
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
            dueLabel: resolveDueLabel(c.due_date, c.due_label),
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
    mutationFn: async (inputs: { raw: string; driveLinks?: string[]; exceptions?: string; tags?: string[] }[]) => {
      const rows = inputs.map((input, i) => {
        const { code, date } = parseCardInput(input.raw);
        const dateStr = date || getBrasiliaTodayString();
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
          tags: input.tags ?? [],
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
