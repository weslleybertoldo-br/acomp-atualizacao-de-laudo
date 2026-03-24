
-- Create a table for reusable responsible people
CREATE TABLE public.responsible_people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.responsible_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read people" ON public.responsible_people FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert people" ON public.responsible_people FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete people" ON public.responsible_people FOR DELETE TO authenticated USING (true);

-- Seed existing responsible names
INSERT INTO public.responsible_people (name)
SELECT DISTINCT responsible FROM public.kanban_cards WHERE responsible != '' AND responsible IS NOT NULL
ON CONFLICT (name) DO NOTHING;
