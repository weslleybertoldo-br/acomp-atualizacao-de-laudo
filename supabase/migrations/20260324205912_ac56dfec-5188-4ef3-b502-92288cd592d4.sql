
-- Create card_comments table
CREATE TABLE public.card_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.card_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments" ON public.card_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comments" ON public.card_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete comments" ON public.card_comments FOR DELETE USING (true);
