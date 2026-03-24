
-- Enable realtime for kanban tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_comments;
