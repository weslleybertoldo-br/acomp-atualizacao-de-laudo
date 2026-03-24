
-- Add user info to comments
ALTER TABLE public.card_comments ADD COLUMN user_id UUID;
ALTER TABLE public.card_comments ADD COLUMN user_name TEXT;
ALTER TABLE public.card_comments ADD COLUMN user_email TEXT;
