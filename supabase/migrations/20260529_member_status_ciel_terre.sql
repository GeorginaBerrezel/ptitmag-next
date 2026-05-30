-- Statuts membres Ciel / Terre / Non membre
-- À exécuter dans Supabase → SQL Editor
--
-- ⚠️ Exécuter en même temps que le déploiement preprod (branche staging) :
--    prod et preprod partagent la même base Supabase pour l'instant.
--    Sans le nouveau code, les anciens libellés trial/member ne correspondront plus.

-- ── 1. Nouveaux champs profil (inscription + filtre admin) ───────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS commune text;

COMMENT ON COLUMN profiles.first_name IS 'Prénom (inscription)';
COMMENT ON COLUMN profiles.last_name IS 'Nom de famille (inscription)';
COMMENT ON COLUMN profiles.phone IS 'Téléphone optionnel — contact Joel';
COMMENT ON COLUMN profiles.postal_code IS 'NPA suisse (inscription)';
COMMENT ON COLUMN profiles.commune IS 'Commune (inscription — filtre admin)';

-- Prénom / nom approximatifs depuis full_name pour les comptes déjà existants
UPDATE profiles
SET
  first_name = split_part(trim(full_name), ' ', 1),
  last_name = NULLIF(
    trim(substring(trim(full_name) FROM position(' ' IN trim(full_name)) + 1)),
    ''
  )
WHERE full_name IS NOT NULL
  AND trim(full_name) <> ''
  AND first_name IS NULL;

-- ── 2. Migration des statuts ────────────────────────────────────────────────
-- Ancien trial  → non_membre (pas d'accès catalogue)
-- Ancien member → terre      (prix juste, comme les cotisés actuels)
--
-- La table avait une contrainte CHECK (trial | member) — il faut l'élargir.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

UPDATE profiles SET status = 'terre' WHERE status = 'member';

UPDATE profiles
SET status = 'non_membre'
WHERE status = 'trial'
   OR status IS NULL
   OR status NOT IN ('non_membre', 'ciel', 'terre');

-- Nouvelles inscriptions : non membre par défaut
ALTER TABLE profiles ALTER COLUMN status SET DEFAULT 'non_membre';

ALTER TABLE profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('non_membre', 'ciel', 'terre'));

COMMENT ON COLUMN profiles.status IS 'non_membre | ciel (+20 % marge) | terre (prix juste)';

COMMENT ON COLUMN profiles.cotisation_amount IS
  'Montant cotisation CHF saisi par Joel (libre : 0 pour test, 30/an Ciel, 15–30/mois Terre…)';

-- ── 3. Index admin (filtre commune, stats statut) ─────────────────────────────

CREATE INDEX IF NOT EXISTS profiles_commune_idx ON profiles (commune);
CREATE INDEX IF NOT EXISTS profiles_status_idx ON profiles (status);

-- ── 4. Trigger inscription (si présent) ─────────────────────────────────────
-- Si les nouveaux comptes reçoivent encore status = trial via handle_new_user,
-- exécuter aussi le bloc ci-dessous (décommenter après vérification dans
-- Supabase → Database → Functions).

/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'non_membre'
  );
  RETURN NEW;
END;
$$;
*/
