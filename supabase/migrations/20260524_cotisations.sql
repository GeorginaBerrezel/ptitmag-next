-- À exécuter dans Supabase → SQL Editor
-- Cotisations membres (étape 6)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cotisation_amount numeric(10, 2),
  ADD COLUMN IF NOT EXISTS cotisation_active boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.cotisation_amount IS 'Montant cotisation inscrite (CHF/mois ou montant convenu)';
COMMENT ON COLUMN profiles.cotisation_active IS 'Cotisation actuellement active';

-- Index utile pour les stats admin
CREATE INDEX IF NOT EXISTS profiles_status_idx ON profiles (status);
