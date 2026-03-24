
-- Add user_avatar column to card_comments
ALTER TABLE public.card_comments ADD COLUMN user_avatar TEXT;

-- Create kanban_tags table with name and color
CREATE TABLE public.kanban_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kanban_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read tags" ON public.kanban_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert tags" ON public.kanban_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete tags" ON public.kanban_tags FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated can update tags" ON public.kanban_tags FOR UPDATE TO authenticated USING (true);

-- Enable realtime for responsible_people and kanban_tags
ALTER PUBLICATION supabase_realtime ADD TABLE public.responsible_people;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_tags;
