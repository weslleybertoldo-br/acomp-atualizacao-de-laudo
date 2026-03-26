
ALTER TABLE public.saved_reports 
  ADD COLUMN IF NOT EXISTS selected_variable text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS selected_values text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS selected_phases integer[] DEFAULT '{}';

ALTER TABLE public.saved_reports DROP COLUMN IF EXISTS report_type;
