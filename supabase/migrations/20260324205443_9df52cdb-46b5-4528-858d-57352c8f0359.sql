
-- Create kanban_phases table
CREATE TABLE public.kanban_phases (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create kanban_cards table
CREATE TABLE public.kanban_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id INTEGER NOT NULL REFERENCES public.kanban_phases(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'on' CHECK (status IN ('on', 'standby', 'expired')),
  status_label TEXT,
  responsible TEXT NOT NULL,
  due_date DATE NOT NULL,
  due_label TEXT NOT NULL,
  comments INTEGER NOT NULL DEFAULT 0,
  attachments INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kanban_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth required for this kanban)
CREATE POLICY "Anyone can read phases" ON public.kanban_phases FOR SELECT USING (true);
CREATE POLICY "Anyone can insert phases" ON public.kanban_phases FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update phases" ON public.kanban_phases FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete phases" ON public.kanban_phases FOR DELETE USING (true);

CREATE POLICY "Anyone can read cards" ON public.kanban_cards FOR SELECT USING (true);
CREATE POLICY "Anyone can insert cards" ON public.kanban_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cards" ON public.kanban_cards FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete cards" ON public.kanban_cards FOR DELETE USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_kanban_cards_updated_at
  BEFORE UPDATE ON public.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
