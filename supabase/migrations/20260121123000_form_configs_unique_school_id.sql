-- Ensure one form config per school.
-- Required because the app uses upsert(onConflict: 'school_id') when saving admin form builder configs.

-- If duplicates exist in your DB already, you must deduplicate first before adding this constraint.
ALTER TABLE public.form_configs
  ADD CONSTRAINT form_configs_school_id_unique UNIQUE (school_id);

