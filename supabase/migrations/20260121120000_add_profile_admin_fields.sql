-- Adds admin-oriented fields needed by the Admin PDF (account status + extra contact fields).
-- This is safe to run on existing deployments (adds nullable columns / defaults).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS username TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_bac_year ON public.profiles(bac_year);
CREATE INDEX IF NOT EXISTS idx_profiles_bac_option ON public.profiles(bac_option);

