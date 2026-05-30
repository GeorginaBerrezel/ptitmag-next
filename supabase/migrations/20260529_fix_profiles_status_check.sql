-- Correctif si 20260529_member_status_ciel_terre.sql a échoué sur profiles_status_check
-- Supabase → SQL Editor → Run (une seule fois)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS commune text;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

UPDATE profiles SET status = 'terre' WHERE status = 'member';

UPDATE profiles
SET status = 'non_membre'
WHERE status = 'trial'
   OR status IS NULL
   OR status NOT IN ('non_membre', 'ciel', 'terre');

ALTER TABLE profiles ALTER COLUMN status SET DEFAULT 'non_membre';

ALTER TABLE profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('non_membre', 'ciel', 'terre'));
