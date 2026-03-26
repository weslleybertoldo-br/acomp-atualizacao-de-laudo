ALTER TABLE public.kanban_cards 
ADD COLUMN update_responsible text DEFAULT '',
ADD COLUMN sapron_added boolean NOT NULL DEFAULT false,
ADD COLUMN drive_links text[] NOT NULL DEFAULT '{}'::text[];