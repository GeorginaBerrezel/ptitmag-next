-- Colonnes profil manquantes (si la migration initiale a échoué avant ADD COLUMN)
-- Supabase → SQL Editor → Run

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS commune text;

-- Vérifier que les colonnes existent (doit afficher 5 lignes)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('first_name', 'last_name', 'phone', 'postal_code', 'commune')
ORDER BY column_name;

-- Trouver ton compte test (remplace l'e-mail si besoin)
SELECT
  email,
  full_name,
  first_name,
  last_name,
  phone,
  postal_code,
  commune,
  status,
  created_at
FROM profiles
WHERE email ILIKE '%georgina.berrezel%'
ORDER BY created_at DESC;
