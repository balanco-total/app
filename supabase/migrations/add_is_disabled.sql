-- Run in Supabase SQL Editor
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false;
