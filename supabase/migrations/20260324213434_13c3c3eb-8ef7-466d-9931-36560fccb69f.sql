
-- Add avatar_url and user_id to responsible_people for Google profile tracking
ALTER TABLE public.responsible_people ADD COLUMN avatar_url TEXT;
ALTER TABLE public.responsible_people ADD COLUMN user_id UUID;

-- Add unique constraint on user_id so we only add once per user
CREATE UNIQUE INDEX responsible_people_user_id_unique ON public.responsible_people (user_id) WHERE user_id IS NOT NULL;

-- Allow updates on responsible_people
CREATE POLICY "Authenticated can update people" ON public.responsible_people FOR UPDATE TO authenticated USING (true);
