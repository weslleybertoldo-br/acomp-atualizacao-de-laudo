-- Audit log para mudancas relevantes em kanban_cards
-- Eventos: update_responsible, responsible, tag_added/removed, sapron_marked/unmarked
-- Cada evento grava created_at => relatorios podem filtrar por data da acao (nao mais por createdAt do card)

BEGIN;

CREATE TABLE IF NOT EXISTS public.kanban_card_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'update_responsible_changed',
    'responsible_changed',
    'tag_added',
    'tag_removed',
    'sapron_marked',
    'sapron_unmarked'
  )),
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kanban_card_events_card_id
  ON public.kanban_card_events(card_id);
CREATE INDEX IF NOT EXISTS idx_kanban_card_events_created_at
  ON public.kanban_card_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kanban_card_events_type_created
  ON public.kanban_card_events(event_type, created_at DESC);

ALTER TABLE public.kanban_card_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read events" ON public.kanban_card_events;
DROP POLICY IF EXISTS "Anyone can insert events" ON public.kanban_card_events;

CREATE POLICY "Anyone can read events"
  ON public.kanban_card_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert events"
  ON public.kanban_card_events FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_kanban_card_events()
RETURNS TRIGGER AS $$
DECLARE
  added_tag text;
  removed_tag text;
BEGIN
  -- update_responsible (campo: Responsavel pela atualizacao de laudo)
  IF COALESCE(NEW.update_responsible, '') IS DISTINCT FROM COALESCE(OLD.update_responsible, '') THEN
    INSERT INTO public.kanban_card_events (card_id, event_type, old_value, new_value)
    VALUES (
      NEW.id,
      'update_responsible_changed',
      NULLIF(OLD.update_responsible, ''),
      NULLIF(NEW.update_responsible, '')
    );
  END IF;

  -- responsible (campo: Responsavel geral)
  IF COALESCE(NEW.responsible, '') IS DISTINCT FROM COALESCE(OLD.responsible, '') THEN
    INSERT INTO public.kanban_card_events (card_id, event_type, old_value, new_value)
    VALUES (
      NEW.id,
      'responsible_changed',
      NULLIF(OLD.responsible, ''),
      NULLIF(NEW.responsible, '')
    );
  END IF;

  -- tags adicionadas/removidas (diff dos arrays)
  IF NEW.tags IS DISTINCT FROM OLD.tags THEN
    FOR added_tag IN
      SELECT t FROM unnest(NEW.tags) AS t
      EXCEPT
      SELECT t FROM unnest(OLD.tags) AS t
    LOOP
      INSERT INTO public.kanban_card_events (card_id, event_type, new_value)
      VALUES (NEW.id, 'tag_added', added_tag);
    END LOOP;

    FOR removed_tag IN
      SELECT t FROM unnest(OLD.tags) AS t
      EXCEPT
      SELECT t FROM unnest(NEW.tags) AS t
    LOOP
      INSERT INTO public.kanban_card_events (card_id, event_type, old_value)
      VALUES (NEW.id, 'tag_removed', removed_tag);
    END LOOP;
  END IF;

  -- sapron_added (boolean)
  IF NEW.sapron_added IS DISTINCT FROM OLD.sapron_added THEN
    IF NEW.sapron_added THEN
      INSERT INTO public.kanban_card_events (card_id, event_type)
      VALUES (NEW.id, 'sapron_marked');
    ELSE
      INSERT INTO public.kanban_card_events (card_id, event_type)
      VALUES (NEW.id, 'sapron_unmarked');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS log_kanban_card_events_trigger ON public.kanban_cards;
CREATE TRIGGER log_kanban_card_events_trigger
  AFTER UPDATE ON public.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.log_kanban_card_events();

-- Realtime opcional (descomentar se quiser invalidar React Query em outras abas)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.kanban_card_events;

COMMIT;
