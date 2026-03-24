
-- Update RLS policies to require authentication
-- kanban_phases: keep public read, restrict write to authenticated
DROP POLICY IF EXISTS "Anyone can insert phases" ON public.kanban_phases;
DROP POLICY IF EXISTS "Anyone can update phases" ON public.kanban_phases;
DROP POLICY IF EXISTS "Anyone can delete phases" ON public.kanban_phases;

CREATE POLICY "Authenticated can insert phases" ON public.kanban_phases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update phases" ON public.kanban_phases FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete phases" ON public.kanban_phases FOR DELETE TO authenticated USING (true);

-- Update read policy to authenticated only
DROP POLICY IF EXISTS "Anyone can read phases" ON public.kanban_phases;
CREATE POLICY "Authenticated can read phases" ON public.kanban_phases FOR SELECT TO authenticated USING (true);

-- kanban_cards
DROP POLICY IF EXISTS "Anyone can read cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "Anyone can insert cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "Anyone can update cards" ON public.kanban_cards;
DROP POLICY IF EXISTS "Anyone can delete cards" ON public.kanban_cards;

CREATE POLICY "Authenticated can read cards" ON public.kanban_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert cards" ON public.kanban_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update cards" ON public.kanban_cards FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete cards" ON public.kanban_cards FOR DELETE TO authenticated USING (true);

-- card_comments
DROP POLICY IF EXISTS "Anyone can read comments" ON public.card_comments;
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.card_comments;
DROP POLICY IF EXISTS "Anyone can delete comments" ON public.card_comments;

CREATE POLICY "Authenticated can read comments" ON public.card_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert comments" ON public.card_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete comments" ON public.card_comments FOR DELETE TO authenticated USING (true);

-- Make due_date nullable so we can remove it
ALTER TABLE public.kanban_cards ALTER COLUMN due_date DROP NOT NULL;
ALTER TABLE public.kanban_cards ALTER COLUMN due_label DROP NOT NULL;
